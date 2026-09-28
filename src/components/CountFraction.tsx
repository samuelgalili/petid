import { cn } from "@/lib/utils";

/**
 * "1 / 5" inside an RTL page paints as "5 / 1".
 * Isolate the run so galleries, carousels, and progress counts stay in order.
 */
export const CountFraction = ({
  current,
  total,
  separator = " / ",
  className,
}: {
  current: number;
  total: number;
  separator?: string;
  className?: string;
}) => (
  <bdi dir="ltr" data-testid="count-fraction" className={cn(className)}>
    {current}{separator}{total}
  </bdi>
);
