import { motion } from "framer-motion";
import { Heart, MessageCircle, Send, Bookmark, ExternalLink, FileText, ChevronLeft } from "lucide-react";
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

// Animation variants
const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { 
      duration: 0.5, 
      ease: "easeOut" as const,
      staggerChildren: 0.1
    }
  }
};

const headerVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4 } }
};

const documentVariants = {
  hidden: { opacity: 0, scale: 0.8, rotate: -10 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    rotate: -3,
    transition: { 
      type: "spring" as const, 
      stiffness: 200, 
      damping: 20,
      delay: 0.2
    }
  }
};

const ctaVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, delay: 0.3 } }
};

const actionsVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1, 
    transition: { 
      duration: 0.3,
      delay: 0.4,
      staggerChildren: 0.05
    }
  }
};

const actionButtonVariants = {
  hidden: { opacity: 0, scale: 0 },
  visible: { opacity: 1, scale: 1 }
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
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      className="bg-card border-b border-border overflow-hidden"
    >
      {/* Header */}
      <motion.div 
        variants={headerVariants}
        className="flex items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-3">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
          >
            <Avatar className="h-8 w-8 ring-2 ring-primary/20">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {user.name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
          </motion.div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground">{user.name}</span>
            <span className="text-xs text-muted-foreground">העלה מסמך חדש</span>
          </div>
        </div>
      </motion.div>

      {/* Document Visual */}
      <motion.div 
        className={`relative aspect-square bg-gradient-to-br ${docConfig.gradient}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        {/* Decorative Elements */}
        <motion.div 
          className="absolute inset-0 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <motion.div 
            className="absolute top-8 left-8 w-24 h-24 bg-white/10 rounded-full blur-2xl"
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute bottom-20 right-8 w-32 h-32 bg-white/10 rounded-full blur-3xl"
            animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />
        </motion.div>
        
        {/* Document Preview Background - Clickable */}
        <motion.div 
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={handleOpenDocument}
          whileTap={{ scale: 0.98 }}
        >
          <motion.div 
            variants={documentVariants}
            initial="hidden"
            animate="visible"
            className="bg-white rounded-2xl shadow-2xl p-6 w-[75%] max-w-[280px]"
            whileHover={{ rotate: 0, scale: 1.02, y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            {/* Document Header */}
            <motion.div 
              className="flex items-center gap-3 mb-4"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <motion.div 
                className={`w-14 h-14 ${docConfig.bgIcon} rounded-xl flex items-center justify-center text-3xl shadow-sm`}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.5 }}
              >
                {docConfig.icon}
              </motion.div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-800 line-clamp-1">{document.title}</p>
                <p className="text-xs text-gray-500">{docConfig.label}</p>
              </div>
            </motion.div>
            
            {/* Document Body Lines - Animated */}
            <div className="space-y-2 mb-4">
              {[100, 83, 66, 75].map((width, index) => (
                <motion.div 
                  key={index}
                  className="h-2.5 bg-gray-100 rounded-full"
                  style={{ width: `${width}%` }}
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: 1, opacity: 1 }}
                  transition={{ delay: 0.5 + index * 0.1, duration: 0.3 }}
                />
              ))}
            </div>
            
            {/* Document Footer */}
            <motion.div 
              className="pt-3 border-t border-gray-100"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
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
                  <motion.div 
                    className="flex items-center gap-1 text-xs text-blue-500 font-medium"
                    whileHover={{ scale: 1.05 }}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>פתח</span>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        </motion.div>

      </motion.div>

      {/* Instagram Sponsored-style CTA Bar - Document Colors */}
      <motion.button
        onClick={handleOpenDocument}
        className={`w-full bg-gradient-to-r ${docConfig.gradient} hover:opacity-90 transition-all flex items-center justify-between px-4 py-3`}
        whileTap={{ scale: 0.99 }}
      >
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-white" />
          <span className="text-white text-[15px] font-medium">צפה במסמך</span>
        </div>
        <ChevronLeft className="w-5 h-5 text-white" />
      </motion.button>

      {/* Actions */}
      <motion.div 
        variants={actionsVariants}
        initial="hidden"
        animate="visible"
        className="px-4 py-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {[Heart, MessageCircle, Send].map((Icon, index) => (
              <motion.button 
                key={index}
                variants={actionButtonVariants}
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.1 }}
              >
                <Icon className="h-6 w-6 text-foreground" strokeWidth={1.5} />
              </motion.button>
            ))}
          </div>
          <motion.button 
            variants={actionButtonVariants}
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.1 }}
          >
            <Bookmark className="h-6 w-6 text-foreground" strokeWidth={1.5} />
          </motion.button>
        </div>
      </motion.div>

      {/* Caption */}
      <motion.div 
        className="px-4 pb-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <p className="text-sm text-foreground">
          <span className="font-semibold">{user.name}</span>{" "}
          <span className="text-muted-foreground">
            {document.description || `העלה ${docConfig.label} עבור ${document.pet_name}`}
          </span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {new Date(document.uploaded_at).toLocaleDateString("he-IL")}
        </p>
      </motion.div>
    </motion.article>
  );
}
