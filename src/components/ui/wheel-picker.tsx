"use client";

import * as React from "react";
import { motion, useMotionValue, useTransform, animate, PanInfo, MotionValue } from "framer-motion";
import { cn } from "@/lib/utils";

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;

interface WheelItemProps {
  item: string | number;
  index: number;
  y: MotionValue<number>;
  itemHeight: number;
  visibleItems: number;
  centerOffset: number;
  isSelected: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function WheelItem({
  item,
  index,
  y,
  itemHeight,
  visibleItems,
  centerOffset,
  isSelected,
  disabled,
  onClick,
}: WheelItemProps) {
  const itemY = useTransform(
    y,
    (latest) => {
      const offset = index * itemHeight + latest + centerOffset;
      return offset;
    }
  );

  const rotateX = useTransform(
    itemY,
    [0, centerOffset, itemHeight * visibleItems],
    [45, 0, -45]
  );

  const scale = useTransform(
    itemY,
    [0, centerOffset, itemHeight * visibleItems],
    [0.8, 1, 0.8]
  );

  const opacity = useTransform(
    itemY,
    [0, centerOffset * 0.5, centerOffset, centerOffset * 1.5, itemHeight * visibleItems],
    [0.3, 0.6, 1, 0.6, 0.3]
  );

  return (
    <motion.div
      className={cn(
        "absolute w-full flex items-center justify-center cursor-pointer select-none transition-colors",
        isSelected ? "font-bold text-foreground" : "text-muted-foreground/60",
        disabled && "cursor-not-allowed opacity-50"
      )}
      style={{
        height: itemHeight,
        y: itemY,
        rotateX,
        scale,
        opacity,
        transformStyle: "preserve-3d",
      }}
      onClick={() => !disabled && onClick()}
    >
      <span className="whitespace-nowrap tabular-nums">
        {item}
      </span>
    </motion.div>
  );
}

interface WheelColumnProps {
  items: (string | number)[];
  value: number;
  onChange: (index: number) => void;
  itemHeight: number;
  visibleItems: number;
  disabled?: boolean;
  className?: string;
  ariaLabel: string;
}

function WheelColumn({
  items,
  value,
  onChange,
  itemHeight,
  visibleItems,
  disabled,
  className,
  ariaLabel,
}: WheelColumnProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const y = useMotionValue(-value * itemHeight);
  const centerOffset = Math.floor(visibleItems / 2) * itemHeight;

  const valueRef = React.useRef(value);
  const onChangeRef = React.useRef(onChange);
  const itemsLengthRef = React.useRef(items.length);

  React.useEffect(() => {
    valueRef.current = value;
    onChangeRef.current = onChange;
    itemsLengthRef.current = items.length;
  });

  React.useEffect(() => {
    animate(y, -value * itemHeight, {
      type: "spring",
      stiffness: 300,
      damping: 30,
    });
  }, [value, itemHeight, y]);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (disabled) return;

    const currentY = y.get();
    const velocity = info.velocity.y;
    const projectedY = currentY + velocity * 0.2;

    let newIndex = Math.round(-projectedY / itemHeight);
    newIndex = Math.max(0, Math.min(items.length - 1, newIndex));

    onChange(newIndex);
  };

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container || disabled) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const direction = e.deltaY > 0 ? 1 : -1;
      const currentValue = valueRef.current;
      const maxIndex = itemsLengthRef.current - 1;
      const newIndex = Math.max(0, Math.min(maxIndex, currentValue + direction));

      if (newIndex !== currentValue) {
        onChangeRef.current(newIndex);
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [disabled]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    const maxIndex = items.length - 1;
    let newIndex = value;

    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        newIndex = Math.max(0, value - 1);
        break;
      case "ArrowDown":
        e.preventDefault();
        newIndex = Math.min(maxIndex, value + 1);
        break;
      default:
        return;
    }

    if (newIndex !== value) {
      onChange(newIndex);
    }
  };

  const dragConstraints = React.useMemo(() => ({
    top: -(items.length - 1) * itemHeight,
    bottom: 0,
  }), [items.length, itemHeight]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden",
        className
      )}
      style={{ height: itemHeight * visibleItems }}
      role="listbox"
      aria-label={ariaLabel}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={handleKeyDown}
    >
      {/* Top gradient fade */}
      <div 
        className="absolute top-0 left-0 right-0 z-10 pointer-events-none bg-gradient-to-b from-background via-background/80 to-transparent"
        style={{ height: itemHeight * 1.8 }}
      />

      {/* Selection indicator */}
      <div
        className="absolute left-2 right-2 z-5 pointer-events-none rounded-lg bg-muted/40"
        style={{
          height: itemHeight,
          top: centerOffset,
        }}
      />

      {/* Bottom gradient fade */}
      <div
        className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none bg-gradient-to-t from-background via-background/80 to-transparent"
        style={{ height: itemHeight * 1.8 }}
      />

      <motion.div
        className="relative h-full"
        style={{ y, perspective: 1000 }}
        drag="y"
        dragConstraints={dragConstraints}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
      >
        {items.map((item, index) => (
          <WheelItem
            key={`${item}-${index}`}
            item={item}
            index={index}
            y={y}
            itemHeight={itemHeight}
            visibleItems={visibleItems}
            centerOffset={centerOffset}
            isSelected={index === value}
            disabled={disabled}
            onClick={() => onChange(index)}
          />
        ))}
      </motion.div>
    </div>
  );
}

