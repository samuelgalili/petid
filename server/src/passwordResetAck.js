// One sentence for every accepted reset request: an address we have never
// seen, an address that is locked, and an address we actually mailed. A
// different body for the locked case would say the account exists.
export const PASSWORD_RESET_NEUTRAL_MESSAGE = "If an account exists for this address, a code will be sent";

export const passwordResetAcknowledgement = ({
  emailDelivery,
  debugOtp,
  production,
} = {}) => ({
  ok: true,
  message: PASSWORD_RESET_NEUTRAL_MESSAGE,
  email_delivery: production ? "sent" : emailDelivery,
  ...(debugOtp ? { debug_otp: debugOtp } : {}),
});
