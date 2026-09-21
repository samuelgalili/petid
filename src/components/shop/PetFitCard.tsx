/**
 * "מתאים ל[החיה]" — the product page's first block.
 *
 * The design canvas calls this "הדבר היחיד שאף חנות אחרת לא יכולה לומר", and
 * it is the reason the safety score stayed on the page at all. The canvas's
 * note on the score is blunt about the old treatment: "ציון בטיחות חשוף —
 * מספר בלי הקשר מפחיד. נשאר — אבל בתוך ״מתאים לרקסי״, שם הוא אומר משהו."
 *
 * So the number never appears alone. It appears under the animal's name, above
 * the FACTS IT WAS COMPUTED FROM — "כלב בוגר · 18 ק״ג · ללא רגישויות ידועות" —
 * because a score a shopper cannot audit is a claim, and a score with its
 * inputs printed under it is an argument they can disagree with.
 *
 * THREE STATES, AND THE THIRD IS THE ONE THAT WAS AN OPEN QUESTION.
 *
 *   no pet at all        nothing. There is no "this" to be suitable for.
 *   a pet with a profile the fit, its basis, and how long a bag lasts.
 *   a pet with gaps      an INVITATION, naming the field it needs.
 *
 * The canvas left the third open - hide the card, or ask for the missing
 * field - and noted the trade: asking is more useful but puts work in front of
 * someone mid-purchase. Asking wins here, and the reason is that the
 * alternative is not "nothing", it is a card that silently shows less for the
 * customers who would benefit most. The ask is one line, it never blocks the
 * buy button, and it names the single field that would change the answer.
 */

import { PawPrint, ShieldAlert, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { estimateBagDuration } from "@/lib/bagDuration";
import { formatPetAgeHe } from "@/lib/petAge";
import type { SafetyLevel } from "@/lib/petSafetyScore";

export interface PetFitPet {
  id?: string;
  name?: string | null;
  type?: string | null;
  pet_type?: string | null;
  breed?: string | null;
  weight?: number | null;
  birth_date?: string | null;
  age_years?: number | null;
  age_months?: number | null;
  medical_conditions?: string[] | null;
}

const SPECIES_HE: Record<string, string> = { dog: "כלב", cat: "חתול" };

const LEVEL_COPY: Record<SafetyLevel, { label: string; tone: string; Icon: typeof ShieldCheck }> = {
  safe: { label: "מתאים ל", tone: "text-emerald-600 dark:text-emerald-400", Icon: ShieldCheck },
  caution: { label: "כדאי לבדוק עבור ", tone: "text-mipo-peach", Icon: ShieldAlert },
  unsafe: { label: "לא מומלץ ל", tone: "text-destructive", Icon: ShieldAlert },
};

/**
 * The facts the score was computed from, in the order a person would say them.
 *
 * Only what is actually known. "ללא רגישויות ידועות" is a real statement - the
 * profile has an empty conditions list - while a missing weight simply does not
 * appear, because printing "משקל: לא ידוע" turns a gap into a row.
 */
const basisOf = (pet: PetFitPet): string[] => {
  const facts: string[] = [];

  const species = SPECIES_HE[String(pet.pet_type || pet.type || "")] || "";
  const age = formatPetAgeHe(pet as Parameters<typeof formatPetAgeHe>[0]);
  if (species || age) facts.push([species, age].filter(Boolean).join(" "));

  if (typeof pet.weight === "number" && pet.weight > 0) facts.push(`${pet.weight} ק״ג`);

  const conditions = (pet.medical_conditions || []).filter(Boolean);
  facts.push(conditions.length > 0 ? conditions.join(" · ") : "ללא רגישויות ידועות");

  return facts;
};

export const PetFitCard = ({
  pet,
  level,
  score,
  note,
  productWeight,
}: {
  pet: PetFitPet | null | undefined;
  level: SafetyLevel | null;
  score: number | null;
  note?: string | null;
  productWeight?: string | null;
}) => {
  // No pet is not a gap to fill in. There is no "this" for the product to
  // suit, and an invitation to add a pet belongs to the app, not to a card
  // about whether a bag of food fits an animal that does not exist yet.
  if (!pet?.name) return null;

  const copy = level ? LEVEL_COPY[level] : null;
  const duration = estimateBagDuration({ bagWeightText: productWeight, petWeightKg: pet.weight });
  const missingWeight = !(typeof pet.weight === "number" && pet.weight > 0);

  return (
    <div className="rounded-3xl border border-mipo-line p-4">
      <div className="flex items-start gap-2.5">
        {copy ? (
          <copy.Icon className={`mt-0.5 h-4 w-4 shrink-0 ${copy.tone}`} strokeWidth={1.9} />
        ) : (
          <PawPrint className="mt-0.5 h-4 w-4 shrink-0 text-mipo-muted" strokeWidth={1.7} />
        )}
        <div className="min-w-0 flex-1">
          <p className={`text-[15px] font-semibold ${copy ? copy.tone : "text-mipo-ink"}`}>
            {copy ? `${copy.label}${pet.name}` : `לגבי ${pet.name}`}
          </p>
          {/* The inputs, under the verdict. */}
          <p className="mt-0.5 text-[12px] leading-5 text-mipo-muted">{basisOf(pet).join(" · ")}</p>
        </div>
        {score !== null && (
          <span className="shrink-0 text-[13px] font-semibold tabular-nums text-mipo-muted">
            {score.toFixed(1)}/10
          </span>
        )}
      </div>

      {note && <p className="mt-2.5 text-[12px] leading-5 text-mipo-muted">{note}</p>}

      {/* How long the bag lasts. It turns a bag SIZE into a decision, which is
          the canvas's own reason for it: "הופך גודל שק להחלטה". */}
      {duration && (
        <p className="mt-2.5 border-t border-mipo-line pt-2.5 text-[12px] leading-5 text-mipo-ink">
          שק של {duration.bagKg} ק״ג מספיק ל{pet.name} לכ־
          <span className="font-semibold">{duration.days} ימים</span>
          {" "}— {duration.dailyGrams} גרם ביום.
          {/* NEVER presented as the manufacturer's. It is arithmetic on the
              animal's body weight, and feedingGuidance.ts holds the same line
              for the catalogue's own guide. */}
          <span className="text-mipo-muted"> הערכה לפי משקל, לא הנחיית יצרן.</span>
        </p>
      )}

      {/* The invitation. One line, and it names the single field that would
          change the answer. */}
      {!duration && missingWeight && productWeight && pet.id && (
        <p className="mt-2.5 border-t border-mipo-line pt-2.5 text-[12px] leading-5 text-mipo-muted">
          {/* /edit-pet/:petId, and the first version of this said
              /pet/:id/edit — which the router matches with
              `{ path: "/pet/:petId/*", element: <Navigate to="/" /> }`, so the
              invitation would have silently dropped the shopper on the home
              page mid-purchase. A dead link is invisible in a screenshot. */}
          <Link to={`/edit-pet/${pet.id}`} className="font-medium text-mipo-ink underline underline-offset-4">
            הוסיפו את המשקל של {pet.name}
          </Link>
          {" "}ונדע להגיד כמה זמן השק הזה יחזיק.
        </p>
      )}
    </div>
  );
};
