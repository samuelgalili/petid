/**
 * Customer checkout is not gated on a verified email.
 *
 * A person who just signed up must be able to place an order and continue
 * to Cardcom. A guest already can: this route accepts an order with no
 * account at all. The confirmation mail goes to the address on the order
 * after payment; the invoice Cardcom may email uses that same address, which
 * a guest can already set. Refusing the signed-in customer stopped the sale
 * and did not stop anyone else from naming an address.
 *
 * Verification is requested after the order is stored. A failure to send
 * that mail must not undo the order. Admin placement is unchanged: a phone
 * order does not fire a verification mail mid-call.
 *
 * This module does not decide payment amounts or webhook signatures.
 */

import { verifyOpaqueToken } from "./security.js";
import { verifyOrderTrackingToken } from "./orderTrackingToken.js";

export const shouldRequestVerificationAfterOrder = ({ currentUser, placedByAdmin } = {}) => {
  if (!currentUser?.id || placedByAdmin) return false;
  return !currentUser.email_verified_at;
};

/**
 * Who may see one order.
 *
 * The signed-in buyer always may. The guest token from checkout may, and it
 * is also what starts a payment, so it stays valid when `allowTrackingToken`
 * is false. The mail link is narrower: it is accepted only for a read, and
 * only for the order id baked into the signature.
 */
export const grantsOrderAccess = ({
  sessionUserId = null,
  order,
  accessToken,
  trackingSecret = "",
  allowTrackingToken = false,
  now = Date.now(),
} = {}) => {
  if (sessionUserId && order?.user_id && sessionUserId === order.user_id) return true;
  if (verifyOpaqueToken(accessToken, order?.accessTokenHash)) return true;
  if (!allowTrackingToken) return false;
  return verifyOrderTrackingToken(accessToken, order, trackingSecret, now);
};
