# Changelog

All notable changes to the Zapier integration will be documented in this file. Earlier versions are not listed.

The format is inspired by Keep a Changelog.

## [1.1.0] - 2026-11-08

- **Job Completed** unwraps the API's webhook envelope (`{event, webhook_id, delivery_id, timestamp, data}`). Every result now has `id` (the job ID), `event_type`, `job_id`, `status` and `status_url`; extract events add the job result, batch and crawl events add `counts`. Test data from recent jobs has the same shape, and output fields follow the chosen event. Before, Zaps got the envelope as is, and test data had another shape.

- Every step finishes within Zapier's 30-second limit. A sync **Extract URL** sends `timeout: 20000`, so the API stops a slow page and does not bill it. **Wait for Completion** checks the job for up to 25 seconds and then returns the running job's ID and status instead of an error. The **Poll Interval (ms)** and **Poll Timeout (ms)** inputs are gone.

- Retries work again: Zapier threw on 5xx before the retry loop saw the answer. A 5xx is now retried while the retry fits in the time left; a 429 is left to Zapier, which runs the step again later.

- The API key is sent only to https addresses on geonode.io. A blank **Base URL** means `https://scraper.geonode.io`. The connection fields link to the dashboard and the API docs.

- Error messages read every error shape the API uses. A validation error shows its field and first message, such as `url: Value error, URL must contain a valid hostname.`

- **Find Job by ID** asks for at most 50 batch or crawl results per page, the API's maximum, and 10 by default. It used to ask for 100, which the API refused.

- User-facing text no longer says "scrape", following Zapier's publishing requirement 1.7. **Batch Scrape URLs** is now **Extract URLs in Batch**; its key `batch_scrape` is unchanged, so existing Zaps keep working.

- `zapier-platform-core` and `zapier-platform-cli` 19.3.0.

- The integrations page link and package homepage point to this integration's own page.

- Removed the internal repository preparation notes and links to the old monorepo.

- README links to the Scraper API product page, and `package.json` names this repository.

## [1.0.2] - 2026-10-19

- Every request sends `X-Geonode-Client: zapier/<version>`, so the API can tell Zapier traffic apart. Zapier sets its own User-Agent, which is why this is a separate header.
