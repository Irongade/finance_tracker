"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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
}

function tick(v: number): string {
  const pounds = v / 100;
  if (Math.abs(pounds) >= 1000) return `£${Math.round(pounds / 1000)}k`;
  return `£${Math.round(pounds)}`;
}

/** Line chart on the token palette. Values in pence. */
export function TrendChart({ data, xKey, series, height = 260, showLegend = true }: TrendChartProps) {
  return (
    <div style={{ height }} className="w-full text-[11.5px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
              border: "1px solid var(--hairline)",
              boxShadow: "0 8px 24px rgb(27 42 68 / 0.08)",
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--ink-muted)", marginBottom: 4 }}
            cursor={{ stroke: "var(--hairline)" }}
          />
          {showLegend ? <Legend iconType="plainline" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} /> : null}
          {series.map((s) => (
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
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
