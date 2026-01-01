import { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { useFeatureHint } from "@/hooks/useFeatureHint";
import { FeatureHint } from "./FeatureHint";

interface FeatureHintWrapperProps {
  children: ReactNode;
  featureId: string;
  title: string;
  description: string;
  triggerOnClick?: boolean;
  triggerOnMount?: boolean;
  delay?: number;
}

export const FeatureHintWrapper = ({
  children,
  featureId,
  title,
  description,
  triggerOnClick = true,
  triggerOnMount = false,
  delay = 500
}: FeatureHintWrapperProps) => {
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

  return (
    <>
      <div onClick={handleClick}>
        {children}
      </div>
      
      {isHintVisible && createPortal(
        <FeatureHint
          isVisible={isHintVisible}
          onDismiss={dismissHint}
          title={title}
          description={description}
        />,
        document.body
      )}
    </>
  );
};
