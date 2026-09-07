# Staging environment

MIPO has had exactly one environment: production. `deploy-aws.yml` pushed from
`aws-migration` straight to the live host. This document sets up a second one.

The repository changes are done. **The AWS resources are not** — they cost money
and have to be created by someone with console access. Everything below is the
part a human runs.

## How it works

The deploy workflow now triggers on both `aws-migration` and `staging`, and
picks its target from a GitHub Environment:

| Branch | Environment | Host |
|---|---|---|
| `aws-migration` | `production` | the existing Lightsail instance |
| `staging` | `staging` | a new, separate instance |

Host, paths and SSH key all resolve from that environment, so the workflow
itself has no per-environment logic beyond choosing the name.

The intended flow becomes: feature branch → `staging` → verify → `aws-migration`.

### The guard

A `Verify deploy target` step runs before anything is touched. It fails the run
if `MIPO_AWS_HOST` is unset, and refuses outright to deploy the `staging` branch
to the production IP.

This matters because the host variable falls back to the production IP by
default. Without the guard, a `staging` environment created without
`MIPO_AWS_HOST` would have deployed staging code to production — silently. That
fallback is now restricted to the production branch, and the guard is the second
line of defence.

## The database: use a container

Staging does **not** need its own RDS instance. `docker-compose.yml` now carries
a `postgres` service behind a `staging` compose profile, so production — which
uses RDS — never starts it.

|  | Container on the staging host | Second RDS instance |
|---|---|---|
| Cost | included in the instance | roughly $15–25/month more |
| Reset and reseed | drop the volume | snapshot juggling |
| Fidelity | same PostgreSQL 16 | also matches RDS TLS, parameter groups, failover |

For testing migrations and application behaviour the container is equivalent.
What it does not exercise is RDS-specific configuration — TLS enforcement,
parameter groups, IAM auth. If you later want to rehearse an RDS upgrade
specifically, spin up a temporary instance for that and delete it after.

Staging data is disposable by design. Do not copy production data into it —
once real customers exist, that copies real personal data into a weaker
environment. Seed it instead.

## 1 · Create the instance

Lightsail, same region as production, Ubuntu 22.04 or newer. The smallest plan
with 2 GB RAM is enough; the frontend build happens in CI, not on the host.

Attach a static IP — the deploy targets it by address.

## 2 · DNS

Point `staging.mipo.pet` at the static IP (an `A` record at Namecheap). Do not
create a `www.staging` record; the Caddyfile only asks for a certificate for the
name in `MIPO_SITE_ADDRESS`.

## 3 · Bootstrap the host

```bash
ssh ubuntu@<STAGING_IP>

# Docker
sudo apt-get update && sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo tee /etc/apt/keyrings/docker.asc >/dev/null
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" |
  sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo usermod -aG docker ubuntu   # log out and back in

sudo mkdir -p /opt/mipo
sudo chown -R ubuntu:ubuntu /opt/mipo
```

Open ports 80, 443 and 22 in the Lightsail firewall. **Do not open 5432** — the
database container is only reachable on the internal compose network.

## 4 · The environment file

Create `/opt/mipo/.env`, mode `0600`. Start from `.env.example` and set:

```bash
NODE_ENV=production
PORT=3000

# Site identity — this is what makes it staging
MIPO_SITE_ADDRESS=staging.mipo.pet
MIPO_ROBOTS_POLICY=noindex, nofollow
PUBLIC_APP_URL=https://staging.mipo.pet
# MIPO_WWW_ADDRESS deliberately unset

# Containerised database
STAGING_DB_NAME=mipo
STAGING_DB_USER=mipo
STAGING_DB_PASSWORD=<generate one>
DATABASE_URL=postgres://mipo:<same password>@postgres:5432/mipo
DB_SSL=false

ADMIN_API_KEY=<a different key from production>
DEFAULT_BUSINESS_ID=cf941cc4-e1d1-4d7c-8122-a5df81a1e53c
```

Two rules for the rest of the keys:

- **CardCom: leave all four empty.** The code disables payments when they are
  unset, which is what staging should do. Never point staging at the live
  terminal. If you need to exercise checkout, ask CardCom for test credentials.
- **Every other secret gets its own value.** A staging key that is also the
  production key means a leak from the weaker environment is a leak from both.
  `ADMIN_API_KEY` especially — note that it doubles as the HMAC secret for
  password-reset codes.

`sync-ssm-env.sh` already accepts `MIPO_SSM_PREFIX`, so an SSM path of
`/mipo/staging` works with no change:

```bash
MIPO_SSM_PREFIX=/mipo/staging \
MIPO_REMOTE_HOST=ubuntu@<STAGING_IP> \
MIPO_SSH_KEY=~/.ssh/mipo-staging-key.pem \
  bash deploy/aws/sync-ssm-env.sh
```

## 5 · Start the database

Once, at provisioning time. The deploy workflow does not manage it — it restarts
with the host.

```bash
cd /opt/mipo
docker compose -f deploy/aws/docker-compose.yml --profile staging up -d postgres
docker compose -f deploy/aws/docker-compose.yml ps
```

The `deploy/aws` directory arrives with the first deploy, so either run the
first deploy before this step or copy the compose file up by hand.

## 6 · GitHub Environments

**Settings → Environments → New environment → `staging`**

Variables:

| Name | Value |
|---|---|
| `MIPO_AWS_HOST` | the staging static IP |
| `MIPO_AWS_USER` | `ubuntu` |
| `MIPO_REMOTE_PATH` | `/opt/mipo` |
| `MIPO_PUBLIC_BASE_URL` | `https://staging.mipo.pet` |

Secret:

| Name | Value |
|---|---|
| `MIPO_AWS_SSH_PRIVATE_KEY` | the staging host's private key |

Then create a `production` environment and move the existing repository-level
variables and secret into it, so production stops relying on the defaults. Until
you do, production keeps working from the fallbacks — but the two environments
are only genuinely separated once production has its own.

Consider a required reviewer on the `production` environment. It turns a push to
`aws-migration` into something a person has to approve.

## 7 · First deploy

```bash
git checkout -b staging aws-migration
git push -u origin staging
```

Watch the run. `Verify deploy target` prints the host it resolved — check it is
the staging IP before the run gets any further.

Then:

```bash
curl https://staging.mipo.pet/api/health
curl -I https://staging.mipo.pet | grep -i x-robots-tag   # noindex, nofollow
```

## 8 · Seed an admin

```bash
docker compose -f deploy/aws/docker-compose.yml run --rm mipo-api \
  npm run admin:provision -- --email you@example.com --role admin --display-name "Staging admin"
```

## Cost

One extra Lightsail instance. At the 2 GB plan that is roughly $12/month, with
no second RDS instance and no second set of backups.

## What this unblocks

Migrations `0017`–`0019` can be rehearsed against a real deployment before they
touch production data — which matters most for `0019`, since it drops columns
and has to land in the same release as its code changes. Staging is where that
ordering gets proven rather than assumed.
