import { ArrowRight, MessageCircle, Phone, Mail, FileText, HelpCircle, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import { motion } from "framer-motion";

const Support = () => {
  const navigate = useNavigate();

  const supportOptions = [
    {
      icon: MessageCircle,
      title: "צ'אט עם נציג",
      description: "זמין בימים א'-ה' 9:00-18:00",
      action: () => navigate("/chat"),
      color: "bg-icon-blue/10",
      iconColor: "text-icon-blue",
    },
    {
      icon: Phone,
      title: "התקשרו אלינו",
      description: "*5678",
      action: () => window.open("tel:*5678"),
      color: "bg-icon-green/10",
      iconColor: "text-icon-green",
    },
    {
      icon: Mail,
      title: "שלחו אימייל",
      description: "support@petid.co.il",
      action: () => window.open("mailto:support@petid.co.il"),
      color: "bg-icon-orange/10",
      iconColor: "text-icon-orange",
    },
  ];

  const faqItems = [
    { question: "איך מצטרפים למועדון?", answer: "ההצטרפות למועדון חינמית ומתבצעת באפליקציה." },
    { question: "איך צוברים נקודות?", answer: "על כל רכישה תקבלו נקודות בהתאם לסכום." },
    { question: "איך מממשים הטבות?", answer: "גשו לעמוד ההטבות ובחרו את ההטבה הרצויה." },
    { question: "מה תוקף הנקודות?", answer: "נקודות תקפות ל-12 חודשים מיום הצבירה." },
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
          <h1 className="text-xl font-bold text-foreground font-jakarta">תמיכה ועזרה</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Hero Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-yellow rounded-2xl p-6 text-center"
        >
          <HelpCircle className="w-12 h-12 mx-auto mb-3 text-neutral-dark" />
          <h2 className="text-lg font-bold text-neutral-dark font-jakarta mb-2">
            איך נוכל לעזור?
          </h2>
          <p className="text-sm text-neutral-dark/80 font-jakarta">
            אנחנו כאן בשבילכם בכל שאלה או בקשה
          </p>
        </motion.div>

        {/* Contact Options */}
        <div className="space-y-3">
          <h3 className="text-base font-bold text-foreground font-jakarta">דרכי התקשרות</h3>
          {supportOptions.map((option, index) => (
            <motion.button
              key={option.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={option.action}
              className="w-full card-base rounded-xl p-4 flex items-center gap-4 hover:shadow-card-hover transition-all"
            >
              <div className={`w-12 h-12 rounded-full ${option.color} flex items-center justify-center`}>
                <option.icon className={`w-6 h-6 ${option.iconColor}`} strokeWidth={1.5} />
              </div>
              <div className="flex-1 text-right">
                <h4 className="font-bold text-foreground font-jakarta">{option.title}</h4>
                <p className="text-sm text-muted-foreground font-jakarta">{option.description}</p>
              </div>
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            </motion.button>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="space-y-3">
          <h3 className="text-base font-bold text-foreground font-jakarta">שאלות נפוצות</h3>
          {faqItems.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="card-base rounded-xl p-4"
            >
              <h4 className="font-bold text-foreground font-jakarta mb-2">{item.question}</h4>
              <p className="text-sm text-muted-foreground font-jakarta">{item.answer}</p>
            </motion.div>
          ))}
        </div>

        {/* Help Links */}
        <div className="space-y-3">
          <h3 className="text-base font-bold text-foreground font-jakarta">מידע נוסף</h3>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col gap-2 rounded-xl"
              onClick={() => navigate("/terms")}
            >
              <FileText className="w-5 h-5 text-icon-blue" />
              <span className="text-sm font-jakarta">תנאי שימוש</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col gap-2 rounded-xl"
              onClick={() => navigate("/privacy")}
            >
              <FileText className="w-5 h-5 text-icon-blue" />
              <span className="text-sm font-jakarta">מדיניות פרטיות</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col gap-2 rounded-xl"
              onClick={() => navigate("/club-terms")}
            >
              <FileText className="w-5 h-5 text-icon-blue" />
              <span className="text-sm font-jakarta">תקנון המועדון</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col gap-2 rounded-xl"
              onClick={() => navigate("/accessibility")}
            >
              <FileText className="w-5 h-5 text-icon-blue" />
              <span className="text-sm font-jakarta">הצהרת נגישות</span>
            </Button>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Support;
