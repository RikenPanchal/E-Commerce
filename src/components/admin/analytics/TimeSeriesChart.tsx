"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils/currency";

export interface TimeSeriesPoint {
  date: string; // YYYY-MM-DD
  value: number;
}

/**
 * A plain, serializable description of how to render a value - never a
 * function. This chart is a Client Component fed from a Server Component
 * page, and React Server Components cannot pass functions as props across
 * that boundary (only plain, serializable data), so formatting must be
 * expressed as data here and resolved internally.
 */
export type TimeSeriesFormat = "currency" | { unit: string };

function formatSeriesValue(value: number, format: TimeSeriesFormat): string {
  if (format === "currency") return formatCurrency(value);
  return `${value} ${format.unit}${value === 1 ? "" : "s"}`;
}

const VIEW_WIDTH = 600;
const VIEW_HEIGHT = 220;
const PADDING = { top: 16, right: 8, bottom: 24, left: 8 };

const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

/**
 * The one time-series line/area chart every "over time" section on the
 * analytics dashboard renders (Revenue, Orders, New customers) - same
 * geometry and interaction as the existing `RevenueChart` on `/admin`
 * (line/area on a fixed viewBox, hover crosshair + dot + tooltip, thin
 * recessive baseline), generalized to a plain `{date, value}` series and a
 * caller-supplied formatter so it isn't tied to currency. `RevenueChart`
 * itself is left untouched - this is a new, separate component so the
 * existing overview page can't regress.
 *
 * A single series never needs a legend (its own section heading already
 * names it) - the only accessibility surface it needs is the descriptive
 * `aria-label` on the chart and a visible numeric total above it, both
 * present here.
 */
export function TimeSeriesChart({
  data,
  seriesLabel,
  format,
}: {
  data: TimeSeriesPoint[];
  /** e.g. "Revenue", "Orders", "New customers" - used in the aria-label and tooltip. */
  seriesLabel: string;
  format: TimeSeriesFormat;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const formatValue = (value: number) => formatSeriesValue(value, format);

  const innerWidth = VIEW_WIDTH - PADDING.left - PADDING.right;
  const innerHeight = VIEW_HEIGHT - PADDING.top - PADDING.bottom;
  const maxValue = Math.max(...data.map((point) => point.value), 1);
  const total = data.reduce((sum, point) => sum + point.value, 0);

  const points = data.map((point, index) => ({
    ...point,
    x: PADDING.left + (index / Math.max(data.length - 1, 1)) * innerWidth,
    y: PADDING.top + innerHeight - (point.value / maxValue) * innerHeight,
  }));

  const baselineY = PADDING.top + innerHeight;
  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ");
  const areaPath =
    points.length > 0
      ? `${linePath} L${points[points.length - 1].x},${baselineY} L${points[0].x},${baselineY} Z`
      : "";

  const bandWidth = innerWidth / Math.max(data.length, 1);
  const hovered = hoverIndex !== null ? points[hoverIndex] : null;
  // A short range (e.g. "Today", a single point) can make these three
  // picks collide - de-duplicate so no two <text> labels share a key or
  // render stacked on top of each other.
  const labelIndexes = Array.from(new Set([0, Math.floor((points.length - 1) / 2), points.length - 1]));

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-foreground/60">
        Total {seriesLabel.toLowerCase()}: <span className="font-medium text-foreground">{formatValue(total)}</span>
      </p>

      <div className="relative aspect-[600/220] w-full">
        <svg
          viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-label={`${seriesLabel} over the selected period, totaling ${formatValue(total)}`}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <line
            x1={PADDING.left}
            y1={baselineY}
            x2={VIEW_WIDTH - PADDING.right}
            y2={baselineY}
            stroke="currentColor"
            className="text-black/10 dark:text-white/10"
            strokeWidth={1}
          />

          {areaPath ? <path d={areaPath} className="fill-rose-500/10" /> : null}
          {linePath ? (
            <path
              d={linePath}
              className="fill-none stroke-rose-600 dark:stroke-rose-400"
              strokeWidth={2}
              strokeLinejoin="round"
            />
          ) : null}

          {hovered ? (
            <>
              <line
                x1={hovered.x}
                y1={PADDING.top}
                x2={hovered.x}
                y2={baselineY}
                stroke="currentColor"
                className="text-black/20 dark:text-white/20"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <circle cx={hovered.x} cy={hovered.y} r={4} className="fill-rose-600 dark:fill-rose-400" />
            </>
          ) : null}

          {labelIndexes.map((index) => {
            const point = points[index];
            if (!point) return null;
            const anchor = index === 0 ? "start" : index === points.length - 1 ? "end" : "middle";
            return (
              <text key={index} x={point.x} y={VIEW_HEIGHT - 6} textAnchor={anchor} className="fill-foreground/50 text-[10px]">
                {dateFormatter.format(new Date(point.date))}
              </text>
            );
          })}

          {points.map((point, index) => (
            <rect
              key={point.date}
              x={PADDING.left + index * bandWidth}
              y={0}
              width={bandWidth}
              height={VIEW_HEIGHT}
              fill="transparent"
              onMouseEnter={() => setHoverIndex(index)}
            />
          ))}
        </svg>

        {hovered ? (
          <div
            className="pointer-events-none absolute top-1 -translate-x-1/2 rounded-md border border-black/10 bg-background px-3 py-1.5 text-xs shadow-sm dark:border-white/15"
            style={{ left: `${(hovered.x / VIEW_WIDTH) * 100}%` }}
          >
            <div className="font-medium text-foreground">{dateFormatter.format(new Date(hovered.date))}</div>
            <div className="text-foreground/70">{formatValue(hovered.value)}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
