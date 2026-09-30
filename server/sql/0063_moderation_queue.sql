-- Queue state for the admin moderation screen.
--
-- content_reports already stores an open report. The screen closes a row when
-- somebody hides the content, dismisses the report, or blocks the author.
-- admin_audit_log is the action history (who did what). These columns are only
-- the queue: who closed the row, and which of those three ways.
--
-- status stays free text. Rows already in production are 'open'. The screen
-- writes 'dismissed' or 'actioned'. resolution is null while the row is open.

alter table public.content_reports
  add column if not exists reviewed_by uuid,
  add column if not exists resolution text;

create index if not exists idx_content_reports_open_queue
  on public.content_reports (created_at asc, id asc)
  where status = 'open';

comment on column public.content_reports.resolution is
  'How an open report was closed: dismissed, hidden, or blocked. Null while open.';