// Size Wheel Picker
interface SizeWheelPickerProps {
  value: string;
  onChange: (value: string) => void;
  defaultFromBreed?: string;
  disabled?: boolean;
  className?: string;
}

const SIZE_OPTIONS = [
  { value: 'small', label: 'קטן' },
  { value: 'medium', label: 'בינוני' },
  { value: 'large', label: 'גדול' },
  { value: 'extra_large', label: 'ענק' },
];

export function SizeWheelPicker({
  value,
  onChange,
  defaultFromBreed,
  disabled = false,
  className,
}: SizeWheelPickerProps) {
  const items = SIZE_OPTIONS.map(o => o.label);
  const currentIndex = SIZE_OPTIONS.findIndex(o => o.value === value);
  const selectedIndex = currentIndex >= 0 ? currentIndex : (defaultFromBreed ? SIZE_OPTIONS.findIndex(o => o.value === defaultFromBreed) : 1);

  const handleChange = (index: number) => {
    onChange(SIZE_OPTIONS[index].value);
  };

  return (
    <div className={cn("flex items-center justify-center rounded-xl bg-background/50 backdrop-blur-sm py-2 px-3", className)}>
      <WheelColumn
        items={items}
        value={selectedIndex}
        onChange={handleChange}
        itemHeight={ITEM_HEIGHT}
        visibleItems={VISIBLE_ITEMS}
        disabled={disabled}
        className="w-32"
        ariaLabel="Select size"
      />
    </div>
  );
}

// Weight Wheel Picker
interface WeightWheelPickerProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  defaultFromBreed?: string;
  disabled?: boolean;
  className?: string;
}

export function WeightWheelPicker({
  value,
  onChange,
  min = 1,
  max = 100,
  step = 1,
  disabled = false,
  className,
}: WeightWheelPickerProps) {
  // Generate weight options with step
  const weights = React.useMemo(() => {
    const arr: number[] = [];
    for (let w = min; w <= max; w += step) {
      arr.push(w);
    }
    return arr;
  }, [min, max, step]);

  const currentIndex = weights.findIndex(w => w === value);
  const selectedIndex = currentIndex >= 0 ? currentIndex : 0;

  const handleChange = (index: number) => {
    onChange(weights[index]);
  };

  return (
    <div className={cn("flex items-center justify-center gap-2 rounded-xl bg-background/50 backdrop-blur-sm py-2 px-3", className)}>
      <WheelColumn
        items={weights}
        value={selectedIndex}
        onChange={handleChange}
        itemHeight={ITEM_HEIGHT}
        visibleItems={VISIBLE_ITEMS}
        disabled={disabled}
        className="w-20"
        ariaLabel="Select weight"
      />
      <span className="text-muted-foreground font-medium">ק"ג</span>
    </div>
  );
}
