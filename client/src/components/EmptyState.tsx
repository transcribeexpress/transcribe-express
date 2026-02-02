import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { Button } from "./ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Illustration Circle with Icon */}
      <motion.div
        className="relative mb-6"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ 
          type: "spring",
          stiffness: 200,
          damping: 15,
          delay: 0.2 
        }}
      >
        {/* Gradient Background Circle */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#E935C1]/20 to-[#06B6D4]/20 rounded-full blur-2xl" />
        
        {/* Icon Container */}
        <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-[#E935C1]/10 to-[#06B6D4]/10 border border-white/10 flex items-center justify-center">
          <Icon className="w-12 h-12 text-[#E935C1]" strokeWidth={1.5} />
        </div>
      </motion.div>

      {/* Title */}
      <motion.h3
        className="text-xl font-semibold mb-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {title}
      </motion.h3>

      {/* Description */}
      <motion.p
        className="text-muted-foreground max-w-md mb-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        {description}
      </motion.p>

      {/* Action Button */}
      {actionLabel && onAction && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Button
            onClick={onAction}
            size="lg"
            className="gap-2"
          >
            {actionLabel}
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
