-- One report per person per piece of content.
--
-- content_reports accepted anonymous rows and the same person could file the
-- same target again. The feed now refuses a second report. This index is what
-- makes that true under two requests at once. Older duplicate rows, if any,
-- keep the earliest one so the index can be created. Client-error rows are
-- not deleted here; new ones are no longer inserted into this table.

delete from public.content_reports as extra
where extra.reporter_id is not null
  and extra.content_id is not null
  and exists (
    select 1
    from public.content_reports as kept
    where kept.reporter_id = extra.reporter_id
      and kept.content_type = extra.content_type
      and kept.content_id = extra.content_id
      and (
        kept.created_at < extra.created_at
        or (kept.created_at = extra.created_at and kept.id < extra.id)
      )
  );

create unique index if not exists idx_content_reports_reporter_target
  on public.content_reports (reporter_id, content_type, content_id)
  where reporter_id is not null
    and content_id is not null;
