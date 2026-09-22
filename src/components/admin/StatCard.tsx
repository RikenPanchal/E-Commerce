interface StatCardProps {
  label: string;
  value: number | string;
  description?: string;
}

export function StatCard({ label, value, description }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-black/5 bg-black/[.02] p-6 dark:border-white/10 dark:bg-white/[.03]">
      <span className="text-sm text-foreground/60">{label}</span>
      <div className="mt-2 text-3xl font-semibold text-foreground">{value}</div>
      {description ? <p className="mt-1 text-xs text-foreground/50">{description}</p> : null}
    </div>
  );
}
