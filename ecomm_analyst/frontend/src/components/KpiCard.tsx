import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  trend?: { value: number; label: string };
  onClick?: () => void;
  active?: boolean;
}

export default function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "bg-brand-500",
  trend,
  onClick,
  active = false,
}: KpiCardProps) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        "card relative flex aspect-square w-full min-h-0 flex-col transition-all duration-200",
        onClick && "cursor-pointer hover:shadow-md hover:-translate-y-0.5",
        active && "ring-2 ring-brand-500 shadow-md -translate-y-0.5"
      )}
    >
      <div
        className={clsx(
          "pointer-events-none absolute right-4 top-4 z-[1] flex size-10 shrink-0 items-center justify-center rounded-xl shadow-sm",
          iconColor
        )}
        aria-hidden
      >
        <Icon className="size-5 shrink-0 text-white" strokeWidth={2} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1.5 overflow-y-auto px-3 py-4 pr-14 text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{title}</p>
        <p className="max-w-full break-words text-2xl font-bold leading-tight text-slate-800">{value}</p>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        {trend && (
          <div className={clsx("text-xs font-medium", trend.value >= 0 ? "text-emerald-500" : "text-red-500")}>
            {trend.value >= 0 ? "▲" : "▼"} {Math.abs(trend.value)}% {trend.label}
          </div>
        )}
        {onClick && (
          <p className={clsx("text-xs", active ? "font-medium text-brand-500" : "text-slate-300")}>
            {active ? "▲ showing details below" : "Click to view details"}
          </p>
        )}
      </div>
    </div>
  );
}
