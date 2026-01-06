import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
const Tabs = TabsPrimitive.Root;
const TabsList = React.forwardRef<React.ElementRef<typeof TabsPrimitive.List>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>>(({
  className,
  ...props
}, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-auto items-center justify-start gap-2 rounded-xl bg-transparent p-1",
      className
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;
interface TabsTriggerProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {
  icon?: React.ReactNode;
}
const TabsTrigger = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Trigger>, TabsTriggerProps>(({
  className,
  icon,
  children,
  ...props
}, ref) => <TabsPrimitive.Trigger ref={ref} className={cn("group relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-300 min-w-fit", "bg-muted/40 text-muted-foreground border border-transparent", "hover:bg-muted hover:text-foreground hover:border-border/50 hover:shadow-sm hover:-translate-y-0.5", "active:scale-95 active:shadow-none", "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary/20 data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25", "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50", className)} {...props}>
    <span className="relative z-10 flex items-center gap-2">
      {icon && <span className="w-4 h-4 transition-transform duration-300 group-hover:scale-110 group-data-[state=active]:drop-shadow-sm">{icon}</span>}
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
  }} className={cn("relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-300 min-w-fit", "bg-muted/40 text-muted-foreground border border-transparent", "hover:bg-muted hover:text-foreground hover:border-border/50 hover:shadow-sm hover:-translate-y-0.5", "data-[state=active]:text-primary-foreground data-[state=active]:font-bold", "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50", className)} {...props}>
      {isActive && <motion.div layoutId={layoutId} className="absolute inset-0 bg-gradient-to-r from-primary via-primary to-primary/90 rounded-xl shadow-lg shadow-primary/30" transition={{
      type: "spring",
      bounce: 0.2,
      duration: 0.5
    }} />}
      <span className="relative z-10 flex items-center gap-2">
        {icon && <span className={cn("w-4 h-4 transition-transform duration-300", isActive && "scale-110 drop-shadow-sm")}>{icon}</span>}
        {children}
      </span>
    </TabsPrimitive.Trigger>;
});
AnimatedTabsTrigger.displayName = "AnimatedTabsTrigger";
const TabsContent = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Content>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>>(({
  className,
  ...props
}, ref) => <TabsPrimitive.Content ref={ref} className={cn("mt-3 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 animate-fade-in", className)} {...props} />);
TabsContent.displayName = TabsPrimitive.Content.displayName;
export { Tabs, TabsList, TabsTrigger, AnimatedTabsTrigger, TabsContent };