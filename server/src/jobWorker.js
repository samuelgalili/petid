// A worker inside the API process.
//
// This is a single Node process behind Caddy. Adding a broker and a second
// container to run one catalogue import a week would be infrastructure to
// operate for no benefit at this size, so the queue lives in PostgreSQL and is
// drained here. `claim_next_job` uses `for update skip locked`, so if a second
// process is ever added the hand-off is already safe.
//
// The tradeoff is honest: work competes with request handling for the event
// loop. It is bounded by taking one job at a time and by the poll interval.

const POLL_INTERVAL_MS = 2000;
const BACKOFF_BASE_MS = 5000;

export class JobWorker {
  constructor(pool, { handlers = {}, pollIntervalMs = POLL_INTERVAL_MS, logger = console } = {}) {
    this.pool = pool;
    this.handlers = handlers;
    this.pollIntervalMs = pollIntervalMs;
    this.logger = logger;
    this.timer = null;
    this.running = false;
    this.draining = false;
  }

  get jobTypes() {
    return Object.keys(this.handlers);
  }

  start() {
    if (this.running || this.jobTypes.length === 0) return;
    this.running = true;
    this.scheduleNext(0);
  }

  async stop() {
    this.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    // Let an in-flight job finish rather than leaving it marked running.
    while (this.draining) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  scheduleNext(delayMs = this.pollIntervalMs) {
    if (!this.running) return;
    this.timer = setTimeout(() => {
      void this.tick();
    }, delayMs);
    // Polling must not hold the process open when nothing else is running.
    if (typeof this.timer.unref === "function") this.timer.unref();
  }

  async tick() {
    if (!this.running) return;

    let claimedSomething = false;
    try {
      claimedSomething = await this.runOnce();
    } catch (error) {
      this.logger.error("job_worker_tick_failed", error?.message);
    }

    // A queue with work in it is drained promptly; an idle one is polled slowly.
    this.scheduleNext(claimedSomething ? 0 : this.pollIntervalMs);
  }

  /** Claims and runs at most one job. Returns whether there was work. */
  async runOnce() {
    this.draining = true;
    try {
      const claimed = await this.pool.query(
        "select * from public.claim_next_job($1::text[])",
        [this.jobTypes],
      );
      const job = claimed.rows[0];
      if (!job) return false;

      const handler = this.handlers[job.job_type];
      if (!handler) {
        await this.fail(job, `No handler registered for ${job.job_type}`);
        return true;
      }

      try {
        const result = await handler(job);
        await this.pool.query(
          `
            update public.jobs
            set status = 'succeeded', result = $2::jsonb, finished_at = now(),
                last_error = null, updated_at = now()
            where id = $1
          `,
          [job.id, JSON.stringify(result ?? null)],
        );
      } catch (error) {
        await this.fail(job, error?.message || String(error));
      }

      return true;
    } finally {
      this.draining = false;
    }
  }

  async fail(job, message) {
    const exhausted = job.attempts >= job.max_attempts;

    if (exhausted) {
      this.logger.error("job_failed", job.job_type, job.id, message);
      await this.pool.query(
        `
          update public.jobs
          set status = 'failed', last_error = $2, finished_at = now(), updated_at = now()
          where id = $1
        `,
        [job.id, String(message).slice(0, 2000)],
      );
      return;
    }

    // Exponential backoff, so a transient failure is retried and a permanent
    // one is not retried in a tight loop.
    const delaySeconds = Math.round((BACKOFF_BASE_MS * 2 ** (job.attempts - 1)) / 1000);
    this.logger.warn("job_retry", job.job_type, job.id, `attempt ${job.attempts}`, message);
    await this.pool.query(
      `
        update public.jobs
        set status = 'pending', last_error = $2, run_after = now() + ($3 || ' seconds')::interval,
            updated_at = now()
        where id = $1
      `,
      [job.id, String(message).slice(0, 2000), String(delaySeconds)],
    );
  }
}
