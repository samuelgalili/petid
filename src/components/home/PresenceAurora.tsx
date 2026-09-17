import { cn } from "@/lib/utils";

type PresenceAuroraProps = {
  /** When true, only the static wash remains — no ribbons, no rim spin. */
  still: boolean;
  /** Character art gets a slightly cooler wash so it still reads as "generated". */
  isCharacter?: boolean;
  className?: string;
};

/**
 * Home Presence glow: layered CSS aurora behind the orbit avatar.
 * V1 is CSS only — no WebGL, Three.js, R3F, or Lottie.
 *
 * No rim. There used to be one: a conic gradient masked down to an 8px band at
 * the edge, at 0.9 opacity, spinning. That is a bright coloured LINE around the
 * avatar, and the brand asks for the glow alone - the soft wash and ribbons
 * behind the pet, with nothing drawing an edge around it.
 */
const PresenceAurora = ({ still, isCharacter = false, className }: PresenceAuroraProps) => (
  <div
    className={cn("presence-aurora", isCharacter && "presence-aurora--character", className)}
    data-presence-aurora={still ? "still" : "live"}
    aria-hidden="true"
  >
    <span className="presence-aurora__wash" />
    {!still && (
      <>
        <span className="presence-aurora__ribbon presence-aurora__ribbon--a" />
        <span className="presence-aurora__ribbon presence-aurora__ribbon--b" />
        <span className="presence-aurora__ribbon presence-aurora__ribbon--c" />
      </>
    )}
  </div>
);

export default PresenceAurora;
