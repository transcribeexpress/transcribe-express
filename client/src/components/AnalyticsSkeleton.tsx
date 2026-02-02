import { SkeletonKPI, SkeletonChart } from "./Skeleton";

export function AnalyticsSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header Skeleton */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <div className="h-10 w-64 bg-white/10 rounded-md animate-pulse mb-2" />
            <div className="h-5 w-96 bg-white/10 rounded-md animate-pulse" />
          </div>
          <div className="h-10 w-32 bg-white/10 rounded-md animate-pulse" />
        </div>

        {/* KPIs Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <SkeletonKPI />
          <SkeletonKPI />
          <SkeletonKPI />
          <SkeletonKPI />
        </div>

        {/* Charts Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonChart />
          <SkeletonChart />
        </div>
      </div>
    </div>
  );
}
