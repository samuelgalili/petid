import { useState, useRef } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { FileText, Download, Trash2 } from "lucide-react";

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
  index: number;
}

export function SwipeableDocumentCard({
  doc,
  petName,
  documentTypeLabel,
  onDelete,
  onDownload,
  index,
}: SwipeableDocumentCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const constraintsRef = useRef(null);
  const x = useMotionValue(0);
  
  // Transform for delete background opacity
  const deleteOpacity = useTransform(x, [-150, -50, 0], [1, 0.5, 0]);
  const deleteScale = useTransform(x, [-150, -50, 0], [1, 0.8, 0.5]);
  
  const getDocTypeGradient = (type: string) => {
    switch (type) {
      case "vaccination": return "from-[#10B981] to-[#059669]";
      case "medical": return "from-[#3B82F6] to-[#2563EB]";
      default: return "from-[#8B5CF6] to-[#7C3AED]";
    }
  };
  
  const getDocTypeIcon = (type: string) => {
    switch (type) {
      case "vaccination": return "💉";
      case "medical": return "🏥";
      default: return "📄";
    }
  };

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
        className="group relative bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-transparent hover:shadow-xl transition-all duration-300 cursor-grab active:cursor-grabbing"
      >
        {/* Instagram-style gradient border on hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none" />
        <div className="absolute inset-[2px] bg-white rounded-[14px] pointer-events-none" />
        
        <div className="relative p-4">
          <div className="flex items-start gap-4">
            {/* Document Icon with gradient ring */}
            <div className="relative flex-shrink-0">
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${getDocTypeGradient(doc.document_type)} p-[2px] shadow-lg`}>
                <div className="w-full h-full rounded-[10px] bg-white flex items-center justify-center">
                  <span className="text-2xl">{getDocTypeIcon(doc.document_type)}</span>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-bold text-gray-900 text-base leading-tight mb-1 group-hover:text-[#DD2A7B] transition-colors">
                    {doc.title}
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${getDocTypeGradient(doc.document_type)} text-white`}>
                      {documentTypeLabel}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      🐾 {petName}
                    </span>
                  </div>
                </div>
              </div>
              
              {doc.description && (
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">{doc.description}</p>
              )}
              
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-[#F58529] to-[#DD2A7B]" />
                  הועלה ב-{new Date(doc.uploaded_at).toLocaleDateString("he-IL")}
                </div>
                
                {/* Swipe Hint */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 hidden sm:block">← החלק למחיקה</span>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDownload(doc.file_url, doc.file_name);
                      }}
                      className="w-9 h-9 rounded-full bg-gray-50 hover:bg-gradient-to-r hover:from-[#F58529] hover:via-[#DD2A7B] hover:to-[#8134AF] flex items-center justify-center transition-all duration-200 group/btn"
                    >
                      <Download className="w-4 h-4 text-gray-600 group-hover/btn:text-white transition-colors" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(doc.id, doc.file_url);
                      }}
                      className="w-9 h-9 rounded-full bg-gray-50 hover:bg-red-500 flex items-center justify-center transition-all duration-200 group/btn"
                    >
                      <Trash2 className="w-4 h-4 text-gray-600 group-hover/btn:text-white transition-colors" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
