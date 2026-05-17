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
  App.tsx / App.css       ← Shell: bottom nav, main slot, logs FAB, modals, detail overlay
  main.tsx / index.css    ← Entry; global resets; `.visually-hidden`
  lib/supabase.ts        ← Browser Supabase client (env-gated)
  styles/
    tokens.css            ← Source of truth: colors, spacing, radii, typography, heat-map tokens
    theme.ts              ← LOG_COLORS[] only (picker / logic hex values)
  types/index.ts          ← Log, AppSettings, Tab, NavScreen
  constants/icons.ts      ← Allowed Material Symbol names for log icons
  utils/
    date.ts               ← Dates, month grids, getWeeksForCalendarYear, month labels for detail heat map
    heat-map.ts           ← formatCalendarMonthHeading (logs header); formatMonthRangeForWeeks (legacy/helper)
    stats.ts              ← Streaks, consistency, totals
    id.ts                 ← Client UUID helper
  hooks/
    use-logs-store.ts     ← CRUD, archive, toggle entry; Supabase or localStorage
    use-theme.ts          ← data-theme on <html>, meta theme-color from computed --color-bg
  components/
    bottom-nav/           ← Four tabs
    fab-menu/             ← FAB + sheet (new log / quick log today)
    heat-map/             ← HeatMap: card (current month) vs detail (calendar year columns)
    modal/                ← Sheet mobile / centered desktop
    log-icon/             ← Colored tile + symbol
  screens/
    logs/                 ← LogsScreen (2-column cards), LogDetailScreen (year heat map + stats)
    add-log/              ← AddLogModal
    quick-log/            ← QuickLogModal
    stats/                ← StatsScreen (charts)
    calendar/             ← CalendarScreen (tap day → detail panel; auto-selects today in current month)
    settings/             ← Theme, archived count hint
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
}
```

### Navigation (`NavScreen`)

```typescript
type NavScreen =
  | { tab: 'logs'; view: 'list' }
  | { tab: 'logs'; view: 'detail'; logId: string }
  | { tab: 'stats' | 'calendar' | 'settings'; view: 'main' };
```

- Opening a log sets `{ tab: 'logs', view: 'detail', logId }` and replaces main content with `LogDetailScreen`.
- Invalid/missing `logId` resets to list (guard in `App.tsx`).
- **No route transition animations** (instant swap).

### Theming

- `data-theme="dark" | "light"` on `<html>` selects token sets in `tokens.css`.
- **Rule:** Prefer CSS variables in `.css` files; `theme.ts` hex array is for the **color picker** and log persistence only.
- Meta `theme-color` follows computed **`--color-bg`** after theme apply (`use-theme.ts`).

### Heat maps (shared tokens)

Defined in `tokens.css`: `--heat-square-gap`, `--heat-square-radius`, `--heat-cell-size`. Card (logs list) and detail (log detail) use the **same** visual tokens; detail scrolls **week columns** for a **calendar year** (`getWeeksForCalendarYear`), optional **year `<select>`**, scroll starts at **January**. Month labels omit stray **Dec** before Jan 1 (`monthLabelForWeekColumnInDetailYear`).

---

## Current state

| Done | Notes |
|------|--------|
| Logs list | Two-column grid (collapses to one column on narrow viewports); full-card `<button>`; month beside “Your Logs”; streak line between header and mini heat map |
| Log detail | Calendar-year heat map, year picker when multiple years, stats pills, archive/delete menu |
| Calendar | Month grid; **today auto-selected** when viewing current month; **green pill** = selected day; tap toggles selection; **detail panel** lists logs + swatches; **no** separate legend card |
| Stats / Settings / Add / Quick log | As built |
| Dark/light | Persisted **`LOGD-theme`** |
| Supabase | Env-driven sync via `useLogsStore`; tables **`logs`**, **`log_entries`**; SQL seed **`supabase/schema.sql`** |
| PWA | `manifest.webmanifest`; **`LOGD`** install name; logo **`LOGD_logo.png`** |

| Planned | |
|---------|--|
| Auth + RLS per user | |
| Push reminders | |
| Extra PWA icon sizes | If store validation complains |

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

Paste **`supabase/schema.sql`** into the Supabase **SQL Editor** and click **Run** once (or run only the `grant` / `alter … disable row level security` lines if tables already exist). Grants **`anon`** so the browser client works without Auth today — tighten when adding **`user_id`** + policies.

---

## Gotchas

1. **No React Router** — all navigation is props + `App.tsx` state.
2. **`tokens.css`** owns visual tokens; don’t scatter hex/radius/spacing in components except `theme.ts` palette array and unavoidable SVG/assets.
3. **Persistence:** **`LOGD-logs`** / **`LOGD-theme`** in localStorage (offline mode); Supabase replaces log storage when env vars are set (legacy keys `logd-*` are **not** migrated automatically).
4. **npm package name** stays **`logd`** (lowercase; npm requirement); product name everywhere else is **LOGD**.
5. **Log detail crash guard:** `todayStr` must be defined in `LogDetailScreen` (uses `today()`).
6. **Heat map list cards:** invalid nested buttons were replaced by one outer `<button class="log-card">`.
7. **Calendar:** selection resets when changing month via nav; returning to **current month** re-selects **today**.
8. **GitHub Pages:** Deployment uses **`VITE_BASE`** (`vite.config.ts`). Default local build uses **`/`**; CI sets **`/<repository-name>/`** for project sites.
9. **Guidelines:** Root **`GUIDELINES.md`**; **`.env.example`** documents `VITE_*` vars (no real secrets in git).

- **CONTEXT.md** — update after meaningful features (this file).
- **Commits** — Conventional Commits (`feat`, `fix`, …) per `GUIDELINES.md`.
- **Sensitive areas** — Ask before changing auth, payments, migrations, CI/CD, or real `.env` contents.
