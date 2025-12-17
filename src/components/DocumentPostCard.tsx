import { motion } from "framer-motion";
import { Heart, MessageCircle, Send, Bookmark, ExternalLink } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";

interface DocumentPostCardProps {
  document: {
    id: string;
    title: string;
    document_type: string;
    pet_name: string;
    pet_avatar?: string;
    uploaded_at: string;
    description?: string;
    file_url?: string;
  };
  user: {
    name: string;
    avatar?: string;
  };
}

const getDocumentTypeConfig = (type: string) => {
  switch (type) {
    case "vaccination":
      return { 
        icon: "💉", 
        gradient: "from-emerald-400 via-teal-500 to-cyan-600",
        bgIcon: "bg-emerald-100",
        label: "אישור חיסון"
      };
    case "medical":
      return { 
        icon: "🏥", 
        gradient: "from-rose-400 via-pink-500 to-fuchsia-600",
        bgIcon: "bg-rose-100",
        label: "מסמך רפואי"
      };
    default:
      return { 
        icon: "📄", 
        gradient: "from-blue-400 via-indigo-500 to-purple-600",
        bgIcon: "bg-blue-100",
        label: "מסמך"
      };
  }
};

export function DocumentPostCard({ document, user }: DocumentPostCardProps) {
  const navigate = useNavigate();
  const docConfig = getDocumentTypeConfig(document.document_type);

  const handleOpenDocument = () => {
    if (document.file_url) {
      window.open(document.file_url, "_blank", "noopener,noreferrer");
    } else {
      navigate("/documents");
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border-b border-border"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 ring-2 ring-primary/20">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {user.name?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground">{user.name}</span>
            <span className="text-xs text-muted-foreground">העלה מסמך חדש</span>
          </div>
        </div>
      </div>

      {/* Document Visual */}
      <div className={`relative aspect-square bg-gradient-to-br ${docConfig.gradient}`}>
        {/* Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-8 left-8 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute bottom-20 right-8 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
        </div>
        
        {/* Document Preview Background - Clickable */}
        <motion.div 
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={handleOpenDocument}
          whileTap={{ scale: 0.98 }}
        >
          <motion.div 
            className="bg-white rounded-2xl shadow-2xl p-6 w-[75%] max-w-[280px] transform rotate-[-3deg]"
            whileHover={{ rotate: 0, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            {/* Document Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-14 h-14 ${docConfig.bgIcon} rounded-xl flex items-center justify-center text-3xl shadow-sm`}>
                {docConfig.icon}
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-800 line-clamp-1">{document.title}</p>
                <p className="text-xs text-gray-500">{docConfig.label}</p>
              </div>
            </div>
            
            {/* Document Body Lines */}
            <div className="space-y-2 mb-4">
              <div className="h-2.5 bg-gray-100 rounded-full w-full"></div>
              <div className="h-2.5 bg-gray-100 rounded-full w-5/6"></div>
              <div className="h-2.5 bg-gray-100 rounded-full w-4/6"></div>
              <div className="h-2.5 bg-gray-100 rounded-full w-3/4"></div>
            </div>
            
            {/* Document Footer */}
            <div className="pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {document.pet_avatar && (
                    <img 
                      src={document.pet_avatar} 
                      alt={document.pet_name}
                      className="w-7 h-7 rounded-full object-cover ring-2 ring-gray-100"
                    />
                  )}
                  <span className="text-xs font-medium text-gray-600">{document.pet_name}</span>
                </div>
                {document.file_url && (
                  <div className="flex items-center gap-1 text-xs text-blue-500 font-medium">
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>פתח</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* CTA Strip - Bottom of image */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-16 pb-4 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-lg">
                {docConfig.icon}
              </div>
              <div>
                <p className="text-white text-sm font-semibold line-clamp-1">
                  {document.title}
                </p>
                <p className="text-white/70 text-xs">
                  {docConfig.label} • {document.pet_name}
                </p>
              </div>
            </div>
            <motion.button
              onClick={handleOpenDocument}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full text-white text-sm font-medium hover:bg-white/30 transition-colors"
            >
              <ExternalLink className="h-4 w-4" strokeWidth={2} />
              <span>פתח</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.button whileTap={{ scale: 0.9 }}>
              <Heart className="h-6 w-6 text-foreground" strokeWidth={1.5} />
            </motion.button>
            <motion.button whileTap={{ scale: 0.9 }}>
              <MessageCircle className="h-6 w-6 text-foreground" strokeWidth={1.5} />
            </motion.button>
            <motion.button whileTap={{ scale: 0.9 }}>
              <Send className="h-6 w-6 text-foreground" strokeWidth={1.5} />
            </motion.button>
          </div>
          <motion.button whileTap={{ scale: 0.9 }}>
            <Bookmark className="h-6 w-6 text-foreground" strokeWidth={1.5} />
          </motion.button>
        </div>
      </div>

      {/* Caption */}
      <div className="px-4 pb-4">
        <p className="text-sm text-foreground">
          <span className="font-semibold">{user.name}</span>{" "}
          <span className="text-muted-foreground">
            {document.description || `העלה ${docConfig.label} עבור ${document.pet_name}`}
          </span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {new Date(document.uploaded_at).toLocaleDateString("he-IL")}
        </p>
      </div>
    </motion.article>
  );
}
