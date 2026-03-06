import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Factory, Package, TrendingUp, Shield, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type Mode = "login" | "register";

const FactoryAuth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("CN");
  const [description, setDescription] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) navigate("/factory");
    });
  }, [navigate]);

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate("/factory");
    } catch (err: any) {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email || !password || !companyName || !contactName) {
      toast({ title: "שדות חובה", description: "נא למלא את כל שדות החובה", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/factory` },
      });
      if (authError) throw authError;

      if (authData.user) {
        const { error: supplierError } = await (supabase as any)
          .from("suppliers")
          .insert({
            user_id: authData.user.id,
            name: companyName,
            contact_name: contactName,
            email,
            phone: phone || null,
            country,
            company_description: description || null,
            supplier_type: "merchandise",
            is_active: true,
            verification_status: "pending",
          });
        if (supplierError) throw supplierError;
      }

      toast({ title: "ההרשמה הצליחה!", description: "נא לאמת את כתובת האימייל שלך כדי להתחיל." });
    } catch (err: any) {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Factory className="w-6 h-6 text-primary" strokeWidth={1.5} />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold text-foreground">
                Pet<span className="text-primary">ID</span> Factory
              </h1>
              <p className="text-sm text-muted-foreground">Supplier Portal</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground mt-4">
            <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5" strokeWidth={1.5} /> Upload Products</span>
            <span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" strokeWidth={1.5} /> Track Orders</span>
            <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5" strokeWidth={1.5} /> Secure Payments</span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          {/* Mode Toggle */}
          <div className="flex bg-muted rounded-lg p-1 mb-6">
            <button
              onClick={() => setMode("login")}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === "login" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Login
            </button>
            <button
              onClick={() => setMode("register")}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === "register" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Register
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="text-foreground text-sm">Email *</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="factory@example.com"
                className="bg-input border-border text-foreground"
              />
            </div>

            <div>
              <Label className="text-foreground text-sm">Password *</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-input border-border text-foreground"
              />
            </div>

            {mode === "register" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="space-y-4"
              >
                <div>
                  <Label className="text-foreground text-sm">Company Name *</Label>
                  <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Your Factory Name" className="bg-input border-border text-foreground" />
                </div>
                <div>
                  <Label className="text-foreground text-sm">Contact Name *</Label>
                  <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Full Name" className="bg-input border-border text-foreground" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-foreground text-sm">Phone</Label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+86..." className="bg-input border-border text-foreground" />
                  </div>
                  <div>
                    <Label className="text-foreground text-sm">Country</Label>
                    <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="CN" className="bg-input border-border text-foreground" />
                  </div>
                </div>
                <div>
                  <Label className="text-foreground text-sm">Company Description</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does your factory produce?" className="bg-input border-border text-foreground min-h-[80px]" />
                </div>
              </motion.div>
            )}

            <Button
              onClick={mode === "login" ? handleLogin : handleRegister}
              disabled={loading}
              className="w-full font-semibold py-5 rounded-xl"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === "login" ? "Sign In" : "Create Account"}
            </Button>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          © PetID Factory Portal • Secure & Verified
        </p>
      </motion.div>
    </div>
  );
};

export default FactoryAuth;
