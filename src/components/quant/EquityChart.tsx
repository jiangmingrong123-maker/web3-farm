"use client";

type Point = { time: number; equity: number };

export function EquityChart({ data, height = 120 }: { data: Point[]; height?: number }) {
  if (data.length < 2) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed border-white/10 text-xs text-white/35"
        style={{ height }}
      >
        —
      </div>
    );
  }

  const w = 100;
  const min = Math.min(...data.map((d) => d.equity));
  const max = Math.max(...data.map((d) => d.equity));
  const span = max - min || 1;

  const pts = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = height - ((d.equity - min) / span) * (height - 8) - 4;
      return `${x},${y}`;
    })
    .join(" ");

  const last = data[data.length - 1]!;
  const first = data[0]!;
  const up = last.equity >= first.equity;

  return (
    <svg
      viewBox={`0 0 ${w} ${height}`}
      className="w-full rounded-lg border border-white/10 bg-black/30"
      style={{ height }}
      preserveAspectRatio="none"
    >
      <polyline
        fill="none"
        stroke={up ? "#34d399" : "#f87171"}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
        points={pts}
      />
    </svg>
  );
}
