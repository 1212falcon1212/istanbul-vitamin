import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  trend?: {
    direction: "up" | "down";
    percentage: number;
  };
}

export default function StatCard({ label, value, icon, trend }: StatCardProps) {
  return (
    <div className="bg-card-bg rounded-xl p-5 border border-border flex items-start gap-4">
      <div className="w-12 h-12 rounded-lg bg-primary-soft flex items-center justify-center text-primary shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-text-secondary text-sm">{label}</p>
        <p className="font-display text-2xl text-text-primary mt-0.5 price">
          {value}
        </p>
        {trend && (
          <p
            className={cn(
              "text-xs font-medium mt-1",
              trend.direction === "up" ? "text-green-600" : "text-red-600"
            )}
          >
            {trend.direction === "up" ? "+" : "-"}%{trend.percentage}
          </p>
        )}
      </div>
    </div>
  );
}
