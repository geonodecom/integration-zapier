# Release migration

This standalone source repository is prepared for private review. **Publishing still belongs to [the original monorepo workflow](https://github.com/geonodecom/scraper-api-sdks/blob/main/.github/workflows/zapier-publish.yml).** No workflow, credential, registry ownership, or platform deployment has been migrated here.

Repository metadata now points to `geonodecom/integration-zapier` where supported. Existing published artifacts keep their old source metadata until an approved release. Package and platform identifiers are unchanged.

Before moving publishing:

1. Review the extracted history and license; confirm the private repository is the intended source of truth.
2. Run local checks and a controlled live workflow against a test account. Check authentication, errors, polling and relevant webhooks.
3. Update the existing release workflow for root-level paths and confirm the approved version/changelog. Coordinate with the original workflow so only one repository can release.
4. Configure the new repository's release identity and environment through the platform's own controls. Do not copy credentials into source files.
5. Validate the built artifact and its source/docs links; publish only as a separate approved release. Verify installation and a real workflow after release.

## Identity to preserve

- Zapier app ID: `243288`, private app; version remains `1.0.2`.
- Internal package name: `zapier-scraperapi`; `private: true` remains set. It is not an npm distribution.
- Keep create/search/trigger keys and authentication fields compatible with existing Zaps. Link the existing app during an approved release setup; do not register a new app.
- Existing CI uses `ZAPIER_DEPLOY_KEY` and `ZAPIER_APP_ID`; no deploy key or `.zapierapprc` is included here.
- Public marketplace review and listing are separate future work. Access remains by request.

## Signup offer release check

The README uses the product-owner-approved launch copy, “Sign up to get 10,000 free credits” (21 October 2026). Before public release, verify that the live signup flow and account credit allocation match this offer. This copy update does not configure billing or issue credits.

## Cross-link deployment handoff

The README and package homepage link to the live [integrations hub](https://geonode.com/integrations). The intended detail destination is `https://geonode.com/integrations/zapier`; it is a deployment target, not a verified public page. After that detail page is deployed and checked, replace the hub fallback in README/package metadata with the detail URL and retain an API documentation link.

Source metadata targets `https://github.com/geonodecom/integration-zapier`; the repository remains private until its separate release decision. These local metadata edits do not alter an existing PyPI/npm listing. Carry them into the authoritative publishing source at the coordinated next release, then verify the registry's rendered README, source/issue links and homepage. Keep existing package names, versions and import identifiers unchanged during preparation.
