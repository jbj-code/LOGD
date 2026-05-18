# CONTEXT.md — LOGD

## What it is

**LOGD** is a personal PWA habit tracker. Each **Log** is a yes/no daily activity (e.g. Gym, Stretching). The user marks completion per day; the app shows **heat-map-style** grids, **streaks**, **consistency**, and a **month calendar** with per-day detail.

Built for **single-user** use today (no accounts). **`useLogsStore`** persists to **Supabase** when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set; otherwise **localStorage** (`LOGD-logs`). Same boundary keeps swapping backends straightforward.

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | React 19 + TypeScript (Vite 8) |
| PWA | `vite-plugin-pwa` (Workbox) |
| Styling | Plain CSS + **`src/styles/tokens.css`** (CSS custom properties for dark/light) |
| Icons | Google Material Symbols Rounded (CDN in `index.html`) |
| Font | System stack (`tokens.css` `--font-family`) |
| Data | **`useLogsStore`** → Supabase tables `logs` / `log_entries` if env set; else localStorage **`LOGD-logs`** |
| Backend | **Supabase** (`@supabase/supabase-js`); schema SQL in **`supabase/schema.sql`** |
| Routing | **No router** — `NavScreen` state + callbacks in `App.tsx` |

---

## Architecture

### Folder layout

```
src/
  App.tsx / App.css       ← Shell: bottom nav, main slot, splash boot, logs FAB, modals, detail/archived slide-in routes
  main.tsx / index.css    ← Entry; global resets; `.visually-hidden`
  lib/supabase.ts        ← Browser Supabase client (env-gated)
  styles/
    tokens.css            ← Source of truth: colors, spacing, radii, typography, heat-map tokens
    theme.ts              ← LOG_COLORS[] only (picker / logic hex values)
  types/index.ts          ← Log, AppSettings, Tab, NavScreen
  constants/icons.ts      ← Allowed Material Symbol names for log icons
  utils/
    date.ts               ← Dates, month grids, getWeeksForCalendarYear, month labels for detail heat map
    heat-map.ts           ← formatCalendarMonthHeading ("March 2nd" logs header); formatMonthRangeForWeeks (legacy/helper)
    stats.ts              ← Streaks, consistency, totals
    id.ts                 ← Client UUID helper
  hooks/
    use-logs-store.ts     ← CRUD, archive, notes updates, toggle entry; Supabase or localStorage
    use-theme.ts          ← data-theme on <html>, meta theme-color from computed --color-bg
    use-pwa-viewport-bottom-bleed.ts ← Standalone only: zeros --pwa-bottom-extra (Safari-only gap math)
  components/
    bottom-nav/           ← Tab row (fixed chrome is .app-bottom-shell in App.css — see iOS PWA shell below)
    fab-menu/             ← FAB + sheet (new log / quick log today)
    heat-map/             ← HeatMap: card (current month) vs detail (calendar year columns)
    modal/                ← Sheet mobile / centered desktop
    log-icon/             ← Colored tile + symbol
    splash/               ← Boot splash (shown while Supabase loads + minimum display time)
  screens/
    logs/                 ← LogsScreen (2-column cards), LogDetailScreen (year heat map + stats + notes)
    add-log/              ← AddLogModal
    quick-log/            ← QuickLogModal
    stats/                ← StatsScreen (charts)
    calendar/             ← CalendarScreen (tap day → detail panel; auto-selects today in current month)
    settings/             ← SettingsScreen; ArchivedLogsScreen (restore / permanent delete)
```

### Data model

```typescript
interface Log {
  id: string;
  name: string;
  icon: string;                       // Material Symbol name
  color: string;                     // Hex (from LOG_COLORS or custom picker flow)
  entries: Record<string, boolean>; // "YYYY-MM-DD" → true when logged
  createdAt: string;                  // ISO
  archived: boolean;
  notes: string;                      // Detail-screen memo (persisted)
}
```

### Navigation (`NavScreen`)

```typescript
type NavScreen =
  | { tab: 'logs'; view: 'list' }
  | { tab: 'logs'; view: 'detail'; logId: string }
  | { tab: 'stats' | 'calendar'; view: 'main' }
  | { tab: 'settings'; view: 'main' | 'archived' };
```

