# Scraper API: Zapier Integration

[Integrations page](https://geonode.com/integrations) · [Geonode API docs](https://docs.geonode.com/docs/scraper-api) · [GitHub source](https://github.com/geonodecom/integration-zapier) · [Repository overview](../README.md)

A native [Zapier Platform CLI](https://docs.zapier.com/platform/reference/cli-docs)
app (Node.js) that exposes the [Geonode Scraper API](https://geonode.com/products/scraper-api)
to no-code users. It mirrors the capabilities of the n8n and Make.com integrations
in the Geonode integration collection.

> **Distribution:** This app is built for **private / invite-only** use. You push
> it to your own Zapier account and share an invite link — the lengthy public
> Zapier app-review process is intentionally **out of scope**.

## Capabilities

### Actions (creates)

| Action | Endpoint | What it does |
| --- | --- | --- |
| **Extract URL** | `POST /v1/extract` | Scrape a single URL → Markdown/HTML. Sync by default; async mode with optional wait-for-completion. |
| **Batch Scrape URLs** | `POST /v1/batch` | Submit many URLs in one job. Optional wait-for-completion polling. |
| **Crawl Site** | `POST /v1/crawl` | Crawl from a seed URL (depth / page limit). Optional wait-for-completion polling. |
| **Map URLs** | `POST /v1/map` | Discover all URLs under a base URL via sitemaps + light crawling. |

### Search

| Search | Endpoint | What it does |
| --- | --- | --- |
| **Find Job by ID** | `GET /v1/{extract\|batch\|crawl\|map}/{job_id}` | Look up any job by ID and return its current status/result. A missing job returns no results (not an error). |

### Trigger

| Trigger | Mechanism | What it does |
| --- | --- | --- |
| **Job Completed** | REST Hook (`/v1/webhooks`) | Fires the moment an async **extract / batch / crawl** job finishes. Auto-registers a webhook on Zap turn-on and removes it on turn-off. Backfills recent completed jobs for testing. |

Every operation ships **sample data** and **output field** definitions so
downstream Zap steps can map fields before any live run — meeting Zapier
platform standards.

## Authentication

Custom auth with two fields:

- **Base URL** — root of your Scraper API deployment (no trailing slash).
- **API Key** — sent as the `X-Api-Key` header on every request.

The connection test calls `GET /v1/statistics` (an authenticated endpoint) so a
bad key is rejected at connect time. `/health` is unauthenticated and would pass
even with a bad key, so it is deliberately not used.

## Project layout

```
./
  index.js                 App definition (auth, middleware, triggers, searches, creates)
  authentication.js        Custom API-key + base-URL auth, connection test/label
  middleware.js            beforeRequest (X-Api-Key) + afterResponse (error mapping)
  lib/
    client.js              request() with retry/backoff, pruneEmpty, pollUntilComplete
    fields.js              shared input fields (formats, proxy, wait_config, polling)
    samples.js             sample payloads + output fields per operation
  creates/
    extract_url.js
    batch_scrape.js
    crawl_site.js
    map_urls.js
  searches/
    find_job.js
  triggers/
    job_completed.js       REST Hook for async job completion
  test/
    helpers.test.js        pure-function unit tests
    app.test.js            end-to-end tests with nock-mocked HTTP
```

## Local development

```sh
npm ci

# Run the test suite (no network — HTTP is mocked with nock).
npm test
```

To exercise the live app locally, copy `.env.example` to `.env`, fill in
`BASE_URL` and `API_KEY`, and use `zapier-platform invoke` after logging in (below).

> **CLI command name:** this project targets `zapier-platform-cli` **v19**, where
> the binary is named **`zapier-platform`** (it was `zapier` in v15 and earlier).
> The local devDependency is invoked as `npx zapier-platform …`; a global install
> exposes the same `zapier-platform` command.

## Packaging reference (maintainers only)

The existing Geonode app is **243288**. Do not register a duplicate app. Releases go through the `Publish` workflow; these commands are reference material.

## Packaging for private / invite-only use

1. Install the CLI and log in (one-time):

   ```sh
   npm install -g zapier-platform-cli
   zapier-platform login
   ```

2. Register the app on your account (one-time — creates `.zapierapprc`, which is
   gitignored):

   ```sh
   zapier-platform register "Scraper API"
   ```

3. Validate, then push a private version:

   ```sh
   zapier-platform validate          # structural + style checks
   zapier-platform push              # build + upload this version
   ```

4. Share it privately — no public review required:

   ```sh
   # Invite specific users by email...
   zapier-platform users:add user@example.com

   # ...or get a shareable invite link for the current version.
   zapier-platform users:links
   ```

Invited users see the app in their Zap editor immediately. Promote a version
with `zapier-platform promote <version>` when you want new invitees to land on it
by default. Public listing (app submission) is **not** performed here by design.

## Automated publishing

[The `Publish` workflow](../.github/workflows/publish.yml)
pushes a new version to Zapier automatically. It runs `npm ci` → `npm test` →
`zapier-platform validate` → `zapier-platform push`, and only publishes when
`package.json`'s **version changes** on `main` (or on a manual
`workflow_dispatch`, which can also `zapier-platform promote`). Re-pushing an
existing version is impossible, so the version-change gate keeps merges idempotent.

One-time setup in the GitHub repo (Settings → Secrets and variables → Actions):

| Name | Kind | How to get it |
| --- | --- | --- |
| `ZAPIER_DEPLOY_KEY` | **Secret** | Run `zapier-platform login` locally, then copy the `deployKey` value from `~/.zapierrc`. The CLI reads this env var for non-interactive auth. |
| `ZAPIER_APP_ID` | **Variable** | Run `zapier-platform register "Scraper API"` (or `zapier-platform link`) once locally; copy the numeric `id` from the generated `.zapierapprc`. CI recreates `.zapierapprc` from this value. |

Release flow: bump `version` in `package.json` (and note it in a changelog if you
keep one), merge to `main` → the workflow pushes that version. To make it the
default for new invitees, run the workflow manually with **promote = true**, or
run `zapier-platform promote <version>` locally. Move existing users with
`zapier-platform migrate <old> <new>`.

## Notes & behaviour

- **Retries:** `429` and `5xx` responses are retried up to 5 times with
  exponential backoff, honoring `Retry-After` when present.
- **Wait-for-completion:** crawl/batch (and async extract) can optionally poll
  the job status until it reaches a terminal state (`completed` / `failed` /
  `cancelled`) within a configurable timeout.
- **Proxy & wait config:** surfaced as flat fields and reassembled into the
  nested `proxy` / `wait_config` request objects the API expects.
- **Webhook signing secret:** the secret returned at registration is stored in
  the Zap's `subscribeData`. Zapier's REST-hook URLs are unguessable; add
  HMAC verification in `triggers/job_completed.js#perform` if your deployment
  signs deliveries and you want strict verification.
