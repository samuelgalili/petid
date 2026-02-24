import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toE164, toDisplayFormat } from "@/utils/phoneFormat";

interface PhoneOtpVerificationProps {
  phone: string;
  onVerified: (e164Phone: string) => void;
  onCancel: () => void;
  /** 'signup' uses signInWithOtp, 'update' uses updateUser + verifyOtp */
  mode: "signup" | "update";
}

export const PhoneOtpVerification = ({ phone, onVerified, onCancel, mode }: PhoneOtpVerificationProps) => {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);
  const [codeSent, setCodeSent] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const sendingRef = useRef(false);
  const verifyingRef = useRef(false);
  const e164Phone = toE164(phone);

  // Countdown timer
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  // Auto-focus first input when code is sent
  useEffect(() => {
    if (codeSent && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [codeSent]);

  // Auto-verify when all 6 digits entered
  useEffect(() => {
    if (otp.every(d => d) && codeSent && !loading && !verifyingRef.current) {
      verifyCode();
    }
  }, [otp, codeSent, loading]);

  const sendCode = async () => {
    if (sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    setError("");
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signInWithOtp({ phone: e164Phone });
        if (error) {
          setError(error.message === "Signups not allowed for otp" 
            ? "שירות SMS לא מוגדר. נסה להירשם באימייל או וואטסאפ." 
            : error.message);
          setSending(false);
          sendingRef.current = false;
          return;
        }
      } else {
        const { error } = await supabase.auth.updateUser({ phone: e164Phone });
        if (error) {
          setError(error.message);
          setSending(false);
          sendingRef.current = false;
          return;
        }
      }
      setCodeSent(true);
      setResendCountdown(60);
    } catch {
      setError("שגיאה בשליחת הקוד. נסה שוב.");
    } finally {
      setSending(false);
      sendingRef.current = false;
    }
  };

  const verifyCode = async () => {
    setLoading(true);
    setError("");
    try {
      const otpCode = otp.join('');

      if (mode === "signup") {
        const { error } = await supabase.auth.verifyOtp({
          phone: e164Phone,
          token: otpCode,
          type: 'sms',
        });
        if (error) {
          setError(error.message === "Token has expired or is invalid" 
            ? "הקוד שגוי או שפג תוקפו. נסה שוב." 
            : error.message);
          resetOtp();
          setLoading(false);
          return;
        }
      } else {
        const { error } = await supabase.auth.verifyOtp({
          phone: e164Phone,
          token: otpCode,
          type: 'phone_change',
        });
        if (error) {
          setError(error.message === "Token has expired or is invalid"
            ? "הקוד שגוי או שפג תוקפו. נסה שוב."
            : error.message);
          resetOtp();
          setLoading(false);
          return;
        }
      }

      onVerified(e164Phone);
    } catch {
      setError("אירעה שגיאה לא צפויה.");
      resetOtp();
    } finally {
      setLoading(false);
    }
  };

  const resetOtp = () => {
    setOtp(["", "", "", "", "", ""]);
    inputRefs.current[0]?.focus();
  };

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      } else {
        const newOtp = [...otp];
        newOtp[index] = "";
        setOtp(newOtp);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = [...otp];
    pastedData.split('').forEach((digit, index) => {
      if (index < 6) newOtp[index] = digit;
    });
    setOtp(newOtp);
    const nextEmpty = newOtp.findIndex(d => !d);
    inputRefs.current[nextEmpty === -1 ? 5 : nextEmpty]?.focus();
  };

  // Initial send
  useEffect(() => {
    if (!codeSent) sendCode();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {error && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg text-center">
          {error}
        </div>
      )}

      {!codeSent && sending ? (
        <div className="flex flex-col items-center gap-2 py-4">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">שולח קוד אימות...</p>
        </div>
      ) : codeSent ? (
        <>
          <div className="text-center space-y-1">
            <p className="text-sm text-muted-foreground">
              הזן את הקוד בן 6 הספרות שנשלח למספר
            </p>
            <p className="text-sm font-semibold text-foreground" dir="ltr">
              {toDisplayFormat(phone)}
            </p>
          </div>

          {/* OTP Input */}
          <div className="flex justify-center gap-2" dir="ltr">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                disabled={loading}
                className="w-11 h-13 text-center text-xl font-semibold bg-muted border border-border rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all disabled:opacity-50"
                aria-label={`ספרה ${index + 1}`}
              />
            ))}
          </div>

          {loading && (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">מאמת...</span>
            </div>
          )}

          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (resendCountdown === 0) {
                  resetOtp();
                  sendCode();
                }
              }}
              disabled={loading || resendCountdown > 0}
              className="w-full"
            >
              {resendCountdown > 0 ? `שלח שוב בעוד ${resendCountdown} שניות` : "שלח קוד שוב"}
            </Button>

            <button
              type="button"
              onClick={onCancel}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              disabled={loading}
            >
              ביטול
            </button>
          </div>
        </>
      ) : null}
    </motion.div>
  );
};
