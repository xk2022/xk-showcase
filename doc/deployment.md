# Deployment

The hub builds registered public XK source repositories from their configured branches or tags, exports Next.js static assets into isolated subdirectories, generates an index, and publishes one artifact on GitHub Pages. Each artifact records source SHAs. Failed builds must not publish.

## Migration and verification

1. Confirm Pages source is GitHub Actions and configure the custom domain and DNS.
2. Run the hub workflow and verify all three routes load their CSS, scripts, photos and icons without 404s; confirm browser interactions and case-specific canonical URLs.
3. Verify the root robots.txt references each sitemap. Keep old independent deployments until the new URLs are confirmed.
4. Retire any duplicate showcase-domain binding only after inspecting existing site settings; do not remove unrelated domains. Redirect the legacy Honest hostname at the DNS/HTTP provider or keep the prior deployment until redirect is ready.

## Updates and rollback

Run the hub workflow whenever a source update is ready. For rollback, set the affected source's ref to a known-good release tag, review and deploy. Use the published manifest to identify the source commit to tag. A later phase can add authenticated cross-repository triggers.
