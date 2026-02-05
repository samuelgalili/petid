 export type DataSourceType = "breeds" | "insurance" | "dog_parks" | "research";
 
 export interface DataSource {
   id: string;
   data_type: DataSourceType;
   title: string;
   description: string | null;
   file_url: string | null;
   file_name: string | null;
   file_type: string | null;
   file_size: number | null;
   metadata: Record<string, any>;
   extracted_data: Record<string, any>;
   is_processed: boolean;
   is_active: boolean;
   created_by: string | null;
   created_at: string;
   updated_at: string;
 }
 
 export interface DataCategory {
   id: DataSourceType;
   label: string;
   labelHe: string;
   icon: string;
   description: string;
   color: string;
 }
 
 export const DATA_CATEGORIES: DataCategory[] = [
   {
     id: "breeds",
     label: "Breeds",
     labelHe: "גזעים",
     icon: "🐕",
     description: "מידע על גזעי כלבים וחתולים",
     color: "bg-amber-500",
   },
   {
     id: "insurance",
     label: "Insurance",
     labelHe: "ביטוח",
     icon: "🛡️",
     description: "חברות ביטוח ותוכניות",
     color: "bg-blue-500",
   },
   {
     id: "dog_parks",
     label: "Dog Parks",
     labelHe: "גינות כלבים",
     icon: "🌳",
     description: "מיקומים ופרטי גינות כלבים",
     color: "bg-green-500",
   },
   {
     id: "research",
     label: "Research",
     labelHe: "מחקרים",
     icon: "📊",
     description: "מחקרים ומאמרים וטרינריים",
     color: "bg-purple-500",
   },
 ];