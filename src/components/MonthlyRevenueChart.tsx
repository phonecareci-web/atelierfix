import React, { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CurrencyCode, RepairTicket } from '../types/repair';
import { formatCurrency, getCurrencySymbol } from '../lib/statusConfig';

interface MonthlyRevenueChartProps {
  tickets: RepairTicket[];
  currency: CurrencyCode;
  isDark?: boolean;
}

interface MonthlyPoint {
  monthKey: string;
  label: string;
  revenue: number;
  count: number;
}

function parseTicketClosedDate(ticket: RepairTicket): Date | null {
  const raw = ticket.updatedAt || ticket.createdAt;
  if (!raw) return null;
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed;

  const frMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (frMatch) {
    const [, dd, mm, yyyy] = frMatch;
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

export const MonthlyRevenueChart: React.FC<MonthlyRevenueChartProps> = ({
  tickets,
  currency,
  isDark = false,
}) => {
  const symbol = getCurrencySymbol(currency);

  const { series, totalClosedRevenue, totalClosedCount } = useMemo(() => {
    const closedTickets = tickets.filter((t) => t.status === 'Livré');
    const now = new Date();
    const monthsMap = new Map<string, MonthlyPoint>();

    for (let offset = 5; offset >= 0; offset--) {
      const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        '0'
      )}`;
      const shortMonth = new Intl.DateTimeFormat('fr-FR', {
        month: 'short',
      })
        .format(d)
        .replace('.', '');
      const label = `${shortMonth} ${String(d.getFullYear()).slice(-2)}`;
      monthsMap.set(key, { monthKey: key, label, revenue: 0, count: 0 });
    }

    let closedSum = 0;
    for (const t of closedTickets) {
      const amount = Number(t.estimatedCost) || 0;
      closedSum += amount;

      const d = parseTicketClosedDate(t);
      if (!d) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        '0'
      )}`;
      const bucket = monthsMap.get(key);
      if (bucket) {
        bucket.revenue += amount;
        bucket.count += 1;
      }
    }

    return {
      series: Array.from(monthsMap.values()),
      totalClosedRevenue: closedSum,
      totalClosedCount: closedTickets.length,
    };
  }, [tickets]);

  const strokeColor = isDark ? '#3B82F6' : '#1D4ED8';
  const gridColor = isDark ? '#1E293B' : '#E2E8F0';
  const tickColor = isDark ? '#94A3B8' : '#64748B';
  const cursorColor = isDark ? '#334155' : '#CBD5E1';

  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Revenus mensuels (tickets clôturés « Livré »)
          </p>
          <p className="mt-1 font-display text-xl font-bold text-slate-900 tabular-nums dark:text-slate-100">
            {formatCurrency(totalClosedRevenue, currency)}
          </p>
        </div>
        <span className="font-mono text-xs text-slate-500 tabular-nums dark:text-slate-400">
          {totalClosedCount} ticket(s) livré(s) · 6 derniers mois
        </span>
      </div>

      <div className="mt-3 h-[148px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={series}
            margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
          >
            <defs>
              <linearGradient id="revenueAreaFill" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={strokeColor}
                  stopOpacity={isDark ? 0.28 : 0.18}
                />
                <stop
                  offset="100%"
                  stopColor={strokeColor}
                  stopOpacity={0.01}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke={gridColor}
            />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: tickColor, fontSize: 11 }}
              dy={6}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: tickColor, fontSize: 11 }}
              tickFormatter={(val: number) => `${val} ${symbol}`}
              width={68}
            />
            <Tooltip
              cursor={{ stroke: cursorColor, strokeWidth: 1 }}
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const point = payload[0].payload as MonthlyPoint;
                return (
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {point.label}
                    </p>
                    <p className="mt-0.5 font-mono font-semibold text-blue-700 tabular-nums dark:text-blue-400">
                      {formatCurrency(point.revenue, currency)}
                    </p>
                    <p className="mt-0.5 text-slate-500 tabular-nums dark:text-slate-400">
                      {point.count} ticket(s) livré(s)
                    </p>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke={strokeColor}
              strokeWidth={2}
              fill="url(#revenueAreaFill)"
              activeDot={{
                r: 4,
                fill: strokeColor,
                stroke: isDark ? '#0F172A' : '#FFFFFF',
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {totalClosedCount === 0 && (
        <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
          Passez des réparations au statut « Livré » pour alimenter la courbe des revenus.
        </p>
      )}
    </div>
  );
};
