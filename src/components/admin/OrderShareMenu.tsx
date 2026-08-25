import { Mail, MessageCircle, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createOrderShareLinks, type ShareableOrder } from "@/lib/orderShare";

interface OrderShareMenuProps {
  order: ShareableOrder;
}

export const OrderShareMenu = ({ order }: OrderShareMenuProps) => {
  const links = createOrderShareLinks(order);

  return (
    <DropdownMenu dir="rtl">
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label={`שיתוף הזמנה ${order.order_number}`}
          onClick={(event) => event.stopPropagation()}
        >
          <Share2 className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <a href={links.email}>
            <Mail className="ml-2 h-4 w-4" />
            שיתוף באימייל
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={links.whatsapp} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="ml-2 h-4 w-4" />
            שיתוף בוואטסאפ
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