- Opening a log sets `{ tab: 'logs', view: 'detail', logId }`; **`ArchivedLogsScreen`** uses `{ tab: 'settings', view: 'archived' }`. Both render in the main slot as **`app-route--detail`** (slide-in from the right when motion is allowed).
- Invalid/missing `logId` resets to list (guard in `App.tsx`).
- **Boot:** **`SplashScreen`** until a minimum elapsed time passes and (when using Supabase) logs finish loading; **`refetch`** retry UI if load fails.

### Theming

- `data-theme="dark" | "light"` on `<html>` selects token sets in `tokens.css`.
- **Rule:** Prefer CSS variables in `.css` files; `theme.ts` hex array is for the **color picker** and log persistence only.
- Meta `theme-color` follows computed **`--color-bg`** after theme apply (`use-theme.ts`).

### Heat maps (shared tokens)

Defined in `tokens.css`: `--heat-square-gap`, `--heat-square-radius`, `--heat-cell-size`. Card (logs list) and detail (log detail) use the **same** visual tokens; **`SplashScreen`** tiles reuse **`--heat-square-radius`** / heat colors for a consistent look. Detail scrolls **week columns** for a **calendar year** (`getWeeksForCalendarYear`), optional **year `<select>`**, scroll starts at **January**. Month labels omit stray **Dec** before Jan 1 (`monthLabelForWeekColumnInDetailYear`).

---

## Current state

| Done | Notes |
|------|--------|
| Logs list | Two-column grid (collapses to one column on narrow viewports); full-card `<button>`; month beside “Your Logs” (`ordinalDayLabel` / `formatCalendarMonthHeading`); streak line between header and mini heat map |
| Log detail | Calendar-year heat map, year picker when multiple years, stats pills; **notes** textarea (blur saves via **`updateLog`**); header **⋮** menu — **Archive** sets `archived: true` (hidden from main lists; stays in DB); **Delete** removes log row (entries cascade) |
| Archived logs | From Settings → **Archived logs**: full-screen list of archived logs; **Restore** (`archiveLog(id, false)`) returns log to active lists; **Delete** confirms then **`deleteLog`** (Supabase + local state) |
| Calendar | Month grid; **today auto-selected** when viewing current month; **green pill** = selected day; tap toggles selection; **detail panel** lists logs + swatches; **no** separate legend card |
| Stats / Settings / Add / Quick log | Settings: theme + archived entry point (count); add/quick flows as built |
| Dark/light | Persisted **`LOGD-theme`** |
| Supabase | Env-driven sync via **`useLogsStore`**; tables **`logs`** (incl. **`archived`**, **`notes`**) and **`log_entries`**; SQL **`supabase/schema.sql`** includes **`ALTER`** for adding **`notes`** on existing DBs |
| PWA / shell | `manifest.webmanifest`; **`display: standalone`**; bottom nav flush on iOS home-screen app (see **iOS PWA shell**); main tab titles use **`--screen-inset-*`** tokens |
| Icon picker | **`AVAILABLE_ICONS`** in `constants/icons.ts`; scroll grid in Add Log; new icons appended after originals |

---

## iOS PWA shell (bottom nav — do not regress)

The home-screen app bottom tab bar is **working and flush** with the physical bottom (no “chin” gap). Treat this as settled unless testing on a new iOS version.

**What fixed it (do not undo casually):**

| Piece | Role |
|-------|------|
| **`index.html`** | `viewport-fit=cover`; **`apple-mobile-web-app-status-bar-style` = `black`** (not `black-translucent` — that combo caused ~59px chin with percent heights). |
| **`src/index.css`** | `html`, `body`, `#root` use **`height: 100vh`** / **`min-height: 100vh`**, not **`height: 100%`**. |
| **`App.tsx`** | Bottom chrome **`createPortal(..., document.body)`** so `position: fixed` is viewport-relative. |
| **`App.css` `.app-bottom-shell`** | Full-bleed fixed shell; **`background: var(--color-surface)`** on outer + **`padding-bottom: env(safe-area-inset-bottom)`**; **`min-height`** = nav + safe area. |
| **`usePwaViewportBottomBleed`** | In **standalone**, sets **`--pwa-bottom-extra: 0`** (gap math is for in-Safari toolbar only). |

