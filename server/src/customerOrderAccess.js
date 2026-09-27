/**
 * Customer checkout is not gated on a verified email.
 *
 * A person who just signed up must be able to place an order and continue
 * to Cardcom. A guest already can: this route accepts an order with no
 * account at all. The app does not send its own order confirmation; the
 * invoice Cardcom may email uses the address typed at checkout, which a
 * guest can already set. Refusing the signed-in customer stopped the sale
 * and did not stop anyone else from naming an address.
 *
 * Verification is requested after the order is stored. A failure to send
 * that mail must not undo the order. Admin placement is unchanged: a phone
 * order does not fire a verification mail mid-call.
 *
 * This module does not decide payment amounts or webhook signatures.
 */

export const shouldRequestVerificationAfterOrder = ({ currentUser, placedByAdmin } = {}) => {
  if (!currentUser?.id || placedByAdmin) return false;
  return !currentUser.email_verified_at;
};
