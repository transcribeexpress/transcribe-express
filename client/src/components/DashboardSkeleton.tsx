import { SkeletonTable } from "./Skeleton";

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="h-10 w-64 bg-white/10 rounded-md animate-pulse mb-2" />
          <div className="h-5 w-96 bg-white/10 rounded-md animate-pulse" />
        </div>

        {/* Search and Filters Skeleton */}
        <div className="mb-6 space-y-4">
          <div className="h-12 w-full bg-white/5 border border-white/10 rounded-lg animate-pulse" />
          <div className="flex gap-4">
            <div className="h-10 w-32 bg-white/5 border border-white/10 rounded-md animate-pulse" />
            <div className="h-10 w-32 bg-white/5 border border-white/10 rounded-md animate-pulse" />
            <div className="h-10 w-32 bg-white/5 border border-white/10 rounded-md animate-pulse" />
          </div>
        </div>

        {/* Table Skeleton */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <SkeletonTable rows={8} />
        </div>

        {/* Pagination Skeleton */}
        <div className="mt-6 flex justify-between items-center">
          <div className="h-5 w-48 bg-white/10 rounded-md animate-pulse" />
          <div className="flex gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 w-10 bg-white/10 rounded-md animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
