interface BarChartSeries {
  label: string;
  value: number;
  color?: string;
}

interface BarChartGroup {
  label: string;
  bars: BarChartSeries[];
}

export default function BarChart({ groups, height = 180 }: { groups: BarChartGroup[]; height?: number }) {
  const max = Math.max(1, ...groups.flatMap((group) => group.bars.map((bar) => bar.value)));

  return (
    <div className="bar-chart" style={{ height }}>
      {groups.map((group) => (
        <div className="bar-chart-group" key={group.label}>
          <div className="bar-chart-bars">
            {group.bars.map((bar) => (
              <div
                key={bar.label}
                className="bar-chart-bar"
                title={`${bar.label}: ${bar.value}`}
                style={{
                  height: `${Math.max(2, (bar.value / max) * 100)}%`,
                  background: bar.color ?? "var(--accent)"
                }}
              />
            ))}
          </div>
          <span className="bar-chart-label">{group.label}</span>
        </div>
      ))}
    </div>
  );
}
