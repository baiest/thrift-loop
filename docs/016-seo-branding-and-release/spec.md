# 016 — SEO meta, brand assets, README, and v1.0.0 release

## Problem

Thrift Loop is live at https://thrift-loop.onrender.com (spec 015), but nothing about its public face says so. `index.html` has no description, Open Graph, Twitter card, favicon, or manifest — sharing the link anywhere renders a bare URL with no title, image, or summary, and search engines have nothing to index. `README.md` is stale, still claiming no application code exists while 15 specs have shipped. The GitHub repo has no description, topics, homepage, or releases.

## Goals

- `apps/web/index.html` carries full SEO/social meta: description, canonical, Open Graph, Twitter card, favicon set, web manifest, theme-color, robots.txt.
- All referenced local assets (icons, OG image, manifest) exist under `apps/web/public/` and are actually served in production.
- `README.md` reads as a professional, current project overview: features, tech stack, architecture, screenshots, getting started, engineering practices.
- GitHub repo has a description, homepage URL, topics, and a v1.0.0 release with full notes.
- Display name standardized to "Thrift Loop" (two words) everywhere public-facing.

## Non-goals

- A custom domain — the Render URL is the canonical URL for this spec.
- A hand-designed logo/illustration — brand assets are generated programmatically from existing brand tokens (terracotta palette, Inter/Playfair fonts).
- Adding a new image-processing dependency (e.g. sharp, an ICO encoder) — Playwright (already installed) covers PNG generation; `.ico` is skipped in favor of SVG + PNG icons + manifest.
- Solving Render free-tier data persistence — out of scope, inherited from spec 015.
- Choosing/adding a LICENSE file — flagged as an open question, not decided here.

## Acceptance criteria

- [ ] `apps/web/src/seo/head-meta.test.ts` asserts every required meta tag is present in `index.html` and every referenced local asset path exists on disk; test is red before the `index.html` rewrite, green after.
- [ ] `index.html` has: description, canonical, full OG set (type/site_name/url/title/description/image/image:width/image:height/image:alt), Twitter `summary_large_image` card, theme-color, icon links, manifest link.
- [ ] `apps/web/public/` contains `favicon.svg`, `site.webmanifest`, `robots.txt`, `sitemap.xml`, `og-image.png` (1200x630), `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`.
- [ ] Fetching `/robots.txt` and `/og-image.png` on the deployed site returns the real files (not `index.html` with HTTP 200 via the SPA fallback).
- [ ] `README.md` rewritten in English: hero, live demo link + cold-start note, screenshots, features, tech stack, architecture, getting started, scripts, testing, engineering practices (SDD/TDD), roadmap, license section.
- [ ] Sidebar wordmark (`sidebar-nav.tsx`) reads "Thrift Loop" (currently correct — verify, fix if drifted).
- [ ] GitHub repo description + homepage (`https://thrift-loop.onrender.com`) + topics set via `gh repo edit`.
- [ ] `v1.0.0` git tag pushed and GitHub release created with notes covering specs 001-015 grouped by area, plus a known-limitations section (free-tier sleep, non-persistent storage).
- [ ] `npm run verify` and `npm run e2e` pass.

## Open questions

- No LICENSE file exists in the repo. Add MIT before the v1.0.0 release, or leave unlicensed? Flagged to user, not decided here.
