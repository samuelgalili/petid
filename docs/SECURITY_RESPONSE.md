# Legacy Supabase Security Response

The AWS application no longer depends on Supabase, but the previous Supabase
project and Edge Functions must be treated as active until they are explicitly
disabled. Removing source files from this branch does not undeploy remote
functions or revoke their secrets.

## Immediate Containment

1. Pause external traffic to the legacy Supabase project or undeploy every Edge
   Function, especially shipping, order-status, webhook, deployment, and agent
   functions.
2. Disable scheduled jobs, database webhooks, and outbound integrations in the
   legacy project.
3. Preserve only the records required for migration, legal retention, or an
   incident investigation. Do not keep the project online merely as a backup.
4. Review Supabase function, auth, and database logs for anonymous calls after
   the AWS cutover date.

## Credential Rotation

Rotate or revoke credentials in both the provider and every remaining runtime:

- Supabase service-role, JWT, database, and personal-access credentials.
- Payment and webhook credentials, including CardCom.
- Shipping/carrier and payout credentials.
- AI, scraping, mail, push, maps, WhatsApp, and other integration credentials.
- GitHub Actions, Vercel, and deployment credentials that could access the old
  project.

Browser-facing public keys should still be restricted to the intended origins,
APIs, and quotas. Rotation is required if a key previously enabled privileged
server behavior through an unauthenticated function.

## Verification

- Legacy project and function URLs return unavailable or not found.
- No legacy scheduler, webhook, or database trigger can mutate AWS production.
- AWS SSM contains the complete current secret set and `/opt/mipo/.env` was
  regenerated after rotation.
- Payment, shipping, email, AI, and push smoke tests succeed only through AWS.
- Repository secret scanning finds no live credential in the current tree or
  retained history.

## Git History

The `.env` file has existed in Git history. Removing it from the current branch
prevents future exposure but does not erase old blobs. Coordinate a history
rewrite with all collaborators only after credential rotation; all clones and
open branches must then be recreated from the rewritten repository.
