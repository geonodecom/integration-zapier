![Geonode for Zapier: Web Scraping & Data Extraction](assets/banner.svg)

# Geonode for Zapier: Web Scraping & Data Extraction

Bring web content into Zapier with Geonode’s app. Extract pages, discover URLs, crawl sites and run batches, then continue your Zap when a job completes. Pass results to your AI or business-app steps for research, summaries and record updates.

**[Try Geonode for free](https://app.geonode.com/sign-up)**

[Integrations page](https://geonode.com/integrations) · [Geonode API docs](https://docs.geonode.com/docs/scraper-api) · [View source on GitHub](https://github.com/geonodecom/integration-zapier) · [Complete guide](docs/guide.md)

**Private app, access by request.** This is the source for Geonode's existing invite-only Zapier app, ID `243288`. It is not publicly listed in the Zapier marketplace. The internal `zapier-scraperapi` package remains private and is not published to npm.

<!-- BEGIN README NAV -->
[Get started](#get-started) · [Example: a new URL → page content → your next app](#example-a-new-url--page-content--your-next-app) · [Actions, search and trigger](#actions-search-and-trigger) · [Setup questions](#setup-questions)
<!-- END README NAV -->

## Workflow ideas

- **Enrich incoming records.** Take a website URL from a form or CRM trigger, extract its content, and pass it to a later Zap step for processing.
- **Collect website content on a schedule.** Start a bounded crawl and use Job Completed to continue processing when the background work finishes.
- **Build an AI summary workflow.** Send extracted Markdown to a separate AI step and store its summary alongside the source URL.

## Get started

1. [Contact Geonode](https://geonode.com/contact) for an invitation to the private Zapier app.
2. Create an API key in the [Geonode dashboard](https://app.geonode.com/) under **API Keys**.
3. Connect the app in Zapier with your API key and base URL `https://scraper.geonode.io`.
4. Choose **Extract URL**, enter a page URL, and map the returned Markdown or HTML into your next step.

The connection test uses authenticated usage statistics. Requests send your key as `X-Api-Key`.

## Example: a new URL → page content → your next app

Use a form or spreadsheet trigger that supplies a URL, then choose **Extract URL** with synchronous processing and Markdown output. Test the action and map **Markdown** (`data__markdown`) and **URL** (`metadata__url`) into your destination step. These are Zapier field names for nested API output; the source response stores them under `data.markdown` and `metadata.url`.

For a summary, send Markdown to a separate AI step and save its result with the source URL. For structured product or company fields, add a parsing step. Geonode retrieves the page content; these transformations and destination connections are configured separately.

For longer batches or crawls, retain the job ID and use **Find Job by ID** or the **Job Completed** trigger. A queued job is not finished content. Test the complete Zap before enabling it; the workflow recipes here have not been live-tested in this review.

## Actions, search and trigger

| Operation | What it does |
| --- | --- |
| Extract URL | Extract one page; supports sync or async processing and optional waiting. |
| Batch Scrape URLs | Process many URLs as a background job. |
| Crawl Site | Follow links from a seed URL within your depth and page limits. |
| Map URLs | Discover URLs under a site. |
| Find Job by ID | Retrieve an extraction, batch, crawl or map job's status/result. |
| Job Completed | Receive a REST-hook event when extraction, batch or crawl work completes. |

Sample data and output-field definitions help you map downstream steps before a live run. For long operations, prefer a background job and completion trigger to keeping an action open. Read the [full guide](docs/guide.md) for polling, retries, error mapping and webhook behavior.

## Develop locally

Use Node.js 18 or newer and npm. Run from the repository root:

```sh
npm ci
npm test
npm run validate
npm run build
```

Tests mock API requests with nock. Validation and packaging are local checks, not deployment. For controlled live testing, copy `.env.example` to `.env` and provide your own test-account credentials; `.env` is ignored by Git. Never commit `.zapierrc`, `.zapierapprc`, or a deploy key.

## Setup questions

**Can't find the app?** Accept the private app invitation in the Zapier account you will use. There is no public marketplace install link yet.

**Need an MCP connection?** Use the separate [Geonode MCP server](https://docs.geonode.com/docs/scraper-api/guides/mcp/00_overview) for compatible AI assistants. This repository supplies native Zapier actions, a job search and a completion trigger.

**Need search results or change alerts?** Web search and automatic change detection are not actions in this Zapier source. Add the appropriate API or comparison step for that workflow.

## Source and releases

The app ID and the action, search and trigger identifiers are kept stable. Bumping `version` in `package.json` on `main` pushes that version to Zapier through the `Publish` workflow.

[Contributing](CONTRIBUTING.md) · [Changelog](CHANGELOG.md) · [Contact Geonode](https://geonode.com/contact)

MIT licensed. See [LICENSE](LICENSE).

**[Try Geonode for free](https://app.geonode.com/sign-up)**
