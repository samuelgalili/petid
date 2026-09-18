import { test, expect } from "@playwright/test";

import { buttonVariants } from "../src/components/ui/button";

/**
 * The CTA is ink. Measured in a browser, not read out of the source.
 *
 * server/test/purchaseCta.test.js asserted that the cart's checkout button
 * carries `mipo-cta-button`. It did carry it. It was cyan anyway, and stayed
 * cyan through five deploys, because the class was never the thing that
 * decided the colour:
 *
 *   @layer components  ->  .mipo-cta-button { background: hsl(var(--mipo-ink)) }
 *   @layer utilities   ->  .bg-primary      { background-color: hsl(var(--primary)) }
 *
 * Utilities are emitted after components. One class each, so they tie on
 * specificity and the later one wins. shadcn's <Button> puts `bg-primary` on
 * anything that does not name another variant, and tailwind-merge cannot drop
 * it because it has never heard of `mipo-cta-button`.
 *
 * No amount of grepping .tsx files finds that, because every class involved is
 * correct on its own. It is only wrong once a browser resolves the cascade.
 * So this asks a browser, against the same dist/ the deploy is about to ship.
 *
 * `buttonVariants` is imported rather than copied so the test keeps tracking
 * what <Button> actually emits. A new default variant, a renamed token, an
 * extra `bg-` in the base string - the test sees it because it is the same
 * function the app calls.
 */

/** What <Button className="mipo-cta-button ..."> ships, exactly. */
const checkoutButtonClasses = buttonVariants({
  className: "mipo-cta-button h-14 w-full gap-3 rounded-2xl text-lg",
});

/**
 * Resolve two colours in the page's own terms: what `--mipo-ink` paints and
 * what `--primary` paints. Comparing to a literal "rgb(20, 20, 25)" would go
 * stale the day someone retunes the token, and would fail for the right
 * reading in dark mode, where ink and surface invert.
 */
const measure = async (page: import("@playwright/test").Page, classes: string) =>
  page.evaluate((cls) => {
    const probe = (css: string) => {
      const el = document.createElement("div");
      el.style.background = css;
      document.body.appendChild(el);
      const value = getComputedStyle(el).backgroundColor;
      el.remove();
      return value;
    };

    const button = document.createElement("button");
    button.className = cls;
    button.textContent = "המשך לתשלום";
    document.body.appendChild(button);
    const style = getComputedStyle(button);
    const result = {
      background: style.backgroundColor,
      color: style.color,
      height: style.height,
      radius: style.borderTopLeftRadius,
      ink: probe("hsl(var(--mipo-ink))"),
      surface: probe("hsl(var(--mipo-surface))"),
      primary: probe("hsl(var(--primary))"),
    };
    button.remove();
    return result;
  }, classes);

test.describe("the primary CTA", () => {
  test("is filled with ink, not with the cyan brand colour", async ({ page }) => {
    await page.goto("/");

    const seen = await measure(page, checkoutButtonClasses);

    expect(
      seen.background,
      `The CTA painted ${seen.background}. Ink is ${seen.ink} and the cyan --primary ` +
        `is ${seen.primary}.\n\nIf this says cyan, a utility class beat ` +
        ".mipo-cta-button in the cascade\nagain. The fix is specificity in " +
        "src/index.css (.mipo-cta-button.mipo-cta-button),\nnot another class on " +
        "the button.",
    ).toBe(seen.ink);

    expect(seen.background, "the CTA is wearing --primary").not.toBe(seen.primary);
    expect(seen.color, "CTA text must be the surface colour, so it inverts with the theme").toBe(seen.surface);
  });

  test("still lets the call site set its own size and radius", async ({ page }) => {
    // The specificity fix covers the COLOURS only. If someone widens it to the
    // whole rule, every CTA snaps back to min-height 3.25rem and the pill
    // radius, and the cart's h-14 rounded-2xl button silently changes shape.
    await page.goto("/");

    const seen = await measure(page, checkoutButtonClasses);

    expect(seen.height, "h-14 lost to the component rule").toBe("56px");
    expect(seen.radius, "rounded-2xl lost to border-radius: 999px").not.toBe("999px");
  });

  test("inverts in dark mode instead of going white on white", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => document.documentElement.classList.add("dark"));

    const seen = await measure(page, checkoutButtonClasses);

    // ink and surface swap between the themes, so the assertion is the same
    // one and the numbers are different. What must never happen is the two
    // ending up equal - that is an invisible button.
    expect(seen.background).toBe(seen.ink);
    expect(seen.color).toBe(seen.surface);
    expect(seen.background, "ink and surface resolved to the same colour in dark mode").not.toBe(seen.color);
  });
});
