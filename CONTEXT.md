# CONTEXT.md — Logd

## What it is

Logd is a personal PWA habit tracker. Each **Log** is a yes/no daily activity (e.g. Gym, Stretching). The user marks completion per day; the app shows **heat-map-style** grids, **streaks**, **consistency**, and a **month calendar** with per-day detail.

Built for **single-user** use (no accounts). Data persists in **localStorage**; **Supabase** is planned later — keep the store boundary (`useLogsStore`) clean for swapping backends.

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | React 19 + TypeScript (Vite 8) |
| PWA | `vite-plugin-pwa` (Workbox) |
| Styling | Plain CSS + **`src/styles/tokens.css`** (CSS custom properties for dark/light) |
| Icons | Google Material Symbols Rounded (CDN in `index.html`) |
| Font | System stack (`tokens.css` `--font-family`) |
| Data | `useLogsStore` → localStorage key `logd-logs` |
| Routing | **No router** — `NavScreen` state + callbacks in `App.tsx` |

---

## Architecture

### Folder layout

```
src/
  App.tsx / App.css       ← Shell: bottom nav, main slot, logs FAB, modals, detail overlay
  main.tsx / index.css    ← Entry; global resets; `.visually-hidden`
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
    use-logs-store.ts     ← CRUD, archive, toggle entry, persist logs
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
- Invalid/missing `logId` resets to list (guard `useEffect` in `App.tsx`).
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
| Dark/light | Persisted `logd-theme` |
| PWA | vite-plugin-pwa; PNG icons for install may still be incomplete |

| Planned | |
|---------|--|
| Supabase sync | Replace / augment `useLogsStore` |
| Push reminders | |
| Full PWA icon set | 192×192, 512×512 PNGs if needed |

---

## Common commands

```bash
npm run dev          # Dev server (default http://localhost:5173)
npm run build        # Production build → dist/ (uses `base: "/"` unless `VITE_BASE` is set)
npm run preview      # Serve dist/
npx tsc --noEmit     # Typecheck only
```

### Deploy to GitHub Pages

1. **Create an empty repo on GitHub** (e.g. `Logd`) — no README/license if you’ll push an existing tree.
2. **Git init & push** (from project root):

   ```bash
   git init
   git branch -M main
   git add .
   git commit -m "chore: initial commit"
   git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
   git push -u origin main
   ```

3. **Enable Pages:** Repo → **Settings** → **Pages** → **Build and deployment** → Source: **GitHub Actions**.
4. The workflow **`.github/workflows/deploy-github-pages.yml`** builds with `VITE_BASE=/<repo>/` so asset URLs match `https://YOUR_USER.github.io/YOUR_REPO/`.
5. After the first successful run, open that URL and install the PWA from the browser menu.

**Root site (`username.github.io`):** If the repo is your special user site, Pages URL is `https://USER.github.io/` with **`base: '/'`**. Edit the workflow Build step: remove or set `VITE_BASE: /` (do **not** use `/${{ github.event.repository.name }}/`).

**Local build matching Pages:**

```powershell
$env:VITE_BASE="/YOUR_REPO/"; npm run build
```

---

## Gotchas

1. **No React Router** — all navigation is props + `App.tsx` state.
2. **`tokens.css`** owns visual tokens; don’t scatter hex/radius/spacing in components except `theme.ts` palette array and unavoidable SVG/assets.
3. **localStorage:** `logd-logs` (logs JSON), `logd-theme` (`dark` | `light`).
4. **Log detail crash guard:** `todayStr` must be defined in `LogDetailScreen` (uses `today()`).
5. **Heat map list cards:** invalid nested buttons were replaced by one outer `<button class="log-card">`.
6. **Calendar:** selection state resets when changing month; returning to **current month** re-selects **today**.
7. **GitHub Pages:** Deployment uses **`VITE_BASE`** (`vite.config.ts`). Default local build uses **`/`**; CI sets **`/<repository-name>/`** for project sites.
8. **Guidelines:** See root `GUIDELINES.md`; `.env.example` documents future `VITE_*` vars (no secrets committed).

- **CONTEXT.md** — update after meaningful features (this file).
- **Commits** — Conventional Commits (`feat`, `fix`, …) per `GUIDELINES.md`.
- **Sensitive areas** — Ask before changing auth, payments, migrations, CI/CD, or real `.env` contents.
