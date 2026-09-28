import { cn } from "@/lib/utils";

/**
 * A leading minus inside an RTL page paints as "7%-".
 * Isolate the run so the badge stays "-7%".
 */
export const DiscountPercent = ({
  percent,
  className,
}: {
  percent: number;
  className?: string;
}) => (
  <bdi dir="ltr" data-testid="discount-percent" className={cn(className)}>
    -{percent}%
  </bdi>
);
