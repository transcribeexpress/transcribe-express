import { Skeleton } from "./Skeleton";

export function UploadSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header Skeleton */}
        <div className="mb-8">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>

        {/* Upload Card Skeleton */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-white/5 border border-white/10 rounded-lg p-8 space-y-6">
            {/* Dropzone Skeleton */}
            <div className="border-2 border-dashed border-white/20 rounded-lg p-12 text-center space-y-4">
              <Skeleton variant="circular" className="h-16 w-16 mx-auto" />
              <Skeleton className="h-6 w-48 mx-auto" />
              <Skeleton className="h-4 w-64 mx-auto" />
              <Skeleton className="h-10 w-32 mx-auto" />
            </div>

            {/* Format Info Skeleton */}
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>

            {/* Submit Button Skeleton */}
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
