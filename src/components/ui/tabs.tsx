import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
const Tabs = TabsPrimitive.Root;
const TabsList = React.forwardRef<React.ElementRef<typeof TabsPrimitive.List>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>>(({
  className,
  ...props
}, ref) => <TabsPrimitive.List ref={ref} className={cn("flex overflow-x-auto scrollbar-hide px-3 py-2 gap-2 bg-background/95 backdrop-blur-xl border-b border-border/20", className)} {...props} />);
TabsList.displayName = TabsPrimitive.List.displayName;
interface TabsTriggerProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {
  icon?: React.ReactNode;
}
const TabsTrigger = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Trigger>, TabsTriggerProps>(({
  className,
  icon,
  children,
  ...props
}, ref) => <TabsPrimitive.Trigger ref={ref} className={cn("group relative flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm font-medium whitespace-nowrap transition-all min-w-fit", "text-muted-foreground hover:text-foreground hover:bg-muted/60 active:scale-95", "data-[state=active]:text-primary-foreground data-[state=active]:font-semibold", "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50", className)} {...props}>
    {/* Animated background for active state */}
    
    
    {/* Content */}
    <span className="relative z-10 flex items-center gap-1.5">
      {icon && <span className="w-4 h-4 group-data-[state=active]:drop-shadow-sm">{icon}</span>}
      {children}
    </span>
  </TabsPrimitive.Trigger>);
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

// Animated version with layoutId for smooth tab switching
interface AnimatedTabsTriggerProps extends TabsTriggerProps {
  layoutId?: string;
}
const AnimatedTabsTrigger = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Trigger>, AnimatedTabsTriggerProps>(({
  className,
  icon,
  children,
  layoutId = "activeTab",
  ...props
}, ref) => {
  const [isActive, setIsActive] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    const el = triggerRef.current;
    if (el) {
      const observer = new MutationObserver(() => {
        setIsActive(el.getAttribute("data-state") === "active");
      });
      observer.observe(el, {
        attributes: true,
        attributeFilter: ["data-state"]
      });
      setIsActive(el.getAttribute("data-state") === "active");
      return () => observer.disconnect();
    }
  }, []);
  return <TabsPrimitive.Trigger ref={node => {
    (triggerRef as React.MutableRefObject<HTMLButtonElement | null>).current = node;
    if (typeof ref === "function") ref(node);else if (ref) ref.current = node;
  }} className={cn("relative flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm font-medium whitespace-nowrap transition-all min-w-fit", "text-muted-foreground hover:text-foreground hover:bg-muted/60", "data-[state=active]:text-primary-foreground data-[state=active]:font-semibold", "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50", className)} {...props}>
      {isActive && <motion.div layoutId={layoutId} className="absolute inset-0 bg-gradient-to-r from-primary to-primary-light rounded-2xl shadow-md" transition={{
      type: "spring",
      bounce: 0.15,
      duration: 0.5
    }} />}
      <span className="relative z-10 flex items-center gap-1.5">
        {icon && <span className={cn("w-4 h-4", isActive && "drop-shadow-sm")}>{icon}</span>}
        {children}
      </span>
    </TabsPrimitive.Trigger>;
});
AnimatedTabsTrigger.displayName = "AnimatedTabsTrigger";
const TabsContent = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Content>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>>(({
  className,
  ...props
}, ref) => <TabsPrimitive.Content ref={ref} className={cn("mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", className)} {...props} />);
TabsContent.displayName = TabsPrimitive.Content.displayName;
export { Tabs, TabsList, TabsTrigger, AnimatedTabsTrigger, TabsContent };