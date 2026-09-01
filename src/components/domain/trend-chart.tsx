"use client";

import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatPence } from "@/domain/money";

export interface TrendSeries {
  key: string;
  name: string;
  /** any CSS colour, including var(--token) */
  color: string;
  dashed?: boolean;
  width?: number;
}

export interface TrendChartProps {
  data: Array<Record<string, number | string>>;
  xKey: string;
  series: TrendSeries[];
  height?: number;
  showLegend?: boolean;
  /** bar draws solid series as columns; dashed series stay lines (e.g. a budget line over spending bars) */
  variant?: "line" | "bar";
}

function tick(v: number): string {
  const pounds = v / 100;
  if (Math.abs(pounds) >= 1000) return `£${Math.round(pounds / 1000)}k`;
  return `£${Math.round(pounds)}`;
}

/** Line (or bar) chart on the token palette. Values in pence. */
export function TrendChart({ data, xKey, series, height = 260, showLegend = true, variant = "line" }: TrendChartProps) {
  return (
    <div style={{ height }} className="w-full text-[11.5px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--hairline)" vertical={false} />
          <XAxis
            dataKey={xKey}
            tickLine={false}
            axisLine={{ stroke: "var(--hairline)" }}
            tick={{ fill: "var(--ink-muted)" }}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            tickFormatter={tick}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--ink-muted)" }}
            width={44}
          />
          <Tooltip
            formatter={(value) => formatPence(Number(value), { style: "whole" })}
            contentStyle={{
              borderRadius: 10,
              background: "var(--surface)",
              color: "var(--ink)",
              border: "1px solid var(--hairline)",
              boxShadow: "0 8px 24px rgb(27 42 68 / 0.08)",
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--ink-muted)", marginBottom: 4 }}
            cursor={{ stroke: "var(--hairline)" }}
          />
          {showLegend ? <Legend iconType="plainline" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} /> : null}
          {series.map((s) =>
            variant === "bar" && !s.dashed ? (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.name}
                fill={s.color}
                radius={[3, 3, 0, 0]}
                maxBarSize={28}
                isAnimationActive={false}
              />
            ) : (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={s.color}
                strokeWidth={s.width ?? 1.75}
                strokeDasharray={s.dashed ? "4 4" : undefined}
                dot={false}
                activeDot={{ r: 3 }}
                isAnimationActive={false}
              />
            ),
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export interface BreakdownSlice {
  name: string;
  value: number;
  color: string;
}

/** Donut for share-of-total breakdowns. Values in pence; the caller renders its own legend. */
export function BreakdownPie({ data, height = 240 }: { data: BreakdownSlice[]; height?: number }) {
  return (
    <div style={{ height }} className="w-full text-[11.5px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip
            formatter={(value, name) => [formatPence(Number(value), { style: "whole" }), String(name)]}
            contentStyle={{
              borderRadius: 10,
              background: "var(--surface)",
              color: "var(--ink)",
              border: "1px solid var(--hairline)",
              boxShadow: "0 8px 24px rgb(27 42 68 / 0.08)",
              fontSize: 12,
            }}
          />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="55%"
            outerRadius="85%"
            paddingAngle={2}
            strokeWidth={0}
            isAnimationActive={false}
          >
            {data.map((slice) => (
              <Cell key={slice.name} fill={slice.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
