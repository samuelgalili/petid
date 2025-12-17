import { ArrowRight, FileText, Shield, Scale, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import { motion } from "framer-motion";

const Terms = () => {
  const navigate = useNavigate();

  const sections = [
    {
      icon: FileText,
      title: "שימוש מותר",
      items: [
        "ניהול פרופילים של חיות מחמד",
        "שיתוף תוכן ברשת החברתית",
        "רכישת מוצרים בחנות",
        "שימוש בשירותי המועדון",
      ],
    },
    {
      icon: Shield,
      title: "תוכן משתמשים",
      content: "אתם אחראים לתוכן שאתם מעלים. אין להעלות תוכן פוגעני, לא חוקי או מפר זכויות יוצרים.",
    },
    {
      icon: Scale,
      title: "קניין רוחני",
      content: "כל הזכויות באפליקציה, כולל עיצוב, לוגו ותוכן, שמורות ל-PetiID.",
    },
    {
      icon: AlertCircle,
      title: "הגבלת אחריות",
      content: "השירות מסופק 'כמות שהוא'. איננו אחראים לנזקים הנובעים משימוש באפליקציה.",
    },
  ];

  return (
    <div className="min-h-screen bg-surface pb-24" dir="rtl">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ArrowRight className="w-5 h-5" strokeWidth={1.5} />
          </Button>
          <h1 className="text-xl font-bold text-foreground font-jakarta">תנאי שימוש</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-yellow rounded-2xl p-6 text-center"
        >
          <FileText className="w-12 h-12 mx-auto mb-3 text-neutral-dark" />
          <h2 className="text-lg font-bold text-neutral-dark font-jakarta mb-2">
            תנאי השימוש באפליקציית PetiID
          </h2>
          <p className="text-sm text-neutral-dark/80 font-jakarta">
            ברוכים הבאים! השימוש באפליקציה מהווה הסכמה לתנאים אלה.
          </p>
        </motion.div>

        {/* Sections */}
        {sections.map((section, index) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="card-base rounded-xl p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <section.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-bold text-foreground font-jakarta">{section.title}</h3>
            </div>
            {section.items ? (
              <ul className="space-y-2 text-muted-foreground font-jakarta text-sm mr-4">
                {section.items.map((item, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground font-jakarta leading-relaxed">
                {section.content}
              </p>
            )}
          </motion.div>
        ))}

        {/* Footer */}
        <div className="text-center pt-4">
          <p className="text-xs text-muted-foreground/60 font-jakarta">
            עודכן לאחרונה: דצמבר 2025
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Terms;