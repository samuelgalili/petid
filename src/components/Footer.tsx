import { Link } from "react-router-dom";
import { SUPPORT_PHONE, SUPPORT_WHATSAPP_URL } from "@/lib/siteContact";

const Footer = () => {
  const footerLinks = [
    { label: "הצהרת נגישות", path: "/accessibility" },
    { label: "תנאי המועדון", path: "/club-terms" },
    { label: "מדיניות פרטיות", path: "/privacy-policy" },
    { label: "תנאי שימוש", path: "/terms" },
  ];

  return (
    <footer className="w-full bg-mipo-soft/60 border-t border-mipo-line/70 py-6 pb-20 mt-auto" dir="rtl">
      <div className="max-w-md mx-auto px-4">
        <div className="flex justify-center items-center gap-3 flex-wrap text-xs">
          {footerLinks.map((link, index) => (
            <span key={link.path} className="flex items-center gap-3">
              <Link
                to={link.path}
                className="text-mipo-muted hover:text-mipo-violet hover:underline font-jakarta transition-colors"
              >
                {link.label}
              </Link>
              {index < footerLinks.length - 1 && (
                <span className="text-mipo-line">|</span>
              )}
            </span>
          ))}
        </div>
        <p className="text-center text-xs mt-3 font-jakarta">
          <a
            href={SUPPORT_WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-mipo-muted hover:text-mipo-violet hover:underline"
          >
            וואטסאפ {SUPPORT_PHONE}
          </a>
        </p>
        <p className="text-center text-[10px] text-mipo-muted/70 mt-3 font-jakarta">
          © {new Date().getFullYear()} MIPO. כל הזכויות שמורות.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
