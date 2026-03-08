import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Smartphone } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toE164, toDisplayFormat, isValidIsraeliPhone } from "@/utils/phoneFormat";

export const PhoneLoginForm = () => {
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [generalError, setGeneralError] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  useEffect(() => {
    if (codeSent && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [codeSent]);

  // Auto-verify when all digits entered
  useEffect(() => {
    if (otp.every(d => d) && codeSent && !loading) {
      verifyOtp();
    }
  }, [otp, codeSent, loading]);

  const sendOtp = async () => {
    setPhoneError("");
    setGeneralError("");

    if (!phone.trim()) {
      setPhoneError("נדרש מספר טלפון");
      return;
    }

    if (!isValidIsraeliPhone(phone)) {
      setPhoneError("מספר טלפון ישראלי לא תקין");
      return;
    }

    setLoading(true);
    try {
      const e164 = toE164(phone);
      const { error } = await supabase.auth.signInWithOtp({ phone: e164 });

      if (error) {
        if (error.message.includes("Signups not allowed")) {
          setGeneralError("משתמש לא נמצא. יש להירשם קודם.");
        } else {
          setGeneralError(error.message);
        }
        setLoading(false);
        return;
      }

      setCodeSent(true);
      setResendCountdown(60);
      toast({ title: "קוד נשלח! 📱", description: `קוד אימות נשלח ל-${toDisplayFormat(phone)}` });
    } catch {
      setGeneralError("שגיאה בשליחת הקוד. נסה שוב.");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setLoading(true);
    setGeneralError("");

    try {
      const otpCode = otp.join("");
      const e164 = toE164(phone);

      const { data, error } = await supabase.auth.verifyOtp({
        phone: e164,
        token: otpCode,
        type: "sms",
      });

      if (error) {
        setGeneralError(
          error.message.includes("expired") || error.message.includes("invalid")
            ? "הקוד שגוי או שפג תוקפו. נסה שוב."
            : error.message
        );
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        setLoading(false);
        return;
      }

      if (data.session) {
        toast({ title: "התחברת בהצלחה! ✅", description: "ברוכים השבים!" });
        navigate("/");
      }
    } catch {
      setGeneralError("אירעה שגיאה לא צפויה.");
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      } else {
        const newOtp = [...otp];
        newOtp[index] = "";
        setOtp(newOtp);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newOtp = [...otp];
    pastedData.split("").forEach((digit, index) => {
      if (index < 6) newOtp[index] = digit;
    });
    setOtp(newOtp);
    const nextEmpty = newOtp.findIndex(d => !d);
    inputRefs.current[nextEmpty === -1 ? 5 : nextEmpty]?.focus();
  };

  if (codeSent) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        {generalError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg text-center"
          >
            {generalError}
          </motion.div>
        )}

        <div className="text-center space-y-1">
          <p className="text-sm text-muted-foreground">הזן את הקוד בן 6 הספרות שנשלח ל</p>
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
              onChange={(e) => handleOtpChange(index, e.target.value)}
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
                setOtp(["", "", "", "", "", ""]);
                sendOtp();
              }
            }}
            disabled={loading || resendCountdown > 0}
            className="w-full"
          >
            {resendCountdown > 0 ? `שלח שוב בעוד ${resendCountdown} שניות` : "שלח קוד שוב"}
          </Button>

          <button
            type="button"
            onClick={() => {
              setCodeSent(false);
              setOtp(["", "", "", "", "", ""]);
              setGeneralError("");
            }}
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            disabled={loading}
          >
            שנה מספר טלפון
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        sendOtp();
      }}
      className="space-y-3"
      noValidate
    >
      {generalError && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg text-center"
        >
          {generalError}
        </motion.div>
      )}

      <div>
        <div className="relative">
          <Smartphone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="tel"
            placeholder="מספר טלפון (למשל 050-1234567)"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setPhoneError("");
              setGeneralError("");
            }}
            disabled={loading}
            className={`h-10 bg-muted/50 border border-border rounded-lg text-sm pr-10 text-right ${
              phoneError ? "border-destructive" : ""
            }`}
            autoComplete="tel"
            dir="rtl"
          />
        </div>
        {phoneError && (
          <p className="text-xs text-destructive mt-1 text-right">{phoneError}</p>
        )}
      </div>

      <Button
        type="submit"
        variant="instagram"
        size="default"
        disabled={loading || !phone.trim()}
        className="w-full h-10"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "שלח קוד אימות"}
      </Button>
    </form>
  );
};
