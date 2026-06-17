# Project: GitLab Epic Board

A Kanban board for GitLab epics, deployed on Vercel. Replicates GitLab's epic board with two views: Board (columns) and Swimlanes (rows × columns).

---

## Stack

| Concern | Package / Service |
|---|---|
| Framework | Next.js 16 (App Router) — read `node_modules/next/dist/docs/` before assuming API shape |
| UI | React 19, Tailwind CSS v4 |
| Drag & drop | `@hello-pangea/dnd` v18 |
| Auth | `@clerk/nextjs` v7 |
| Storage | `@upstash/redis` (prod) / JSON files in `.board-data/` (local fallback) |
| GitLab API | REST v4, `https://gitlab.com/api/v4` |
| Deploy | Vercel → GitHub repo `ifreturns/ifreturns-tools` (public) |

---

## Label Conventions (GitLab)

All board logic is driven by label prefixes on epics. Never hard-code label names — they come from the GitLab API.

| Prefix | Role |
|---|---|
| `EPIC::` | **State** — defines Board columns and Swimlane rows (e.g. `EPIC::ASSIGNED`) |
| `TECH::` | **Developer/team** — defines Swimlane columns (e.g. `TECH::frontend`) |
| `PRI::` | Priority — shown on EpicCard |
| `PRODUCT::` | Product area — shown on EpicCard |
| `TYP::` | Type — shown on EpicCard |

Epics without an `EPIC::` label are silently ignored (not shown in either view).

---

## File Map

```
app/
  page.tsx                    — Server component, fetches all data, passes to BoardWithSearch
  layout.tsx                  — ClerkProvider wrapper
  globals.css                 — Tailwind base, NO dark mode (removed)
  sign-in/[[...sign-in]]/     — Clerk sign-in page
  api/
    epics/[id]/route.ts       — PUT: update epic labels via GitLab API
    column-order/route.ts     — GET/PUT: shorthand for "column-order" storage key
    board-config/[key]/route.ts — GET/PUT: generic storage key endpoint

components/
  BoardWithSearch.tsx          — Toolbar (search, state dropdown, TECH chips, tab switcher)
                                 Manages filter state; renders Board or SwimlaneBoard
  Board.tsx                    — Board view: DnD columns (EPIC:: states), static CLOSED column
  Column.tsx                   — Single droppable column with EpicCards
  EpicCard.tsx                 — Draggable epic card + StaticEpicCard (for CLOSED column)
                                 DescriptionModal with linkify (Markdown + bare URLs → <a>)
  SwimlaneBoard.tsx            — Swimlane view: rows=EPIC:: states, cols=TECH:: devs

lib/
  gitlab.ts                    — GitLab REST API helpers (paginated fetch, getGroupEpics,
                                 getGroupClosedEpics, updateEpicLabels)
  storage.ts                   — getConfig / setConfig (Upstash Redis or local JSON fallback)

types/
  gitlab.ts                    — GitLabEpic, GitLabLabel, GitLabUser, BoardColumn

proxy.ts                       — Clerk middleware protecting all routes
```

---

## Architecture & Key Decisions

### Server-side data fetch (no flash)
`app/page.tsx` fetches epics, labels, closedEpics, and **saved column/row order** in parallel server-side, then passes everything as props to `BoardWithSearch`. This eliminates the flash-of-default-order that happened with client-side `useEffect` fetching.  
`export const dynamic = "force-dynamic"` is required at the top of `page.tsx` to prevent Next.js from caching the server component and returning stale storage data.

### Shared order key — Board columns === Swimlane rows
Both the Board (left→right) and Swimlane (top→bottom) use the same storage key: `"column-order"`. When you drag a column in the Board, it also reorders rows in Swimlanes, and vice versa. This is intentional.

The Swimlane has a separate key `"swimlane-col-order"` only for TECH:: column order (horizontal axis).

### DnD: hidden columns stay in DOM
When a state is hidden (via the State filter dropdown), its column is NOT removed from the DOM — that would break `@hello-pangea/dnd` indices. Instead, hidden columns get `style={{ width:0, minWidth:0, overflow:"hidden", padding:0, margin:0 }}` and `isDragDisabled={true}`. Same pattern for hidden EpicCards in `EpicCard.tsx` (`height:0, overflow:hidden`).

### CLOSED column
- Rendered as a static, non-draggable column at the far right of the Board view.
- Shows epics closed in the last 30 days (`closed_at >= now - 1 month`), filtered server-side in `getGroupClosedEpics`.
- Uses `StaticEpicCard` (exported from `EpicCard.tsx`) — same visual as EpicCard but no Draggable wrapper.
- The CLOSED column respects the search query and TECH:: chip filters.

### State filter — per-tab defaults
`BoardWithSearch` maintains two independent hidden-state sets:
- `boardHiddenStates`: empty by default (all states visible).
- `swimlaneHiddenStates`: hides all states except `ASSIGNED`, `DEVELOPMENT`, `FIX-REQUIRED` by default.

These are stored in React state only — not persisted to storage.

### Swimlane workload badge
The badge count next to each TECH:: column header counts only epics in **currently visible** (non-hidden) states. Epics filtered by search/TECH chips are also excluded from the count.

---

## Storage Keys (Upstash / local)

All keys are prefixed with `gitlab-board:` in Redis.

| Key | Value | Description |
|---|---|---|
| `column-order` | `string[]` | Ordered list of `EPIC::` label names (Board columns / Swimlane rows) |
| `swimlane-col-order` | `string[]` | Ordered list of `TECH::` label names (Swimlane columns) |

Local fallback: `.board-data/<key>.json` (gitignored). Created automatically.

---

## Environment Variables

```
GITLAB_TOKEN=                    # GitLab personal access token (read_api + write scope)
GITLAB_GROUP_ID=ifreturns        # GitLab group path or numeric ID

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# One of these pairs for Upstash Redis (prod only):
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
# or the legacy Vercel KV aliases (also accepted):
KV_REST_API_URL=
KV_REST_API_TOKEN=
```

Without Upstash env vars, storage falls back to `.board-data/` JSON files (local dev only).

---

## Auth

Clerk protects all routes via `proxy.ts` middleware. `/sign-in` is the only public route.  
**Allowlist (restrict to ifreturns.com domain) requires Clerk Pro plan** — on free plan, domain filtering must be done manually in middleware if needed.

---

## Deploy

GitHub repo: `ifreturns/ifreturns-tools` (public, required for Vercel Hobby with org).  
Push command uses token from `~/.zshrc`:
```sh
git remote set-url github "https://ifreturns:${GITHUB_TOKEN}@github.com/ifreturns/ifreturns-tools.git"
git push github main
```

Vercel env vars to configure in dashboard:
- All four GitLab/Clerk vars above
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (from Upstash marketplace integration or manual)

---

## Common Gotchas

- **Do not remove hidden columns from the DOM** — breaks DnD index tracking.
- **`params` in App Router route handlers is a Promise** — always `await params` before destructuring.
- **GitLab `updateEpicLabels` sends labels as comma-separated string** — `labels.join(",")` in the PUT body, not a JSON array.
- **`getGroupClosedEpics` double-filters**: API `updated_after` is a broad filter; the result is then filtered again by `closed_at` to ensure only truly closed-within-last-month epics appear.
- **Tailwind v4** — config is in `postcss.config.mjs`, not `tailwind.config.js`. Directives syntax may differ.
- **Next.js 16 + React 19** — APIs may differ from training data. Read the local docs in `node_modules/next/dist/docs/`.
