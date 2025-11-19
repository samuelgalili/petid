import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      toast({
        title: "התחברות הצליחה",
        description: "ברוך הבא בחזרה!",
      });
      
      navigate("/add-pet");
    } catch (error: any) {
      toast({
        title: "שגיאה",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <Card className="w-full max-w-md border shadow-sm">
        <CardHeader className="text-center space-y-2 pb-6">
          <CardTitle className="text-2xl font-semibold text-foreground">
            התחברות
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="h-11"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="הכנס סיסמה"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={loading}
                className="h-11"
              />
            </div>

            <div className="flex items-center space-x-2 space-x-reverse">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                disabled={loading}
              />
              <Label
                htmlFor="remember"
                className="text-sm font-normal cursor-pointer"
              >
                Remember me
              </Label>
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  מתחבר...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
          
          <div className="mt-6 space-y-3 text-center text-sm">
            <button
              type="button"
              onClick={() => toast({
                title: "בקרוב",
                description: "פיצ'ר שחזור סיסמה יתווסף בקרוב",
              })}
              className="text-blue-600 hover:text-blue-700 hover:underline font-medium transition-colors"
              disabled={loading}
            >
              Forgot password?
            </button>
            
            <div className="text-muted-foreground">
              אין לך חשבון?{" "}
              <button
                type="button"
                onClick={() => toast({
                  title: "בקרוב",
                  description: "עמוד הרשמה יתווסף בקרוב",
                })}
                className="text-blue-600 hover:text-blue-700 hover:underline font-medium transition-colors"
                disabled={loading}
              >
                Create account
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
