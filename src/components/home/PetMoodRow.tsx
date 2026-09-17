import { useState } from "react";
import { cn } from "@/lib/utils";
import type { MipoPetCharacter, MipoPetCharacterExpression } from "@/lib/mipoApi";

/**
 * "How is <pet> today?" - one tap, answered by the pet's own face.
 *
 * PetCharacterStudio generates an expression pack for every pet: neutral,
 * happy, curious, sleepy, proud, celebrate, attentive. It is generated once,
 * cached, and shown on exactly ZERO screens - the pet appears in the app as a
 * single circle in the middle of the dashboard, wearing one of them.
 *
 * That pack is the one thing in this interface a competitor cannot copy,
 * because copying it needs THEIR customer's animal. So it goes on the screen
 * everyone opens first.
 *
 * Four expressions, not seven. A row of seven is a menu; a row of four is a
 * question. The four chosen are the ones an owner can answer without thinking:
 * happy, curious, sleepy, attentive.
 *
 * This records what the OWNER says. It is deliberately not the same thing as
 * the mood the system derives from vet dates and food running out - those are
 * a claim by MIPO, shown on the profile with its own colour. Mixing a tapped
 * mood into a derived one is how a red "vet" halo stops being believed.
 */

/** The four an owner can answer at a glance, in the order they read. */
const ASKED: Array<{ key: MipoPetCharacterExpression; label: string }> = [
  { key: "happy", label: "שמח" },
  { key: "curious", label: "סקרן" },
  { key: "sleepy", label: "ישנוני" },
  { key: "attentive", label: "קשוב" },
];

export interface PetMoodRowProps {
  petName: string;
  character: MipoPetCharacter | null;
  onPick?: (expression: MipoPetCharacterExpression) => void;
  className?: string;
}

export const PetMoodRow = ({ petName, character, onPick, className }: PetMoodRowProps) => {
  const [picked, setPicked] = useState<MipoPetCharacterExpression | null>(null);

  // Only the expressions that actually rendered. A pack can come back partial,
  // and a chip with no picture is a chip that says nothing - better to ask
  // about three faces than to show a grey box pretending to be the fourth.
  const available = ASKED.filter(({ key }) => Boolean(character?.expressions?.[key]));
  if (available.length < 2) return null;

  return (
    <section className={cn("space-y-3", className)}>
      <div>
        <h2 className="text-[17px] font-semibold text-mipo-ink">
          איך {petName} היום?
        </h2>
        <p className="mt-0.5 text-[13px] text-mipo-muted">
          הקישו על הבעה כדי לתעד
        </p>
      </div>

      <div className="flex gap-2">
        {available.map(({ key, label }) => {
          const isPicked = picked === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={isPicked}
              onClick={() => {
                setPicked(key);
                onPick?.(key);
              }}
              className={cn(
                "flex min-h-11 flex-1 flex-col items-center gap-1.5 rounded-2xl border p-2.5 transition-colors",
                isPicked
                  ? "mipo-chip-selected"
                  : "border-mipo-line bg-mipo-surface hover:bg-mipo-soft",
              )}
            >
              <img
                src={character!.expressions[key]}
                alt=""
                className="h-14 w-14 rounded-full object-cover"
              />
              {/* The label sits below the face in BOTH states. Moving it inside
                  the chip when selected - which is what the reference design
                  does - makes the whole row jump on every tap. */}
              <span className={cn("text-[12px] font-medium", !isPicked && "text-mipo-ink")}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default PetMoodRow;
