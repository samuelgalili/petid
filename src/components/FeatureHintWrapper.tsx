import { ReactNode, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useFeatureHint } from "@/hooks/useFeatureHint";
import { FeatureHint } from "./FeatureHint";

interface FeatureHintWrapperProps {
  children: ReactNode;
  featureId: string;
  title: string;
  description: string;
  position?: "top" | "bottom" | "left" | "right";
  triggerOnClick?: boolean;
  triggerOnMount?: boolean;
  delay?: number;
}

export const FeatureHintWrapper = ({
  children,
  featureId,
  title,
  description,
  position = "bottom",
  triggerOnClick = true,
  triggerOnMount = false,
  delay = 500
}: FeatureHintWrapperProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { shouldShowHint, isHintVisible, triggerHint, dismissHint } = useFeatureHint(featureId);

  useEffect(() => {
    if (triggerOnMount && shouldShowHint) {
      const timer = setTimeout(() => {
        triggerHint();
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [triggerOnMount, shouldShowHint, triggerHint, delay]);

  const handleClick = (e: React.MouseEvent) => {
    if (triggerOnClick && shouldShowHint && !isHintVisible) {
      e.preventDefault();
      e.stopPropagation();
      triggerHint();
    }
  };

  const getHintPosition = () => {
    if (!wrapperRef.current) return { top: 0, left: 0 };
    const rect = wrapperRef.current.getBoundingClientRect();
    
    return {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
      height: rect.height
    };
  };

  const pos = getHintPosition();

  return (
    <div 
      ref={wrapperRef} 
      className="relative"
      onClick={handleClick}
    >
      {children}
      
      {isHintVisible && createPortal(
        <div 
          style={{
            position: 'absolute',
            top: pos.top,
            left: pos.left,
            width: pos.width,
            height: pos.height,
            pointerEvents: 'none'
          }}
        >
          <div className="relative w-full h-full pointer-events-auto">
            <FeatureHint
              isVisible={isHintVisible}
              onDismiss={dismissHint}
              title={title}
              description={description}
              position={position}
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
