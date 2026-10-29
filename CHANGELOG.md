# Changelog

All notable changes to the Zapier integration will be documented in this file. Earlier versions are not listed.

The format is inspired by Keep a Changelog.

## [Unreleased]

- The integrations page link and package homepage point to this integration's own page.

- Removed the internal repository preparation notes and links to the old monorepo.

- README links to the Scraper API product page, and `package.json` names this repository.

## [1.0.2] - 2026-10-19

- Every request sends `X-Geonode-Client: zapier/<version>`, so the API can tell Zapier traffic apart. Zapier sets its own User-Agent, which is why this is a separate header.
