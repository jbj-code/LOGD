# CONTEXT.md — LOGD

## What it is

**LOGD** is a personal PWA for logging repeatable activities and tracking them over time. Today the core loop is **habit tracking**: each **Log** is a named activity with an icon, color, and **schedule** (daily, fixed weekdays, or interval rules). The user marks completions on calendar dates; the app shows **heat-map grids**, **streaks**, **consistency**, and a **month calendar** with per-day detail.

**Direction:** LOGD is evolving into a broader “log stuff” app — not only habits on a cadence. **Goal tracking** is planned next: set a goal with a loose timeline or due date, then log progress toward it (likely daily entries), separate from rhythm-based habit logs. Habit tracking (daily + interval schedules) ships today; goals are a future feature.

Built for **single-user** use (no accounts). **`useLogsStore`** persists to **Supabase** when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set; otherwise **localStorage** (`LOGD-logs`).

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
  lib/supabase.ts         ← Browser Supabase client (env-gated)
  styles/
    tokens.css            ← Source of truth: colors, spacing, radii, typography, heat-map tokens
    theme.ts              ← LOG_COLORS[] only (picker / persisted log hex values; brand greens excluded)
  types/index.ts          ← Log, LogSchedule, AppSettings, Tab, NavScreen
  constants/
    icons.ts              ← Allowed Material Symbol names for log icons
    schedule.ts           ← Weekday order/labels, interval picker options, buildScheduleFromIntervalRules()
  utils/
    date.ts               ← Dates, month grids, calendar-year week columns for detail heat map
    heat-map.ts           ← Month headings for logs header / detail
    schedule.ts           ← Cadences, due-day checks, streak/consistency helpers, formatScheduleSubtitle
    schedule-preview.ts   ← Shared heat-map cell classes for add-log previews
    stats.ts              ← Streaks (per cadence), consistency, totals
    id.ts                 ← Client UUID helper
  hooks/
    use-logs-store.ts     ← CRUD, archive, notes updates, toggle entry; Supabase or localStorage
    use-theme.ts          ← data-theme on <html>, meta theme-color from computed --color-bg
    use-pwa-viewport-bottom-bleed.ts ← Standalone only: zeros --pwa-bottom-extra (Safari-only gap math)
  components/
    bottom-nav/           ← Tab row (fixed chrome is .app-bottom-shell in App.css — see iOS PWA shell below)
    fab-menu/             ← FAB + sheet (new log / quick log today)
    heat-map/             ← HeatMap: card (current month) vs detail (calendar year columns)
    add-log-schedule-preview/
      AddLogScheduleMonthCarousel.tsx  ← Swipeable 12-month preview on add-log frequency step
      AddLogScheduleYearPreview.tsx    ← 3×4 mini calendars on add-log review step
    modal/                ← Sheet mobile / centered desktop
    log-icon/             ← Colored tile + symbol
    splash/               ← Boot splash (shown while Supabase loads + minimum display time)
  screens/
    logs/                 ← LogsScreen (2-column cards), LogDetailScreen (year heat map + stats + notes)
    add-log/              ← AddLogModal — 3-step wizard (details → frequency → review)
    quick-log/            ← QuickLogModal
    stats/                ← StatsScreen (charts)
    calendar/             ← CalendarScreen (tap day → detail panel; auto-selects today in current month)
    settings/             ← SettingsScreen; ArchivedLogsScreen (restore / permanent delete)
```

### Data model

```typescript
type LogSchedule = {
  cadence: 'daily' | 'weekly' | 'monthly' | 'interval';
  weekdays: number[];              // Date#getDay(): Sun = 0 … Sat = 6
  strideWeeks?: number;            // weekly — every N Mon–Sun bands from creation week (legacy biweekly → 2)
  timesPerWeek?: number;           // flexible weekly quota (any N days in the week)
  intervalDays?: number;         // every N calendar days from creation (legacy interval cadence)
  monthlyOccurrences?: { ordinal: 1 | 2 | 3 | 4 | -1; weekday: number }[];
  recurrenceRules?: RecurrenceRule[];  // interval picker — multiple weekly/monthly rows
};

