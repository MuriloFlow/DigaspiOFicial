import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type MetricCardProps = {
  label: string;
  value: string;
  detail?: string;
  icon: LucideIcon;
  tone?: "dark" | "blue" | "green" | "amber";
};

const tones = {
  dark: "bg-zinc-950 text-white",
  blue: "bg-blue-50 text-blue-700",
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
};

export function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "dark",
}: MetricCardProps) {
  return (
    <div className="rounded-[1.75rem] border border-zinc-200/80 bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.06)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(15,23,42,0.09)]">
      <div
        className={cn(
          "mb-5 flex size-11 items-center justify-center rounded-2xl",
          tones[tone],
        )}
      >
        <Icon aria-hidden="true" className="size-5" />
      </div>
      <p className="text-sm font-medium text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-zinc-950">{value}</p>
      {detail ? <p className="mt-2 text-sm text-zinc-500">{detail}</p> : null}
    </div>
  );
}