**Do not:** reintroduce `black-translucent`, stack `height: 100%` on `html`/`body`, nest fixed nav inside `.app` without portal, or put safe-area padding only on the inner bar without outer background.

Reference: [iOS PWA gotcha gist](https://gist.github.com/fozzedout/5e77925381991a9570151550992baf14).

---

## Main screen headings (top inset)

Tab screens (**Logs**, **Stats**, **Calendar**, **Settings**) pad once at the screen root:

- **`--screen-inset-top`**: `calc(var(--safe-top) + var(--space-3))` — not `space-6` (was too much air under the status bar in standalone).
- **`--screen-header-gap`**: space below the `h1` row before content.

Detail / archived routes already used tighter top padding; main tabs now share the same tokens in **`tokens.css`**.

---

## Common commands

```bash
npm run dev          # Dev server (default http://localhost:5173)
npm run build        # Production build → dist/ (uses `base: "/"` unless `VITE_BASE` is set)
npm run preview      # Serve dist/
npm run lint         # ESLint
npx tsc --noEmit     # Typecheck only
```

### Deploy to GitHub Pages

1. **Repo → Settings → Secrets and variables → Actions → New repository secret** — add exactly **`VITE_SUPABASE_URL`** and **`VITE_SUPABASE_ANON_KEY`** (same values as `.env.local`). The workflow **`deploy-github-pages.yml`** passes them into `npm run build`. Omit them only if you want the shipped build to stay **localStorage-only**.
2. **Pages:** Settings → Pages → Source: **GitHub Actions**.
3. Workflow builds with **`VITE_BASE=/<repo>/`** for project sites (`https://USER.github.io/REPO/`).

**Local build matching Pages:**

```powershell
$env:VITE_BASE="/YOUR_REPO/"; npm run build
```

### Supabase schema

Paste **`supabase/schema.sql`** into the Supabase **SQL Editor** and click **Run** once (or run only the `grant` / `alter … disable row level security` lines if tables already exist). Grants **`anon`** so the browser client works without Auth today — tighten when adding **`user_id`** + policies. **`logs.notes`** defaults to `''`; use the file’s **`ADD COLUMN IF NOT EXISTS notes`** if you created **`logs`** before notes existed.

---

## Gotchas

1. **No React Router** — all navigation is props + `App.tsx` state.
2. **`tokens.css`** owns visual tokens; don’t scatter hex/radius/spacing in components except `theme.ts` palette array and unavoidable SVG/assets.
3. **Persistence:** **`LOGD-logs`** / **`LOGD-theme`** in localStorage (offline mode); Supabase replaces log storage when env vars are set (legacy keys `logd-*` are **not** migrated automatically).
4. **npm package name** stays **`logd`** (lowercase; npm requirement); product name everywhere else is **LOGD**.
5. **Log detail crash guard:** `todayStr` must be defined in `LogDetailScreen` (uses `today()`).
6. **Heat map list cards:** invalid nested buttons were replaced by one outer `<button class="log-card">`.
7. **Calendar:** selection resets when changing month via nav; returning to **current month** re-selects **today**.
8. **Archive vs delete:** Archive keeps the row and entries in Supabase with **`archived = true`**; permanent delete removes the **`logs`** row (FK cascade removes **`log_entries`**).
9. **GitHub Pages:** Deployment uses **`VITE_BASE`** (`vite.config.ts`). Default local build uses **`/`**; CI sets **`/<repository-name>/`** for project sites.
10. **Guidelines:** Root **`GUIDELINES.md`**; **`.env.example`** documents `VITE_*` vars (no real secrets in git).
11. **iOS PWA bottom nav:** See **iOS PWA shell** above — avoid drive-by “fixes” to `index.html` status bar, root `height`, or `.app-bottom-shell`.
12. **PWA updates:** Delete home-screen icon → open live **`https://USER.github.io/REPO/`** in Safari → refresh → confirm in Safari → Add to Home Screen. New icons in picker are **below** the original set (scroll). Installed PWA cache is separate from Safari private tab.

- **CONTEXT.md** — update after meaningful features (this file).
- **Commits** — Conventional Commits (`feat`, `fix`, …) per `GUIDELINES.md`.
- **Sensitive areas** — Ask before changing auth, payments, migrations, CI/CD, or real `.env` contents.
