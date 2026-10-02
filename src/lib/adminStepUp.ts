/**
 * One prompt for a recent authentication code.
 *
 * adminApiFetch calls this when a sensitive action answers 403 with
 * mfa_step_up_required. The admin shell registers the prompt. With two-factor
 * off the server never sets that flag, so this is not called and the screens
 * behave as they do today.
 *
 * Concurrent actions share one prompt: the session is fresh for all of them
 * once a code is accepted.
 */

type StepUpPrompt = () => Promise<boolean>;

let prompt: StepUpPrompt | null = null;
let inflight: Promise<boolean> | null = null;

export const registerAdminStepUpPrompt = (next: StepUpPrompt | null) => {
  prompt = next;
};

export const requestAdminStepUp = (): Promise<boolean> => {
  if (!prompt) return Promise.resolve(false);
  if (!inflight) {
    const run = prompt;
    inflight = Promise.resolve()
      .then(() => run())
      .then((ok) => ok === true)
      .catch(() => false)
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
};
