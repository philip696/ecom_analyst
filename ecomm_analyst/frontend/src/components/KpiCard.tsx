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
  const valueStr = String(value);

  return (
    <div
      onClick={onClick}
      className={clsx(
        "card relative flex h-full min-h-[9.5rem] w-full flex-col overflow-hidden !p-3 transition-all duration-200",
        onClick && "cursor-pointer hover:shadow-md hover:-translate-y-0.5",
        active && "ring-2 ring-brand-500 shadow-md -translate-y-0.5"
      )}
    >
      <div
        className={clsx(
          "pointer-events-none absolute right-2.5 top-2.5 z-[1] flex size-10 shrink-0 items-center justify-center rounded-lg shadow-sm",
          iconColor
        )}
        aria-hidden
      >
        <Icon className="size-5 shrink-0 text-white" strokeWidth={2} />
      </div>

      <p className="shrink-0 pr-12 text-center text-xs font-medium uppercase leading-snug tracking-wide text-slate-400 break-words">
        {title}
      </p>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-1 overflow-y-auto overflow-x-hidden px-1 pb-1 pr-12 text-center">
        <p
          className="max-w-full break-words text-center text-xl font-bold leading-snug tracking-tight text-slate-800 sm:text-2xl"
          title={valueStr}
        >
          {value}
        </p>
        {subtitle && (
          <p className="max-w-full break-words text-xs leading-snug text-slate-400">{subtitle}</p>
        )}
        {trend && (
          <div
            className={clsx(
              "max-w-full break-words text-xs font-medium leading-snug",
              trend.value >= 0 ? "text-emerald-500" : "text-red-500"
            )}
            title={`${trend.value >= 0 ? "▲" : "▼"} ${Math.abs(trend.value)}% ${trend.label}`}
          >
            {trend.value >= 0 ? "▲" : "▼"} {Math.abs(trend.value)}% {trend.label}
          </div>
        )}
        {onClick && (
          <p
            className={clsx(
              "max-w-full break-words text-xs leading-snug",
              active ? "font-medium text-brand-500" : "text-slate-300"
            )}
          >
            {active ? "▲ showing details below" : "Click to view details"}
          </p>
        )}
      </div>
    </div>
  );
}
