import * as React from "react";
import { cn } from "@/lib/utils";

const Progress = React.forwardRef(({ className, value = 0, indicatorColor, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("relative h-2 w-full overflow-hidden rounded-full bg-gray-100", className)}
    {...props}
  >
    <div
      className="h-full rounded-full transition-all duration-500"
      style={{
        width: `${Math.min(100, Math.max(0, value))}%`,
        backgroundColor: indicatorColor || "#3B82F6",
      }}
    />
  </div>
));

Progress.displayName = "Progress";

export { Progress };