// src/screens/stats/StatsScreen.tsx
// Aggregate stats across all logs — consistency trend and daily totals bar chart.

import type { Log } from '../../types';
import { LogIcon } from '../../components/log-icon/LogIcon';
import { getConsistency, getTotalLogged, getDailyTotals, getWeeklyConsistency } from '../../utils/stats';
import './StatsScreen.css';

interface StatsScreenProps {
  logs: Log[];
}

export const StatsScreen = ({ logs }: StatsScreenProps) => {
  if (logs.length === 0) {
    return (
      <div className="stats-screen">
        <div className="stats-screen__header">
          <h1 className="stats-screen__title">Stats</h1>
        </div>
        <div className="stats-empty">
          <span className="material-symbols-rounded">bar_chart</span>
          <p>Add some logs to see your stats here.</p>
        </div>
      </div>
    );
  }

  // Overall consistency = average across all logs
  const avgConsistency = Math.round(
    logs.reduce((sum, log) => sum + getConsistency(log), 0) / logs.length,
  );
  const totalLogged = logs.reduce((sum, log) => sum + getTotalLogged(log), 0);

  // Bar chart: total log completions per day, last 28 days
  const dailyTotals = getDailyTotals(logs, 28);
  const maxDaily = Math.max(...dailyTotals, 1);

  // Line chart: weekly consistency for the combined logs, last 12 weeks
  const weeklyData = logs.length > 0
    ? Array.from({ length: 12 }, (_, wi) => {
        const perLog = logs.map((l) => getWeeklyConsistency(l, 12)[wi]);
        return Math.round(perLog.reduce((a, b) => a + b, 0) / perLog.length);
      })
    : [];

  return (
    <div className="stats-screen">
      <div className="stats-screen__header">
        <h1 className="stats-screen__title">Stats</h1>
      </div>

      <div className="stats-screen__body">
        {/* Consistency card */}
        <div className="stats-card">
          <div className="stats-card__meta">
            <span className="stats-card__label">Consistency</span>
            <span className="stats-card__value stats-card__value--green">{avgConsistency}%</span>
          </div>
          <LineChart data={weeklyData} color="var(--color-green)" />
        </div>

        {/* Total logged card */}
        <div className="stats-card">
          <div className="stats-card__meta">
            <span className="stats-card__label">Total Logged Days</span>
            <span className="stats-card__value">{totalLogged}</span>
          </div>
          <BarChart data={dailyTotals} color="var(--color-green)" maxValue={maxDaily} />
        </div>

        {/* Per-log breakdown */}
        <div className="stats-breakdown">
          <h2 className="stats-breakdown__title">Per Log</h2>
          {logs.map((log) => (
            <LogStatRow key={log.id} log={log} />
          ))}
        </div>
      </div>
    </div>
  );
};

/* ── Per-log stat row ──────────────────────────────────────── */
const LogStatRow = ({ log }: { log: Log }) => {
  const consistency = getConsistency(log);
  const total = getTotalLogged(log);

  return (
    <div className="log-stat-row">
      <div className="log-stat-row__lead">
        <LogIcon symbol={log.icon} color={log.color} size="sm" />
      </div>
      <div className="log-stat-row__info">
        <span className="log-stat-row__name">{log.name}</span>
        <span className="log-stat-row__count">{total} days logged</span>
      </div>
      <div className="log-stat-row__bar-wrap">
        <div
          className="log-stat-row__bar"
          style={{ width: `${consistency}%`, backgroundColor: log.color }}
        />
      </div>
      <span className="log-stat-row__pct" style={{ color: log.color }}>{consistency}%</span>
    </div>
  );
};

/* ── SVG Line Chart ────────────────────────────────────────── */
const LineChart = ({ data, color }: { data: number[]; color: string }) => {
  if (data.length < 2) return null;

  const W = 300;
  const H = 70;
  const PAD = 4;
  const max = Math.max(...data, 1);

  const pts = data
    .map((v, i) => {
      const x = PAD + (i / (data.length - 1)) * (W - 2 * PAD);
      const y = H - PAD - (v / max) * (H - 2 * PAD);
      return `${x},${y}`;
    })
    .join(' ');

  // Area fill path
  const firstX = PAD;
  const lastX = W - PAD;
  const areaPath =
    `M ${firstX},${H} ` +
    data
      .map((v, i) => {
        const x = PAD + (i / (data.length - 1)) * (W - 2 * PAD);
        const y = H - PAD - (v / max) * (H - 2 * PAD);
        return `L ${x},${y}`;
      })
      .join(' ') +
    ` L ${lastX},${H} Z`;

  return (
    <svg
      width="100%"
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="line-chart"
    >
      <defs>
        <linearGradient id="line-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#line-grad)" />
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={pts} />
    </svg>
  );
};

/* ── SVG Bar Chart ─────────────────────────────────────────── */
const BarChart = ({
  data,
  color,
  maxValue,
}: {
  data: number[];
  color: string;
  maxValue: number;
}) => {
  const W = 300;
  const H = 60;
  const n = data.length;
  const gap = 2;
  const barW = (W - (n - 1) * gap) / n;

  return (
    <svg
      width="100%"
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="bar-chart"
    >
      {data.map((v, i) => {
        const barH = Math.max(2, (v / maxValue) * (H - 4));
        const x = i * (barW + gap);
        const y = H - barH;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barW}
            height={barH}
            rx={2}
            fill={color}
            opacity={v === 0 ? 0.15 : 0.85}
          />
        );
      })}
    </svg>
  );
};
