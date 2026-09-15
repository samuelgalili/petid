/**
 * scene3d swap point for Mipo Presence.
 *
 * PetHeroVisual already accepts `renderer="scene3d"`. V1 does not bundle
 * three.js / R3F / GLB loaders — when this flag is flipped, change only
 * the `scene3d` branch in PetHeroVisual to:
 *
 *   lazy(() => import("./Scene3dPresence"))
 *
 * Call sites (Profile Hero, BottomNav, AvatarCompanion) stay unchanged.
 */
export const SCENE3D_ENABLED = false;

export type Scene3dPresenceProps = {
  src: string;
  alt: string;
};
