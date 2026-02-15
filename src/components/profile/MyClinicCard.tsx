/**
 * MyClinicCard - Displays the pet's primary vet clinic with quick-call action
 */

import { Building2, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MyClinicCardProps {
  clinicName: string;
  clinicPhone?: string | null;
  clinicAddress?: string | null;
}

export const MyClinicCard = ({ clinicName, clinicPhone, clinicAddress }: MyClinicCardProps) => {
  return (
    <div className="mx-4 mb-4 p-4 bg-card rounded-2xl border border-border/30" dir="rtl">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
          <Building2 className="w-4 h-4 text-blue-500" strokeWidth={1.5} />
        </div>
        <span className="font-semibold text-foreground text-sm">המרפאה שלי</span>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">{clinicName}</p>
        
        {clinicAddress && (
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
            <span className="text-xs text-muted-foreground">{clinicAddress}</span>
          </div>
        )}

        {clinicPhone && (
          <Button
            variant="outline"
            size="sm"
            className="w-full h-9 text-xs mt-2 border-blue-500/30 text-blue-600"
            onClick={() => window.open(`tel:${clinicPhone}`, '_self')}
          >
            <Phone className="w-3.5 h-3.5 ml-1.5" strokeWidth={1.5} />
            התקשר למרפאה — {clinicPhone}
          </Button>
        )}
      </div>
    </div>
  );
};
