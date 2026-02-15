/**
 * DangerousBreedBanner - Legal compliance banner for dangerous breeds
 * Shows muzzle, insurance, and signage requirements per Israeli law
 */

import { motion } from "framer-motion";
import { AlertTriangle, Shield, Eye, FileText } from "lucide-react";

interface DangerousBreedBannerProps {
  breedName?: string;
  licenseConditions?: string | null;
}

const COMPLIANCE_ITEMS = [
  { icon: Eye, label: 'חסם לוע (זמם) בשטח ציבורי', key: 'muzzle' },
  { icon: Shield, label: 'ביטוח צד ג\' חובה', key: 'insurance' },
  { icon: FileText, label: 'שילוט ייעודי בכניסה לבית', key: 'signage' },
];

export const DangerousBreedBanner = ({ breedName, licenseConditions }: DangerousBreedBannerProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mb-4"
    >
      <div className="p-4 bg-red-500/5 rounded-2xl border border-red-500/20" dir="rtl">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-red-500" strokeWidth={1.5} />
          </div>
          <div>
            <span className="font-semibold text-red-700 text-sm">תאימות חוקית — גזע מוגבל</span>
            {breedName && (
              <p className="text-[10px] text-red-500/80">{breedName}</p>
            )}
          </div>
        </div>

        <div className="space-y-2 mb-3">
          {COMPLIANCE_ITEMS.map(({ icon: Icon, label, key }) => (
            <div key={key} className="flex items-center gap-2.5 p-2 bg-red-500/5 rounded-xl">
              <Icon className="w-4 h-4 text-red-500 shrink-0" strokeWidth={1.5} />
              <span className="text-xs text-foreground">{label}</span>
            </div>
          ))}
        </div>

        {licenseConditions && (
          <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/20">
            <p className="text-[10px] font-semibold text-amber-700 mb-1">תנאי רישיון:</p>
            <p className="text-[11px] text-foreground leading-relaxed">{licenseConditions}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};
