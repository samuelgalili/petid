import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Download, CheckCircle2, Shield, Heart, Brain, ShoppingBag,
  ChevronDown, Share, Plus, Sparkles, Star, ArrowLeft } from
"lucide-react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import heroImage from "@/assets/landing-hero.jpg";
import { PetidLogo } from "@/components/PetidLogo";

// Fade-in on scroll wrapper
const ScrollReveal = ({ children, delay = 0, className = "" }: {children: React.ReactNode;delay?: number;className?: string;}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}>

      {children}
    </motion.div>);

};

const Install = () => {
  const navigate = useNavigate();
  const { isInstallable, isInstalled, installPWA } = usePWAInstall();
  const [isInstalling, setIsInstalling] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const handleInstall = async () => {
    setIsInstalling(true);
    await installPWA();
    setIsInstalling(false);
  };

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  const features = [
  {
    icon: Heart,
    title: "פיד חברתי",
    description: "שתפו את האהבה עם הקהילה",
    gradient: "from-pink-500 to-rose-500"
  },
  {
    icon: Brain,
    title: "AI Scientist",
    description: "ניטור בריאות בזמן אמת וייעוץ חכם",
    gradient: "from-primary to-accent"
  },
  {
    icon: ShoppingBag,
    title: "חנות חכמה",
    description: "רק המוצרים הטובים והמאומתים לחיית המחמד שלכם",
    gradient: "from-amber-500 to-orange-500"
  }];


  return (
    <div className="min-h-screen bg-background overflow-x-hidden" dir="rtl">
      {/* ===== HERO SECTION ===== */}
      <section ref={heroRef} className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Parallax background image */}
        <motion.div style={{ y: heroY }} className="absolute inset-0 -top-20">
          <img
            src={heroImage}
            alt="חיות מחמד מאושרות"
            className="w-full h-[120%] object-cover" />

          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-background" />
        </motion.div>

        {/* Hero content */}
        <motion.div
          style={{ opacity: heroOpacity }}
          className="relative z-10 text-center px-6 max-w-2xl mx-auto">

          {/* Logo badge */}
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", delay: 0.3, stiffness: 200 }}
            className="mb-8 flex flex-col items-center">

            <PetidLogo showAnimals={false} size="lg" />
            <h2 className="text-4xl md:text-5xl font-black text-white mt-4 tracking-tight flex items-center gap-2" style={{ fontFamily: "'Poppins', 'Heebo', sans-serif" }}>
              Pet<span className="bg-gradient-to-l from-primary to-accent bg-clip-text text-transparent">ID</span>
              
            </h2>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="text-4xl md:text-6xl font-black text-white mb-4 leading-tight">

            טיפול בחיות מחמד.
            <br />
            <span className="bg-gradient-to-l from-primary to-accent bg-clip-text text-transparent">
              מחדש.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className="text-lg md:text-xl text-white/80 mb-10 max-w-md mx-auto leading-relaxed">

            הרשת החברתית שדואגת לבריאות חיית המחמד שלכם עם תובנות מבוססות AI
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.8 }}
            className="flex flex-col items-center gap-4">

            {isInstalled ?
            <Button
              onClick={() => navigate("/")}
              size="xl"
              className="bg-card text-foreground hover:bg-card/90 font-bold gap-2 shadow-2xl">

                <CheckCircle2 className="w-5 h-5 text-green-500" />
                מותקן! כניסה לאפליקציה
              </Button> :
            isInstallable ?
            <Button
              onClick={handleInstall}
              disabled={isInstalling}
              size="xl"
              className="bg-card text-foreground hover:bg-card/90 font-bold gap-2 shadow-2xl">

                <Download className="w-5 h-5" />
                {isInstalling ? "מתקין..." : "הוסיפו למסך הבית"}
              </Button> :

            <Button
              onClick={() => setShowIOSGuide(true)}
              size="xl"
              className="bg-card text-foreground hover:bg-card/90 font-bold gap-2 shadow-2xl">

                <Download className="w-5 h-5" />
                הוסיפו למסך הבית
              </Button>
            }

            <button
              onClick={() => navigate("/auth")}
              className="text-white/60 hover:text-white text-sm underline underline-offset-4 transition-colors">

              או התחברו לחשבון קיים
            </button>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">

          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}>

            <ChevronDown className="w-6 h-6 text-white/50" />
          </motion.div>
        </motion.div>
      </section>

      {/* ===== FEATURES SECTION ===== */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <ScrollReveal>
            <h2 className="text-3xl md:text-4xl font-black text-foreground text-center mb-4">
              הכל במקום אחד
            </h2>
            <p className="text-muted-foreground text-center mb-16 max-w-md mx-auto">
              כלי חכם שמלווה אתכם ואת חיית המחמד שלכם — כל יום
            </p>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, index) =>
            <ScrollReveal key={feature.title} delay={index * 0.15}>
                <div className="group relative bg-card border border-border rounded-3xl p-8 hover:shadow-elevated transition-all duration-500 hover:-translate-y-1">
                  {/* Icon */}
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="w-7 h-7 text-white" strokeWidth={1.5} />
                  </div>

                  <h3 className="text-xl font-bold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                </div>
              </ScrollReveal>
            )}
          </div>
        </div>
      </section>

      {/* ===== SAFESCORE / SCIENTIST APPROVED ===== */}
      <section className="py-24 px-6 bg-muted/50">
        <div className="max-w-3xl mx-auto text-center">
          <ScrollReveal>
            {/* Glowing badge */}
            <div className="relative w-32 h-32 mx-auto mb-10">
              {/* Glow rings */}
              <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                className="absolute inset-0 rounded-full bg-primary/20" />

              <motion.div
                animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0, 0.2] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut", delay: 0.3 }}
                className="absolute inset-0 rounded-full bg-primary/10" />

              {/* Badge core */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary via-accent to-primary flex items-center justify-center shadow-2xl">
                <div className="flex flex-col items-center">
                  <Shield className="w-10 h-10 text-white mb-1" strokeWidth={1.5} />
                  <span className="text-white text-xs font-bold tracking-wider">SAFE</span>
                </div>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <h2 className="text-3xl md:text-4xl font-black text-foreground mb-4">
              מאושר על ידי <span className="text-primary">המדען</span>
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto mb-8 leading-relaxed">
              כל מוצר בחנות עובר בדיקת SafeScore — ציון בטיחות מבוסס AI שמנתח
              רכיבים, התאמה לגזע, ורגישויות — כדי שתדעו שאתם בוחרים נכון.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.4}>
            <div className="flex items-center justify-center gap-6 flex-wrap">
              {[
              { label: "מוצרים מאומתים", value: "1,200+" },
              { label: "גזעים נתמכים", value: "150+" },
              { label: "דירוג בטיחות ממוצע", value: "94%" }].
              map((stat) =>
              <div key={stat.label} className="text-center">
                  <div className="text-2xl font-black text-primary">{stat.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
                </div>
              )}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ===== TESTIMONIAL / SOCIAL PROOF ===== */}
      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto">
          <ScrollReveal>
            <div className="bg-card border border-border rounded-3xl p-8 md:p-12 text-center relative overflow-hidden">
              <Sparkles className="w-8 h-8 text-primary/30 absolute top-6 right-6" />
              <div className="flex justify-center gap-1 mb-6">
                {[...Array(5)].map((_, i) =>
                <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                )}
              </div>
              <p className="text-foreground text-lg md:text-xl leading-relaxed mb-6 italic">
                "מאז שהתחלנו להשתמש ב-PetID, הטיפול בשבע השתדרג משמעותית. ה-AI זיהה לנו רגישות למזון שלא ידענו עליה."
              </p>
              <div className="text-sm text-muted-foreground">— מיכל ושבע 🐕</div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ===== PWA INSTALL CTA ===== */}
      <section className="py-24 px-6 bg-gradient-to-b from-background to-muted/30">
        <div className="max-w-md mx-auto text-center">
          <ScrollReveal>
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 3 }}
              className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-accent mx-auto mb-8 flex items-center justify-center shadow-2xl">

              <Download className="w-10 h-10 text-white" />
            </motion.div>

            <h2 className="text-3xl font-black text-foreground mb-3">
              מוכנים להתחיל?
            </h2>
            <p className="text-muted-foreground mb-8">
              הוסיפו את PetID למסך הבית — בלחיצה אחת
            </p>

            {isInstalled ?
            <div className="space-y-4">
                <div className="bg-success/10 border border-success/30 rounded-2xl p-4 inline-flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                  <span className="text-success font-bold">האפליקציה מותקנת! 🎉</span>
                </div>
                <div>
                  <Button onClick={() => navigate("/")} size="xl" className="w-full">
                    כניסה לאפליקציה
                  </Button>
                </div>
              </div> :
            isInstallable ?
            <Button
              onClick={handleInstall}
              disabled={isInstalling}
              size="xl"
              className="w-full gap-2">

                <Download className="w-5 h-5" />
                {isInstalling ? "מתקין..." : "התקינו עכשיו"}
              </Button> :

            <Button
              onClick={() => setShowIOSGuide(true)}
              size="xl"
              className="w-full gap-2">

                <Download className="w-5 h-5" />
                הוסיפו למסך הבית
              </Button>
            }

            <button
              onClick={() => navigate("/auth")}
              className="text-muted-foreground hover:text-foreground text-sm underline underline-offset-4 transition-colors mt-4 block mx-auto">

              כבר יש לכם חשבון? התחברו
            </button>
          </ScrollReveal>

          {/* iOS Installation Guide */}
          <ScrollReveal delay={0.3}>
            <div className="mt-12 bg-card border border-border rounded-2xl p-6 text-right">
              <button
                onClick={() => setShowIOSGuide(!showIOSGuide)}
                className="flex items-center justify-between w-full">

                <span className="text-sm font-bold text-foreground">📱 איך מתקינים באייפון?</span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showIOSGuide ? "rotate-180" : ""}`} />
              </button>

              <motion.div
                initial={false}
                animate={{ height: showIOSGuide ? "auto" : 0, opacity: showIOSGuide ? 1 : 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden">

                <div className="pt-4 space-y-4 text-sm text-muted-foreground">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-bold text-xs">1</span>
                    </div>
                    <p>
                      לחצו על כפתור השיתוף <Share className="w-4 h-4 inline text-primary" /> בתחתית הדפדפן Safari
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-bold text-xs">2</span>
                    </div>
                    <p>
                      גללו למטה ובחרו <Plus className="w-4 h-4 inline text-primary" /> <strong className="text-foreground">הוסף למסך הבית</strong>
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-bold text-xs">3</span>
                    </div>
                    <p>
                      לחצו <strong className="text-foreground">הוסף</strong> — וזהו! PetID יופיע על המסך הראשי שלכם
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="py-8 px-6 border-t border-border text-center">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} PetID — כל הזכויות שמורות
        </p>
      </footer>
    </div>);

};

export default Install;