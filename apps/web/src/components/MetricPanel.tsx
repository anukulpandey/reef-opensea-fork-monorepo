type MetricPanelProps = {
  label: string;
  value: string;
};

export default function MetricPanel({ label, value }: MetricPanelProps) {
  return (
    <article className="metricPanel">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
