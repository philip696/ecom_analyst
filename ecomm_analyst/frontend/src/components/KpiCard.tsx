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
        "card relative flex aspect-square w-full min-h-0 flex-col overflow-hidden !p-3 transition-all duration-200",
        onClick && "cursor-pointer hover:shadow-md hover:-translate-y-0.5",
        active && "ring-2 ring-brand-500 shadow-md -translate-y-0.5"
      )}
    >
      <div
        className={clsx(
          "pointer-events-none absolute right-2.5 top-2.5 z-[1] flex size-9 shrink-0 items-center justify-center rounded-lg shadow-sm",
          iconColor
        )}
        aria-hidden
      >
        <Icon className="size-[18px] shrink-0 text-white" strokeWidth={2} />
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 pb-1 pr-11 text-center">
        <p className="line-clamp-2 max-w-full text-[10px] font-medium uppercase leading-tight tracking-wide text-slate-400">
          {title}
        </p>
        <p
          className="line-clamp-3 max-w-full break-words text-center text-lg font-bold leading-snug tracking-tight text-slate-800 sm:text-xl"
          title={valueStr}
        >
          {value}
        </p>
        {subtitle && (
          <p className="line-clamp-2 max-w-full text-[10px] leading-tight text-slate-400">{subtitle}</p>
        )}
        {trend && (
          <div
            className={clsx(
              "line-clamp-2 max-w-full text-[10px] font-medium leading-tight",
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
              "line-clamp-2 max-w-full text-[10px] leading-tight",
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
