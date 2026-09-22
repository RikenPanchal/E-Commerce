"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils/currency";
import type { RevenuePoint } from "@/lib/admin/analytics";

const VIEW_WIDTH = 600;
const VIEW_HEIGHT = 220;
const PADDING = { top: 16, right: 8, bottom: 24, left: 8 };

const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const innerWidth = VIEW_WIDTH - PADDING.left - PADDING.right;
  const innerHeight = VIEW_HEIGHT - PADDING.top - PADDING.bottom;
  const maxRevenue = Math.max(...data.map((point) => point.revenue), 1);
  const totalRevenue = data.reduce((sum, point) => sum + point.revenue, 0);

  const points = data.map((point, index) => ({
    ...point,
    x: PADDING.left + (index / Math.max(data.length - 1, 1)) * innerWidth,
    y: PADDING.top + innerHeight - (point.revenue / maxRevenue) * innerHeight,
  }));

  const baselineY = PADDING.top + innerHeight;
  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ");
  const areaPath =
    points.length > 0
      ? `${linePath} L${points[points.length - 1].x},${baselineY} L${points[0].x},${baselineY} Z`
      : "";

  const bandWidth = innerWidth / Math.max(data.length, 1);
  const hovered = hoverIndex !== null ? points[hoverIndex] : null;
  const labelIndexes = [0, Math.floor((points.length - 1) / 2), points.length - 1];

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-foreground/60">
        Total revenue, last {data.length} days:{" "}
        <span className="font-medium text-foreground">{formatCurrency(totalRevenue)}</span>
      </p>

      <div className="relative aspect-[600/220] w-full">
        <svg
          viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-label={`Daily revenue over the last ${data.length} days, totaling ${formatCurrency(totalRevenue)}`}
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
              <text
                key={index}
                x={point.x}
                y={VIEW_HEIGHT - 6}
                textAnchor={anchor}
                className="fill-foreground/50 text-[10px]"
              >
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
            <div className="text-foreground/70">{formatCurrency(hovered.revenue)}</div>
            <div className="text-foreground/50">
              {hovered.orders} order{hovered.orders === 1 ? "" : "s"}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
