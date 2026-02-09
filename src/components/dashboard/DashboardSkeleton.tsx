import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardSkeleton() {
  return (
    <div className="space-y-6 max-w-lg mx-auto pb-6">
      {/* Greeting */}
      <div className="pt-2 space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-7 w-56" />
      </div>

      {/* Weather Widget */}
      <Skeleton className="h-12 w-full rounded-full" />

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <Skeleton className="w-14 h-14 rounded-2xl" />
            <Skeleton className="h-3 w-10" />
          </div>
        ))}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>

      {/* Action Cards */}
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-[72px] rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
