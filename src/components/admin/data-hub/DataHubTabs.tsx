 import { motion } from "framer-motion";
 import { cn } from "@/lib/utils";
 import { DATA_CATEGORIES, DataSourceType } from "@/types/admin-data";
 
 interface DataHubTabsProps {
   activeTab: DataSourceType;
   onTabChange: (tab: DataSourceType) => void;
 }
 
 export const DataHubTabs = ({ activeTab, onTabChange }: DataHubTabsProps) => {
   return (
     <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
       {DATA_CATEGORIES.map((category) => (
         <motion.button
           key={category.id}
           onClick={() => onTabChange(category.id)}
           className={cn(
             "relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
             activeTab === category.id
               ? "bg-primary text-primary-foreground shadow-md"
               : "bg-muted/50 text-muted-foreground hover:bg-muted"
           )}
           whileHover={{ scale: 1.02 }}
           whileTap={{ scale: 0.98 }}
         >
           <span className="text-lg">{category.icon}</span>
           <span>{category.labelHe}</span>
           {activeTab === category.id && (
             <motion.div
               layoutId="activeTab"
               className="absolute inset-0 bg-primary rounded-xl -z-10"
               transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
             />
           )}
         </motion.button>
       ))}
     </div>
   );
 };