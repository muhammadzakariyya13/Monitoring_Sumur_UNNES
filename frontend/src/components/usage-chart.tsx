"use client";
import { useUiCopy } from "./use-ui-copy";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
export function UsageChart({
  data,
}: {
  data: { label: string; volume: number }[];
}) {
  const { uiText, locale } = useUiCopy();
  if (!data.length)
    return <div className="empty">{uiText("Belum ada data pada rentang ini.")}</div>;
  return (
    <div
      className="chart"
      role="img"
      aria-label={uiText("Grafik volume penggunaan dalam meter kubik. Nilai rinci tersedia pada tabel riwayat.")}
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <AreaChart
          data={data}
          margin={{ top: 15, right: 12, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="waterFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#147fa9" stopOpacity={0.12} />
              <stop offset="100%" stopColor="#1684b2" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 7"
            vertical={false}
            stroke="var(--ui-border)"
          />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            minTickGap={24}
            tick={{ fontSize: 11, fill: "var(--ui-muted)" }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--ui-muted)" }}
          />
          <Tooltip
            formatter={(value) => [
              `${Number(value).toLocaleString(locale)} m³`,
              "Volume",
            ]}
            contentStyle={{ borderRadius: 12, borderColor: "var(--ui-border)", backgroundColor: "var(--ui-elevated)", color: "var(--ui-text)" }}
          />
          <Area
            type="monotone"
            dataKey="volume"
            stroke="#1483b0"
            strokeWidth={3}
            fill="url(#waterFill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
