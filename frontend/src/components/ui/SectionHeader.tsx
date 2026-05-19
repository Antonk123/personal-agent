export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-2.5">
      <h2 className="text-[11px] uppercase tracking-[0.08em] text-fg-subtle font-mono font-medium">
        {title}
      </h2>
      {action}
    </div>
  );
}
