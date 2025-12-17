import { motion } from "framer-motion";
import { Heart, MessageCircle, Send, Bookmark, FileText, ChevronLeft, ExternalLink } from "lucide-react";
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

const getDocumentTypeLabel = (type: string) => {
  switch (type) {
    case "vaccination":
      return "אישור חיסון";
    case "medical":
      return "מסמך רפואי";
    case "other":
      return "מסמך";
    default:
      return "מסמך";
  }
};

const getDocumentTypeIcon = (type: string) => {
  switch (type) {
    case "vaccination":
      return "💉";
    case "medical":
      return "🏥";
    default:
      return "📄";
  }
};

export function DocumentPostCard({ document, user }: DocumentPostCardProps) {
  const navigate = useNavigate();

  const handleDocumentsClick = () => {
    navigate("/documents");
  };

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
      <div className="relative aspect-square bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Document Preview Background - Clickable */}
        <motion.div 
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={handleOpenDocument}
          whileTap={{ scale: 0.98 }}
        >
          <div className="bg-white rounded-xl shadow-xl p-8 w-3/4 max-w-[280px] transform rotate-[-2deg] hover:shadow-2xl transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">
                {getDocumentTypeIcon(document.document_type)}
              </div>
              <div className="flex-1">
                <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-2 bg-gray-100 rounded w-1/2"></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-2 bg-gray-100 rounded w-full"></div>
              <div className="h-2 bg-gray-100 rounded w-5/6"></div>
              <div className="h-2 bg-gray-100 rounded w-4/6"></div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {document.pet_avatar && (
                    <img 
                      src={document.pet_avatar} 
                      alt={document.pet_name}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  )}
                  <span className="text-xs text-gray-500">{document.pet_name}</span>
                </div>
                {document.file_url && (
                  <ExternalLink className="h-4 w-4 text-blue-500" />
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* CTA Strip - Bottom of image */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent pt-12 pb-3 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-white" strokeWidth={1.5} />
              <div>
                <p className="text-white text-sm font-medium line-clamp-1">
                  {document.title}
                </p>
                <p className="text-white/70 text-xs">
                  {getDocumentTypeLabel(document.document_type)} • {document.pet_name}
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
            {document.description || `העלה ${getDocumentTypeLabel(document.document_type)} עבור ${document.pet_name}`}
          </span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {new Date(document.uploaded_at).toLocaleDateString("he-IL")}
        </p>
      </div>
    </motion.article>
  );
}
