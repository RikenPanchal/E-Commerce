interface StatCardProps {
  label: string;
  value: number | string;
  description?: string;
}

export function StatCard({ label, value, description }: StatCardProps) {
  return (
    <div className="min-w-0 rounded-2xl border border-black/5 bg-black/[.02] p-4 sm:p-6 dark:border-white/10 dark:bg-white/[.03]">
      <span className="text-sm text-foreground/60">{label}</span>
      <div className="mt-2 text-xl font-semibold break-words text-foreground sm:text-3xl">{value}</div>
      {description ? <p className="mt-1 text-xs text-foreground/50">{description}</p> : null}
    </div>
  );
}
