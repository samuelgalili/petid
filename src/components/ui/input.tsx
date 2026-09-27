import * as React from "react";

import { cn } from "@/lib/utils";

// Latin and digits are written left to right. On a Hebrew page, dir alone is
// not enough: text-right still pins the caret to the right. The placeholder
// stays on the right, which is where a Hebrew hint belongs.
const LTR_TYPES = new Set(["email", "password", "tel", "url", "number"]);
const LTR_AUTOCOMPLETE = /^(email|username|tel|tel-national|tel-local|current-password|new-password|one-time-code|postal-code|url)$/;
const LTR_INPUT_MODE = new Set(["email", "tel", "url", "numeric", "decimal"]);

const isLtrValue = (
  type: string | undefined,
  autoComplete: string | undefined,
  inputMode: React.HTMLAttributes<HTMLInputElement>["inputMode"],
) => {
  if (type && LTR_TYPES.has(type)) return true;
  if (inputMode && LTR_INPUT_MODE.has(inputMode)) return true;
  return Boolean(autoComplete && LTR_AUTOCOMPLETE.test(autoComplete));
};

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, autoComplete, inputMode, dir, ...props }, ref) => {
    const ltr = isLtrValue(type, autoComplete, inputMode);
    return (
      <input
        type={type}
        autoComplete={autoComplete}
        inputMode={inputMode}
        dir={ltr ? "ltr" : dir}
        className={cn(
          "flex h-11 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all",
          className,
          ltr && "text-left [direction:ltr] placeholder:text-right placeholder:[unicode-bidi:plaintext]",
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
