# deciti

**Contract & deadline management for corporate teams.**

deciti is a fast, private, installable web workspace for tracking contracts,
renewals, notice periods, obligations and every other critical date in a
corporate contract portfolio — with deadline intelligence built in.

The entire application ships as **one dependency-free `index.html`** backed by
a hardened Supabase (Postgres) workspace with per-account row level security.

---

## Features

- **Dashboard** — active contracts, total committed value, expiring-in-90-days
  and overdue KPIs, "needs attention" queue, upcoming renewals and recent
  activity at a glance.
- **Contracts registry** — searchable, filterable, sortable, paginated table
  with statuses (`Draft → Active → Pending renewal → Renewed / Expired /
  Terminated`), priorities, owners, departments, values and multi-currency
  reporting. CSV export included.
- **Deadline intelligence** — for every contract deciti derives:
  - days to expiration
  - renewal window
  - **notice deadline** (renewal/expiry date minus the notice period)
  - custom obligations with due dates and completion state
- **Deadlines queue** — one prioritized list of everything that is due,
  filterable by kind and time range.
- **Calendar** — month view of all event types with a per-day detail panel.
- **Renewals pipeline** — renewal dates, notice-window status ("Xd over" when
  the notice window has been missed) and one-click **Log renewal** which
  extends dates by 12 months.
- **Companies** — counterparty directory with contract counts, active value
  and next expiration.
- **Reports** — status/type distributions, expirations over the next 12
  months, renewal pipeline value by quarter, value and deadlines by owner.
- **Notifications** — server-computed alerts (via an RPC that regenerates them
  from your thresholds), unread badge, mark-read/mark-all-read.
- **Data portability** — full JSON backup export/import, sample dataset,
  CSV/JSON export. Nothing lives only in the browser.
- **Accounts & roles** — username + password sign-up/sign-in (no email
  required), owner/admin/manager/member roles enforced by Postgres RLS on
  *every* statement, audit log of all changes, password change with
  re-authentication.
- **PWA** — installable, offline-capable app shell via a service worker.
- **Dark-first interface** — a charcoal-and-green dark UI by default with an
  optional light theme; the toggle lives in the top bar and the choice is
  remembered per device. Charts, calendars and badges adapt automatically.

## Security model

- Only the **publishable (anon)** Supabase key is embedded in the client; it
  cannot read or write anything without a valid session.
- All rows are scoped to an organization and protected by **row level
  security** keyed on `auth.uid()` taken from the verified JWT — never from
  client-supplied data.
- Identity is derived from the signed access token's `sub` claim; the editable
  session user object is never trusted.
- Sign-up goes through a server-side Edge Function (`auth-signup`) so new
  accounts are provisioned consistently.
- Deadline alert generation happens **server-side**
  (`refresh_my_notifications` RPC) scoped to the signed-in account.

## Architecture

```
index.html            the entire SPA: styles, views, router, Supabase client
sw.js                 service worker: network-first shell caching (offline)
manifest.webmanifest  PWA manifest (installable app)
icon.svg              brand icon
robots.txt            keeps the private #/ routes out of search indexes
sitemap.xml           single public entry point
scripts/check.js      zero-dependency syntax check used by CI
```

Key design decisions:

- **Single file, no build step.** Deploy `index.html` (+ the few static
  assets) anywhere static files are served. No bundler, no framework, no
  supply-chain surface beyond the pinned Supabase UMD build and IBM Plex
  fonts from CDN.
- **Server-first writes.** Every mutation hits Postgres first and the UI is
  updated from the row the server returns, so the view can never diverge
  from what was persisted.
- **Escaped-by-default rendering.** All dynamic strings pass through a single
  `esc()` helper before entering HTML.

## Local development

No build required — serve the folder and open it:

```sh
python3 -m http.server 8080
# or
npx serve .
```

Then visit <http://localhost:8080>.

### Checks

CI runs a zero-dependency syntax check on every push:

```sh
node scripts/check.js
```

## Deployment

Any static host works (GitHub Pages, Netlify, Cloudflare Pages, S3…):

1. Point your host at the repository root.
2. Serve `index.html` for `/`.
3. Keep `robots.txt` / `sitemap.xml` in place if the workspace URL is public.

## Backend setup (Supabase)

The client expects:

- Tables: `profiles`, `organizations`, `organization_members`, `contracts`,
  `contract_obligations`, `contract_documents`, `audit_logs`,
  `notifications` — all with RLS enabled and policies scoped to the caller's
  organization and role.
- Database functions: `create_organization(p_name text)` and
  `refresh_my_notifications()`.
- An Edge Function named `auth-signup` that creates the auth user, profile
  and personal organization.

Update the backend coordinates in `index.html` if you fork onto your own
project:

```js
var SUPABASE_URL = 'https://<your-project>.supabase.co';
var SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_…';
```

## Keyboard shortcuts

| Key   | Action                                  |
| ----- | --------------------------------------- |
| `/`   | Focus global search                     |
| `↑ ↓` | Navigate search results                 |
| `↵`   | Open selected result                    |
| `Esc` | Close dialogs, popovers and panels      |
