import { Component, lazy, Suspense, type ReactNode } from "react";

import { PetAvatarPhoto } from "@/components/pet/PetAvatarPhoto";
import { isWeakDevice } from "@/lib/petAvatarAppearance";

const PetAvatar = lazy(() => import("@/components/pet/PetAvatar"));

type PetAvatarGateProps = {
  name: string;
  photoSrc: string;
  species?: string | null;
  breed?: string | null;
  color?: string | null;
  onActivate?: () => void;
};

class AvatarErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

/** Loads the canvas chunk after first paint. A weak device never requests it. */
export const PetAvatarGate = (props: PetAvatarGateProps) => {
  const photo = (
    <PetAvatarPhoto name={props.name} src={props.photoSrc} onActivate={props.onActivate} />
  );
  if (isWeakDevice()) return photo;
  return (
    <AvatarErrorBoundary fallback={photo}>
      <Suspense fallback={photo}>
        <PetAvatar {...props} />
      </Suspense>
    </AvatarErrorBoundary>
  );
};
