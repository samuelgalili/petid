# Rolling the API back

Each deploy of `aws-migration` builds the API as `mipo-api:<first 12 of the commit SHA>` and, once it is healthy, points `mipo-api:latest` at it (`deploy/aws/api-images.sh promote`). The newest three SHA tags stay on the host. The tag the running container uses is never removed.

## What this does and does not undo

| Undone by an image rollback | Not undone |
|---|---|
| The API code in the `mipo-api` container | Migrations. They are forward-only. The older API runs against the newer schema. |
| | The frontend in `/opt/mipo/dist`. It stays the build of the newer commit. |
| | Anything in `.env`. |

Use it when the new API is broken and the schema change in that deploy was additive (new tables or columns only). If the deploy dropped or renamed something the older code reads, the rollback will fail its health check. Restore from the pre-migration dump (`/opt/mipo/backups`) instead, which is a separate decision.

A rollback is the fast path. The lasting fix is a revert PR into `aws-migration`, which deploys normally.

## Commands (on the production host, as the deploy user)

List what is there and what is running:

```bash
bash /opt/mipo/deploy/aws/api-images.sh list /opt/mipo
```

Put an earlier build back (no rebuild, API only, waits for `/api/health/schema`):

```bash
bash /opt/mipo/deploy/aws/api-images.sh rollback /opt/mipo <sha12>
```

Check it:

```bash
curl -fsS https://mipo.pet/api/health        # "version" is <sha12>
curl -fsS https://mipo.pet/api/health/schema
```

The next deploy of `aws-migration` builds and runs its own tag again, whatever was rolled back to.

## Notes

- The first deploy after this change is the first with a SHA tag. Before it, the image had compose's default name, and there is nothing to roll back to.
- `MIPO_API_IMAGES_KEEP` changes how many SHA tags `promote` keeps (default 3).
- `deploy/aws/sync-ssm-env.sh` runs `up --build` without `MIPO_IMAGE_TAG`, so it rebuilds `mipo-api:latest` from the `server/` already on the host. That is the same code the last deploy shipped.
