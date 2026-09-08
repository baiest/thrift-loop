# 002 — Create/edit clothing auctions

## Problem

Logged-in users have no way to list a second-hand clothing item for auction. This is the first
step: create a draft listing, edit it while it's a draft, publish it (manually or on a scheduled
date), and delete it. Browsing/bidding on other users' auctions is a later spec.

## Goals

- A logged-in user can create a clothing auction: category, condition, initial price in COP,
  delivery method, up to 10 photos, and an optional future date to auto-publish.
- A user can edit their own auction with PATCH while it is still a draft.
- A user can manually publish a draft (also via PATCH) or let it publish automatically at
  `publishAt`, via a background scheduler.
- Once published, an auction can no longer be edited — only deleted.
- A user can delete their own auction regardless of its status.
- Categories are a fixed, curated list, trivial for a developer to extend (no admin UI needed).
- Uploaded photos are validated (file type, size) before being accepted.
- Every model carries `createdAt`/`updatedAt` audit fields.
- User and auction IDs are prefixed (`USR-...`, `AUC-...`) so their type is obvious at a glance,
  and photo files are organized on disk by user ID then auction ID.

## Non-goals

- **No title or description field.** Not requested; flagged here as a likely real gap (a listing
  identified only by category + condition is thin) for a follow-up spec, not invented now.
- No public browsing/search of other users' auctions — only the owner can view or list their own
  for now.
- No bidding, no offers, no payments.
- No editing a published auction (explicitly disallowed by this spec) — no exceptions, no admin
  override.
- No limit on how many auctions a user can create.
- No image cropping/resizing/optimization — files are stored as uploaded (after validation).
- No S3/cloud storage — local disk, same as the existing JSON-file data store. Same Railway
  ephemeral-disk caveat that already applies to `data/users.json` today; not solved here.

## Acceptance criteria

### Create

- [ ] `POST /api/auctions` (authenticated) with a valid category, condition, delivery method,
      positive integer `priceCOP`, and optional future `publishAt` creates a `draft` auction
      owned by the caller and returns it.
- [ ] An invalid category/condition/deliveryMethod, a non-positive or non-integer price, or a
      `publishAt` that isn't a parseable future date is rejected with a specific field error.
- [ ] A newly created auction always starts as `draft`, even when `publishAt` is provided.

### Update / publish

- [ ] `PATCH /api/auctions/:id` (owner only) updates any editable field while `status === draft`.
- [ ] Including `status: "published"` in the PATCH body manually publishes a draft.
- [ ] `PATCH` on a `published` auction is rejected (409) — no field may change.
- [ ] `PATCH` on an auction that doesn't exist, or isn't owned by the caller, returns 404 in both
      cases (existence of another user's auction is never revealed).

### Auto-publish

- [ ] A background scheduler periodically flips `draft` auctions whose `publishAt` has passed to
      `published`, without any request triggering it.

### Delete

- [ ] `DELETE /api/auctions/:id` (owner only) deletes the auction and its photo files, regardless
      of whether it is `draft` or `published`.

### Photos

- [ ] `POST /api/auctions/:id/photos` (owner only, draft only) accepts up to 10 images total per
      auction (JPEG/PNG/WebP, 5 MB max per file); anything else is rejected with a clear error.
- [ ] Uploading photos that would push the total past 10 is rejected without saving any of them.
- [ ] Photo files are stored under `data/uploads/<USR-id>/<AUC-id>/` and served back as static
      URLs on the returned auction.

### IDs and auditing

- [ ] New users get a `USR-<uuid>` id (was a bare UUID before this spec); new auctions get
      `AUC-<uuid>`.
- [ ] `User` and `Auction` both carry `createdAt` and `updatedAt`; `updatedAt` changes whenever
      the record is modified.

### Frontend

- [ ] After login, a left-side navigation menu is available, mobile-first (collapsed behind a
      toggle on small screens), with "Create auction" as its first item.
- [ ] The create-auction form covers exactly the fields above, lets the user pick up to 10
      photos with a preview, and shows the same validation the backend enforces.
