import { useNavigate } from "react-router-dom";

interface RichCaptionProps {
  caption: string;
  className?: string;
  maxLength?: number;
}

// Parse caption for hashtags and mentions, make them clickable
export const RichCaption = ({ caption, className = "", maxLength }: RichCaptionProps) => {
  const navigate = useNavigate();
  
  if (!caption) return null;
  
  // Truncate if needed
  const displayCaption = maxLength && caption.length > maxLength 
    ? caption.slice(0, maxLength) + "..."
    : caption;

  // Parse hashtags and mentions
  const parts = displayCaption.split(/([@#][\u0590-\u05FFa-zA-Z0-9_]+)/g);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        // Hashtag
        if (part.startsWith('#')) {
          const hashtag = part.slice(1);
          return (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/explore?hashtag=${encodeURIComponent(hashtag)}`);
              }}
              className="text-[#00376B] dark:text-[#E0F1FF] hover:underline font-medium"
            >
              {part}
            </button>
          );
        }
        
        // Mention
        if (part.startsWith('@')) {
          const username = part.slice(1);
          return (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/explore?user=${encodeURIComponent(username)}`);
              }}
              className="text-[#00376B] dark:text-[#E0F1FF] hover:underline font-medium"
            >
              {part}
            </button>
          );
        }
        
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
};
