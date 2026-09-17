import * as React from "react";
import { cn } from "@/lib/utils";

const Badge = React.forwardRef(({ className, variant = "default", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
      variant === "default" && "bg-gray-900 text-white",
      variant === "secondary" && "bg-gray-100 text-gray-900",
      variant === "outline" && "border border-gray-200 text-gray-900",
      className
    )}
    {...props}
  />
));

Badge.displayName = "Badge";

export { Badge };