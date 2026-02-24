import { useState, useRef } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { FileText, Download, Trash2, Syringe, Stethoscope, Shield, FlaskConical, Pill, ClipboardList, Paperclip, File } from "lucide-react";

interface SwipeableDocumentCardProps {
  doc: {
    id: string;
    title: string;
    description: string | null;
    document_type: string;
    pet_id: string;
    file_url: string;
    file_name: string;
    uploaded_at: string;
  };
  petName: string;
  documentTypeLabel: string;
  onDelete: (id: string, fileUrl: string) => void;
  onDownload: (fileUrl: string, fileName: string) => void;
  onView?: (fileUrl: string, fileName: string) => void;
  index: number;
}

export function SwipeableDocumentCard({
  doc,
  petName,
  documentTypeLabel,
  onDelete,
  onDownload,
  onView,
  index,
}: SwipeableDocumentCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const constraintsRef = useRef(null);
  const x = useMotionValue(0);

  const deleteOpacity = useTransform(x, [-150, -50, 0], [1, 0.5, 0]);
  const deleteScale = useTransform(x, [-150, -50, 0], [1, 0.8, 0.5]);

  const getDocTypeConfig = (type: string) => {
    switch (type) {
      case "vaccination":
        return { gradient: "from-emerald-500 to-emerald-600", bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", icon: Syringe, emoji: "💉" };
      case "medical":
      case "medical_record":
        return { gradient: "from-blue-500 to-blue-600", bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", icon: Stethoscope, emoji: "🏥" };
      case "insurance":
        return { gradient: "from-sky-500 to-sky-600", bg: "bg-sky-500/10", text: "text-sky-600 dark:text-sky-400", icon: Shield, emoji: "🛡️" };
      case "lab_results":
        return { gradient: "from-violet-500 to-violet-600", bg: "bg-violet-500/10", text: "text-violet-600 dark:text-violet-400", icon: FlaskConical, emoji: "🔬" };
      case "prescription":
        return { gradient: "from-purple-500 to-purple-600", bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400", icon: Pill, emoji: "💊" };
      case "vet_report":
        return { gradient: "from-teal-500 to-teal-600", bg: "bg-teal-500/10", text: "text-teal-600 dark:text-teal-400", icon: ClipboardList, emoji: "🩺" };
      case "legal_contract":
        return { gradient: "from-amber-500 to-amber-600", bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", icon: FileText, emoji: "📋" };
      case "license":
        return { gradient: "from-cyan-500 to-cyan-600", bg: "bg-cyan-500/10", text: "text-cyan-600 dark:text-cyan-400", icon: FileText, emoji: "🪪" };
      default:
        return { gradient: "from-muted-foreground to-muted-foreground", bg: "bg-muted", text: "text-muted-foreground", icon: File, emoji: "📄" };
    }
  };

  const config = getDocTypeConfig(doc.document_type);
  const IconComp = config.icon;

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x < -100) {
      setIsDeleting(true);
      setTimeout(() => {
        onDelete(doc.id, doc.file_url);
      }, 200);
    }
  };

  return (
    <motion.div
      ref={constraintsRef}
      className="relative overflow-hidden rounded-2xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: isDeleting ? 0 : 1,
        y: isDeleting ? -20 : 0,
        height: isDeleting ? 0 : 'auto',
        marginBottom: isDeleting ? 0 : undefined
      }}
      transition={{
        delay: index * 0.05,
        duration: isDeleting ? 0.3 : 0.4,
        ease: "easeOut"
      }}
    >
      {/* Delete Background */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-l from-red-500 to-red-600 flex items-center justify-end px-6 rounded-2xl"
        style={{ opacity: deleteOpacity }}
      >
        <motion.div
          className="flex flex-col items-center gap-1 text-white"
          style={{ scale: deleteScale }}
        >
          <Trash2 className="w-6 h-6" />
          <span className="text-xs font-medium">מחיקה</span>
        </motion.div>
      </motion.div>

      {/* Swipeable Card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -150, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="group relative bg-card rounded-2xl overflow-hidden border border-border/40 hover:border-primary/30 hover:shadow-lg transition-all duration-300 cursor-grab active:cursor-grabbing"
      >
        <div 
          className="relative p-4 cursor-pointer"
          onClick={() => {
            if (onView) {
              onView(doc.file_url, doc.file_name);
            } else {
              window.open(doc.file_url, '_blank');
            }
          }}
        >
          <div className="flex items-start gap-3.5">
            {/* Document Icon */}
            <div className="relative flex-shrink-0">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${config.gradient} p-[2px] shadow-md`}>
                <div className="w-full h-full rounded-[10px] bg-card flex items-center justify-center">
                  <IconComp className="w-5 h-5 text-foreground" strokeWidth={1.5} />
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="mb-1.5">
                <h3 className="font-bold text-foreground text-[15px] leading-tight mb-1.5 line-clamp-1">
                  {doc.title}
                </h3>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${config.bg} ${config.text}`}>
                    {config.emoji} {documentTypeLabel}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground">
                    🐾 {petName}
                  </span>
                </div>
              </div>

              {doc.description && (
                <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{doc.description}</p>
              )}

              <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-border/30">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                  {new Date(doc.uploaded_at).toLocaleDateString("he-IL")}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownload(doc.file_url, doc.file_name);
                    }}
                    className="w-8 h-8 rounded-full bg-muted/60 hover:bg-primary/10 flex items-center justify-center transition-all duration-200"
                  >
                    <Download className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors" strokeWidth={1.5} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(doc.id, doc.file_url);
                    }}
                    className="w-8 h-8 rounded-full bg-muted/60 hover:bg-destructive/10 flex items-center justify-center transition-all duration-200"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive transition-colors" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
