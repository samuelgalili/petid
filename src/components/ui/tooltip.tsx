import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "@/lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 8, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-[9999] overflow-hidden rounded-full bg-white text-foreground px-4 py-2 text-sm font-medium shadow-xl",
      "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
      "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      // Arrow/pointer effect
      "relative after:content-[''] after:absolute after:border-8 after:border-transparent",
      "data-[side=top]:after:top-full data-[side=top]:after:left-1/2 data-[side=top]:after:-translate-x-1/2 data-[side=top]:after:border-t-white",
      "data-[side=bottom]:after:bottom-full data-[side=bottom]:after:left-1/2 data-[side=bottom]:after:-translate-x-1/2 data-[side=bottom]:after:border-b-white",
      className,
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
