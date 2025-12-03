import { Link } from "react-router-dom";

const Footer = () => {
  const footerLinks = [
    { label: "הצהרת נגישות", path: "/accessibility" },
    { label: "תנאי המועדון", path: "/club-terms" },
    { label: "מדיניות פרטיות", path: "/privacy" },
    { label: "תנאי שימוש", path: "/terms" },
  ];

  return (
    <footer className="w-full bg-muted/30 border-t border-border/30 py-6 mt-auto" dir="rtl">
      <div className="max-w-md mx-auto px-4">
        <div className="flex justify-center items-center gap-3 flex-wrap text-xs">
          {footerLinks.map((link, index) => (
            <span key={link.path} className="flex items-center gap-3">
              <Link
                to={link.path}
                className="text-muted-foreground hover:text-primary hover:underline font-jakarta transition-colors"
              >
                {link.label}
              </Link>
              {index < footerLinks.length - 1 && (
                <span className="text-border">|</span>
              )}
            </span>
          ))}
        </div>
        <p className="text-center text-[10px] text-muted-foreground/60 mt-3 font-jakarta">
          © {new Date().getFullYear()} Petid. כל הזכויות שמורות.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
