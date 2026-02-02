import { motion } from "framer-motion";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
  animation?: "pulse" | "wave" | "none";
}

export function Skeleton({
  className = "",
  variant = "rectangular",
  width,
  height,
  animation = "pulse",
}: SkeletonProps) {
  const baseClasses = "bg-white/10 rounded";
  
  const variantClasses = {
    text: "h-4 w-full",
    circular: "rounded-full",
    rectangular: "rounded-md",
  };

  const animationVariants: any = {
    pulse: {
      opacity: [0.5, 1, 0.5],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
    wave: {
      backgroundPosition: ["200% 0", "-200% 0"],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: "linear",
      },
    },
    none: {},
  };

  const style = {
    width: width || undefined,
    height: height || undefined,
  };

  return (
    <motion.div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
      animate={animationVariants[animation]}
      aria-label="Loading..."
      role="status"
    />
  );
}

// Skeleton presets for common use cases
export function SkeletonCard() {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-6 space-y-4">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4 pb-3 border-b border-white/10">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/6" />
        <Skeleton className="h-4 w-1/6" />
        <Skeleton className="h-4 w-1/6" />
        <Skeleton className="h-4 w-1/6" />
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 items-center py-3">
          <Skeleton className="h-5 w-1/4" />
          <Skeleton className="h-5 w-1/6" />
          <Skeleton className="h-5 w-1/6" />
          <Skeleton className="h-5 w-1/6" />
          <Skeleton className="h-5 w-1/6" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonKPI() {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-6 space-y-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-6 space-y-4">
      <Skeleton className="h-6 w-40" />
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-end gap-2" style={{ height: "200px" }}>
            <Skeleton 
              className="w-full" 
              height={`${Math.random() * 60 + 40}%`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
