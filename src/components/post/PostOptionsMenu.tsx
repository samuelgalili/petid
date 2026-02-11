import { MoreVertical, Link2, EyeOff, Flag } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PostOptionsMenuProps {
  /** The link to copy when "copy link" is clicked */
  copyLink: string;
  /** Label for the hide action */
  hideLabel?: string;
  /** Label for the report action */
  reportLabel?: string;
  /** Toast message for hide action */
  hideToast?: string;
  /** Toast message for report action */
  reportToast?: string;
  /** Icon size */
  iconSize?: number;
  /** Stroke width */
  strokeWidth?: number;
}

export const PostOptionsMenu = ({
  copyLink,
  hideLabel = "הסתר פוסט",
  reportLabel = "דווח",
  hideToast = "הפוסט הוסתר",
  reportToast = "הדיווח נשלח, תודה!",
  iconSize = 6,
  strokeWidth = 1.25,
}: PostOptionsMenuProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="text-card-foreground p-1 -m-1 focus:outline-none">
          <MoreVertical className="w-6 h-6" strokeWidth={strokeWidth} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-card z-50 border-border min-w-[180px]">
        <DropdownMenuItem
          onClick={() => {
            navigator.clipboard.writeText(copyLink);
            toast.success("הקישור הועתק");
          }}
        >
          <Link2 className="w-4 h-4 ml-2" />
          העתק קישור
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => toast.success(hideToast)}>
          <EyeOff className="w-4 h-4 ml-2" />
          {hideLabel}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => toast.info(reportToast)}
          className="text-destructive focus:text-destructive"
        >
          <Flag className="w-4 h-4 ml-2" />
          {reportLabel}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
