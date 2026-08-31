/**
 * Reaching a customer from the admin panel.
 *
 * WhatsApp here is a deep link, not an API call: it opens the agent's own
 * WhatsApp with the recipient and the text already filled in. That means no
 * provider, no per-message cost, and none of the Meta template rules that
 * govern business-initiated messages. It also means the message leaves from a
 * person, not from MIPO, so nothing is recorded automatically -- the caller is
 * expected to log it as a note.
 */

/**
 * Israeli numbers are stored however the customer typed them: 050-111-1111,
 * +972 50 111 1111, 00972501111111. wa.me wants bare international digits.
 * Returns null when there is nothing dialable, so callers can hide the button
 * rather than open a broken link.
 */
export const toWhatsAppNumber = (phone?: string | null): string | null => {
  let digits = String(phone || "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);

  if (digits.startsWith("972")) {
    // 972 + a national number that kept its trunk zero (+972 050 ...).
    if (digits.length === 13 && digits[3] === "0") digits = `972${digits.slice(4)}`;
  } else if (digits.startsWith("0")) {
    digits = `972${digits.slice(1)}`;
  }

  // Shortest plausible international number; anything less is a typo or an
  // extension, and dialing it would just open an empty chat.
  return digits.length >= 10 ? digits : null;
};

export const whatsAppLink = (phone?: string | null, message = ""): string | null => {
  const number = toWhatsAppNumber(phone);
  if (!number) return null;
  return message
    ? `https://wa.me/${number}?text=${encodeURIComponent(message)}`
    : `https://wa.me/${number}`;
};

export const openWhatsApp = (url: string) => {
  window.open(url, "_blank", "noopener,noreferrer");
};

/** The opening line an agent would otherwise retype on every call. */
export const customerGreeting = (fullName?: string | null) => (
  `שלום ${String(fullName || "").trim() || ""}, מדברים ממיפו.`.replace(/\s+,/, ",")
);
