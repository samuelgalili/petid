import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { ReactNode, useRef } from "react";

interface ParallaxScrollProps {
  children: ReactNode;
  speed?: number; // -1 to 1, negative = slower, positive = faster
  className?: string;
  direction?: "vertical" | "horizontal";
  scale?: boolean;
  opacity?: boolean;
  rotate?: boolean;
}

export const ParallaxScroll = ({
  children,
  speed = 0.5,
  className = "",
  direction = "vertical",
  scale = false,
  opacity = false,
  rotate = false,
}: ParallaxScrollProps) => {
  const ref = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // Smooth spring animation
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  // Transform values based on scroll
  const y = useTransform(smoothProgress, [0, 1], [speed * 100, speed * -100]);
  const x = useTransform(smoothProgress, [0, 1], [speed * 50, speed * -50]);
  const scaleValue = useTransform(smoothProgress, [0, 0.5, 1], [0.9, 1, 0.9]);
  const opacityValue = useTransform(smoothProgress, [0, 0.3, 0.7, 1], [0.6, 1, 1, 0.6]);
  const rotateValue = useTransform(smoothProgress, [0, 1], [speed * -5, speed * 5]);

  return (
    <motion.div
      ref={ref}
      style={{
        y: direction === "vertical" ? y : 0,
        x: direction === "horizontal" ? x : 0,
        scale: scale ? scaleValue : 1,
        opacity: opacity ? opacityValue : 1,
        rotate: rotate ? rotateValue : 0,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Hero parallax with layered effect
interface ParallaxHeroProps {
  backgroundImage?: string;
  backgroundColor?: string;
  children: ReactNode;
  className?: string;
  overlayOpacity?: number;
}

export const ParallaxHero = ({
  backgroundImage,
  backgroundColor = "hsl(var(--primary))",
  children,
  className = "",
  overlayOpacity = 0.4,
}: ParallaxHeroProps) => {
  const ref = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.2]);

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      <motion.div
        style={{ y, scale }}
        className="absolute inset-0"
      >
        {backgroundImage ? (
          <img
            src={backgroundImage}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full"
            style={{ backgroundColor }}
          />
        )}
        <div
          className="absolute inset-0 bg-black"
          style={{ opacity: overlayOpacity }}
        />
      </motion.div>
      <motion.div style={{ opacity }} className="relative z-10">
        {children}
      </motion.div>
    </div>
  );
};

// Staggered parallax for lists
interface ParallaxListProps {
  children: ReactNode[];
  className?: string;
  staggerDelay?: number;
}

export const ParallaxList = ({
  children,
  className = "",
  staggerDelay = 0.1,
}: ParallaxListProps) => {
  const ref = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "center center"],
  });

  return (
    <div ref={ref} className={className}>
      {children.map((child, index) => {
        const start = index * staggerDelay;
        const end = start + 0.3;
        
        return (
          <ParallaxListItem
            key={index}
            scrollProgress={scrollYProgress}
            start={Math.min(start, 0.7)}
            end={Math.min(end, 1)}
          >
            {child}
          </ParallaxListItem>
        );
      })}
    </div>
  );
};

interface ParallaxListItemProps {
  children: ReactNode;
  scrollProgress: any;
  start: number;
  end: number;
}

const ParallaxListItem = ({
  children,
  scrollProgress,
  start,
  end,
}: ParallaxListItemProps) => {
  const opacity = useTransform(scrollProgress, [start, end], [0, 1]);
  const y = useTransform(scrollProgress, [start, end], [30, 0]);
  const scale = useTransform(scrollProgress, [start, end], [0.95, 1]);

  return (
    <motion.div style={{ opacity, y, scale }}>
      {children}
    </motion.div>
  );
};
