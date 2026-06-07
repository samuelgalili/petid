# MIPO Onboarding + Living Avatar — Plan

Match the 4 reference screens 1:1, generate a stylized AI avatar from the user's pet photo, and use that avatar across the entire app.

## 1. Brand → MIPO

- Update visible app name strings to **MIPO** ("My Precious One 🐾"). Replace "Petid"/"PetID" in titles, splash, headers, manifest, index.html `<title>`/meta, OnboardingFlow copy.
- Add new logo asset `src/assets/mipo-logo.svg` matching the uploaded reference (M with gradient #C47B5A → #9B6BAE → #4A90C4 + dot).
- Add light gradient button style (white pill, soft pink/blue glow shadow) as a reusable `Button` variant `mipo` in design system. Use semantic tokens — add gradient + glow tokens to `index.css` / `tailwind.config.ts`.

## 2. New Onboarding Flow (4 screens, 1:1)

New component tree under `src/components/onboarding/mipo/`:

```text
MipoOnboarding.tsx        # state machine (5 steps: splash → upload → analyzing → avatar → details → done)
steps/SplashStep.tsx      # Screen 01 — MIPO logo + tagline + "Get Started"
steps/PhotoStep.tsx       # Photo picker (camera/upload)
steps/AnalyzingStep.tsx   # Screen 02 — user's photo in rounded frame + animated aurora ring + "Analyzing..." + detected breed
steps/AvatarStep.tsx      # Screen 03 — generated avatar fades in, "Meet your pet's avatar" + Back/Next
steps/DetailsStep.tsx     # Screen "Tell us about your pet" + Pet Details / Save
steps/CompleteStep.tsx    # "Setup Complete!" + Let's Go
```

Screen specs:
- **Splash**: white bg, MIPO logo SVG centered, "Welcome to MIPO / Let's get started!", pill button with soft glow.
- **Analyzing**: rounded square photo + circular aurora ring SVG animation (pulse), label "Detected: <Breed>" (breed in gradient text), Retake / Continue.
- **Avatar reveal**: full-body generated avatar centered, headline + subtle subtitle, Back / Next.
- **Pet Details**: form (Name input, Breed input prefilled, Age segmented [Puppy/Adult/Senior], Gender [Male/Female]) on the left, avatar standing on the right (mobile = stacked). Continue button bottom.
- **Setup Complete**: aurora check medallion + headline + "Let's Go!" + avatar bottom-right corner.

All screens use one shared `MipoShell` for consistent padding, gradient buttons, soft shadows.

## 3. Avatar Generation

- New edge function `supabase/functions/generate-pet-avatar/index.ts`.
- Input: pet photo (base64 / data URL) + detected breed + name.
- Calls Lovable AI Gateway `/v1/images/generations` with `openai/gpt-image-2`, quality `high`, `stream: false` (we await final image), prompt instructs: studio-quality stylized portrait of THIS pet, full body, clean white background, slight sparkle aura, soft pastel rim light, matching uploaded reference style.
- Returns base64 PNG.
- Client stores it via existing `upload-avatar` function → saved to `pets.avatar_url` so it persists across sessions.
- Existing `detect-breed` function reused for the analyzing step.

## 4. Living Avatar Everywhere

The saved `avatar_url` already feeds `useActivePet`. To make the avatar truly "follow" the user, add a small persistent companion component:

- `src/components/mipo/AvatarCompanion.tsx` — floating ~64px avatar bubble pinned above the BottomNav center, gentle bobbing animation, tap opens AI Chat (existing route). Hidden on auth/onboarding screens.
- Mount once in `App.tsx` (or main layout) behind a feature flag `mipoOnboardingComplete`.
- Reuse existing `PetCenterDashboard` for the profile page (already uses `avatar_url`).

## 5. Wiring

- `useOnboarding` extended with `petAvatarReady` flag (localStorage `mipo-onboarding-complete`).
- Replace `OnboardingFlow` mount in `App.tsx` with `MipoOnboarding` when no pet exists yet.
- After completion: redirect to `/feed`, companion appears.

## Out of scope (this turn)

- Translating tagline to ZH (only HE/EN strings updated now).
- Reworking Feed / Shop / Chat layouts — only the companion is added; deeper screen redesigns come in follow-up turns per the original phased plan.
- Auth screens — separate phase.

## Reporting

After this turn I'll report what shipped and ask before moving to the next phase (Feed + BottomNav + Parallel Life).
