interface LineSeries {
  label: string;
  color: string;
  values: number[];
}

export default function LineChart({
  series,
  xLabels,
  height = 220
}: {
  series: LineSeries[];
  xLabels: string[];
  height?: number;
}) {
  const width = 640;
  const padding = 24;
  const allValues = series.flatMap((entry) => entry.values);
  const max = Math.max(1, ...allValues);
  const min = Math.min(0, ...allValues);
  const range = max - min || 1;
  const count = Math.max(1, xLabels.length - 1);

  function pointFor(index: number, value: number): [number, number] {
    const x = padding + (index / count) * (width - padding * 2);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return [x, y];
  }

  return (
    <svg className="line-chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img">
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} className="line-chart-axis" />
      {series.map((entry) => (
        <polyline
          key={entry.label}
          className="line-chart-line"
          fill="none"
          stroke={entry.color}
          strokeWidth={2}
          points={entry.values.map((value, index) => pointFor(index, value).join(",")).join(" ")}
        />
      ))}
      {series.map((entry) =>
        entry.values.map((value, index) => {
          const [x, y] = pointFor(index, value);
          return <circle key={`${entry.label}-${index}`} cx={x} cy={y} r={3} fill={entry.color} />;
        })
      )}
    </svg>
  );
}
