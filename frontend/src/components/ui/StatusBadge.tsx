import { Badge } from "@/components/ui/Badge";

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  if (status === "active") return <Badge tone="success" className={className}>● Aktivt</Badge>;
  if (status === "paused") return <Badge tone="warning" className={className}>⏸ Pausat</Badge>;
  if (status === "completed") return <Badge className={className}>Avslutat</Badge>;
  return <Badge className={className}>{status}</Badge>;
}
