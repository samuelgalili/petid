import { motion } from "framer-motion";
import { ShoppingCart } from "lucide-react";

import { OptimizedImage } from "@/components/OptimizedImage";
import { cn } from "@/lib/utils";

/**
 * One product, in a horizontal rail. The same card the grid uses, narrower.
 *
 * The shop's grid card was rebuilt - 1.5rem radius, a thin line instead of a
 * line AND a shadow, the price in ink at a size you can read - and the owner
 * said the shop still looked old. He was right, and the reason is that the
 * grid is the THIRD thing on the page. Above it sit two rails, in two
 * components nobody touched: 130px and 120px cards, 10px and 11px names,
 * prices in cyan, add-to-cart on a 28px circle, and `border + shadow-sm` on
 * every card, which is the exact pairing surfaceDepth.test.js exists to stop.
 *
 * Two copies of a card is how that happens, so there is one now. Both rails
 * render this, and a change to the shop's card language reaches all of them.
 *
 * What changed from the two originals, and why:
 *
 *  - The price is ink, not --primary. A coloured price competes with the name
 *    for the eye instead of outranking it, and on this page it also happened
 *    to be the same cyan as the add button, the badge and the section icon,
 *    so nothing on the card was emphasised because everything was.
 *  - The name is 13px over two lines. At 10px a product name is a texture.
 *  - The add button is 44px. It was 28px, which is under every touch-target
 *    minimum and sat one thumb-width from a link to the product page.
 *  - The reason chip moved off the image and under the name. On the image it
 *    needed a fill to stay legible over a photograph, and the fill was a cyan
 *    gradient - the aurora the rest of the app gave up so the pet's avatar
 *    could keep it.
 */

export interface ShopRailProduct {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
}

export interface ShopRailCardProps {
  product: ShopRailProduct;
  /** Why this product is here. Shown as a chip under the name. */
  reason?: string | null;
  /** A reason that comes from the pet's own profile reads warmer than a generic one. */
  reasonTone?: "neutral" | "profile";
  onOpen: () => void;
  onAdd: () => void;
  className?: string;
}

export const ShopRailCard = ({
  product,
  reason,
  reasonTone = "neutral",
  onOpen,
  onAdd,
  className,
}: ShopRailCardProps) => (
  <div className={cn("w-[150px] flex-shrink-0", className)}>
    <div className="overflow-hidden rounded-3xl border border-mipo-line bg-mipo-surface transition-colors hover:bg-mipo-soft">
      {/* The image is the target for opening the product. The add button below
          is its own target, so a thumb aiming for the cart cannot open a page
          instead - which is what a card-wide onClick with a 28px button on top
          of it did. */}
      <button
        type="button"
        onClick={onOpen}
        className="block w-full"
        aria-label={`פתיחת ${product.name}`}
      >
        <div className="aspect-square bg-mipo-soft">
          <OptimizedImage
            src={product.image_url || ""}
            alt={product.name}
            className="h-full w-full"
            objectFit="cover"
            sizes="150px"
          />
        </div>
      </button>

      <div className="space-y-1.5 p-3">
        <button type="button" onClick={onOpen} className="block w-full text-right">
          <h3 className="line-clamp-2 min-h-[2.5rem] text-[13px] leading-5 text-mipo-ink">
            {product.name}
          </h3>
        </button>

        {reason && (
          <span
            className={cn(
              "inline-block max-w-full truncate rounded-full border px-2 py-0.5 text-[11px]",
              reasonTone === "profile"
                ? "border-emerald-300 text-emerald-700 dark:text-emerald-400"
                : "border-mipo-line text-mipo-muted",
            )}
          >
            {reason}
          </span>
        )}

        <div className="flex items-center justify-between gap-2 pt-0.5">
          <span className="text-[17px] font-bold tabular-nums text-mipo-ink">₪{product.price}</span>
          {/* A thin-line circle, not a filled one.
           *
           * The first version used .mipo-cta-button here and a preview showed
           * why that is wrong: six filled ink circles on one rail, each louder
           * than the price beside it. The filled button means "this is the one
           * commitment on this screen" - it belongs to checkout, not to a
           * sixth of a shelf. 44px is kept, because the target size was the
           * accessibility problem and the fill was never what fixed it. */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={onAdd}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-mipo-line text-mipo-ink transition-colors hover:bg-mipo-soft"
            aria-label={`הוספת ${product.name} לעגלה`}
          >
            <ShoppingCart className="h-4 w-4" strokeWidth={1.75} />
          </motion.button>
        </div>
      </div>
    </div>
  </div>
);

export default ShopRailCard;
