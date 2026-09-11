# 016 — Tasks: SEO meta, brand assets, README, and v1.0.0 release

- [x] Write failing test `apps/web/src/seo/head-meta.test.ts` (meta tags + asset existence + manifest + robots.txt)
- [x] Hand-author `apps/web/public/favicon.svg`, `site.webmanifest`, `robots.txt`, `sitemap.xml`
- [x] `npm run e2e:install` then write `scripts/generate-brand-assets.ts`, wire `assets:generate` npm script, run it to produce `og-image.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`
- [x] Rewrite `apps/web/index.html` `<head>` — test passes (22/22)
- [x] Verify "Thrift Loop" wordmark in `sidebar-nav.tsx` — already correct
- [x] Write `scripts/capture-screenshots.ts` against the live Render URL, wire `screenshots` npm script, run it, commit `docs/assets/`
- [x] Rewrite `README.md`
- [x] `npm run format` then `npm run verify` — green (typecheck/lint/coverage/build)
- [x] `npm run e2e` — 10/17 fail identically on `main` too (confirmed via stash + clean
      run); pre-existing, unrelated to this spec's changes, not fixed here
- [ ] Fetch `/robots.txt` and `/og-image.png` on the deployed site, confirm real files (not SPA-fallback HTML)
- [ ] Validate OG card in Facebook Sharing Debugger and Twitter card validator (warm the site first)
- [ ] Decide LICENSE (ask user) and add if wanted
- [ ] `gh repo edit` — description, homepage, topics
- [ ] `git tag -a v1.0.0`, push, `gh release create v1.0.0` with full notes