interface Log {
  id: string;
  name: string;
  icon: string;
  color: string;
  entries: Record<string, boolean>;
  createdAt: string;
  archived: boolean;
  notes: string;
  schedule: LogSchedule; // Supabase schedule_json; localStorage merges missing → daily
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
- **Rule:** Prefer CSS variables in `.css` files; `theme.ts` hex array is for the **color picker** and log persistence only. Brand greens are **not** in the picker (`LOG_COLORS`).
- Meta `theme-color` follows computed **`--color-bg`** after theme apply (`use-theme.ts`).

### Heat maps (shared tokens)

Defined in `tokens.css`: `--heat-square-gap`, `--heat-square-radius`, `--heat-cell-size`, **`--color-heat-scheduled-ring`**, **`--color-heat-past-empty`**. Card (logs list) and detail (log detail) use the same square tokens and pass **`schedule` + createdAt** so non-daily rhythms show a ring on due cells. Add-log previews reuse **`HeatMap.css`** card classes via **`schedulePreviewHeatCellClassName`**.

---

## Current state

| Done | Notes |
|------|--------|
| Logs list | Two-column grid; card `<button>`; month beside “Your Logs”; mini heat map with **planned-day ring** when repeat isn’t daily; streak wording **check-ins** vs **days** |
| Log detail | Full-year scrollable heat map; **`formatScheduleSubtitle`** under title; stats use scheduled streak/longest/consistency; notes + ⋮ Archive/Delete |
| **Add log (3-step wizard)** | **Step 1:** icon, name, color (swipe strip; green selection ring; no brand greens in palette) → **Next**. **Step 2 — Frequency:** tabs **Daily / Weekly / Interval** + swipeable **month carousel** (same heat-map layout as list; dot indicators; scrolls to current month on tab change). **Weekly:** Mon–Sun pills (can deselect all; Next disabled until ≥1 day). **Interval:** inline dropdowns (every week / other week / 3–4 weeks / month + weekday); multiple rules; duplicates blocked; “Add another” when combos remain. **Step 3 — Review:** summary + **3×4 mini year grid** (12 month calendars) → **Create Log**. Footer sticky; back arrow steps 2–3 |
| Schedule engine | **`utils/schedule.ts`** + **`constants/schedule.ts`**; legacy **`biweekly`**, **`monthly`**, **`intervalDays`** still load; interval UI writes **`recurrenceRules`** |
| Archived logs | Restore preserves **`schedule_json`** |
| Calendar | Month grid; **today auto-selected** in current month; green pill = selected day; detail panel lists logs + swatches |
| Stats / Settings / Quick log | As built |
| Dark/light | Persisted **`LOGD-theme`** |
| Supabase | Env-driven sync; **`logs`** (`archived`, `notes`, **`schedule_json`**) + **`log_entries`**; **`supabase/schema.sql`** |
| PWA / shell | `manifest.webmanifest`; **`display: standalone`**; iOS bottom nav flush (see below) |
| Icon picker | **`AVAILABLE_ICONS`**; scroll grid in Add Log |

### Planned (not built)

| Feature | Intent |
|---------|--------|
| **Goal tracking** | Goals with a loose timeline or due date; log progress toward them (likely daily), distinct from cadence-based habit logs. Extends LOGD beyond “did I do the thing on schedule?” toward “am I making progress on something?” |

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

## Main tab screen headers

Tab screens use **`screen-page`** (`src/styles/screen-page.css`) — same layout and top padding as **Log detail** / **Archived logs**:

- **`--shell-header-pad-*`** in `tokens.css` → `calc(safe-top + space-3)` / `space-4` / `space-3` (do not use a separate `max()` top inset).
- **`screen-page__header`** fixed; **`screen-page__scroll`** scrolls only.

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

Paste **`supabase/schema.sql`** into the Supabase **SQL Editor** and click **Run** once (or run only the `grant` / `alter … disable row level security` lines if tables already exist). Grants **`anon`** so the browser client works without Auth today — tighten when adding **`user_id`** + policies. **`logs.notes`** defaults to `''`; **`schedule_json`** defaults daily — use **`ADD COLUMN IF NOT EXISTS`** variants if you created **`logs`** before those columns existed.

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
13. **Add-log preview anchor:** `previewCreatedAtIso` is captured when leaving step 1 so stride/week bands match post-create behavior.
14. **Weekly pills at zero days:** Preview shows no accent fills; **Next** stays disabled until at least one weekday is selected.

- **CONTEXT.md** — update after meaningful features (this file).
- **Commits** — Conventional Commits (`feat`, `fix`, …) per `GUIDELINES.md`.
- **Sensitive areas** — Ask before changing auth, payments, migrations, CI/CD, or real `.env` contents.
