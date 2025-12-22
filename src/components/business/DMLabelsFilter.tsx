import { motion } from 'framer-motion';
import { Inbox, Star, Flag, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

type DMLabel = 'all' | 'primary' | 'general' | 'flagged' | 'pending';

interface DMLabelsFilterProps {
  activeLabel: DMLabel;
  onLabelChange: (label: DMLabel) => void;
  counts?: Record<DMLabel, number>;
}

const labels: { value: DMLabel; label: string; icon: typeof Inbox; color: string }[] = [
  { value: 'all', label: 'הכל', icon: Inbox, color: 'text-foreground' },
  { value: 'primary', label: 'ראשי', icon: Star, color: 'text-yellow-500' },
  { value: 'general', label: 'כללי', icon: Inbox, color: 'text-muted-foreground' },
  { value: 'flagged', label: 'מסומן', icon: Flag, color: 'text-red-500' },
  { value: 'pending', label: 'לטיפול', icon: Clock, color: 'text-orange-500' },
];

export const DMLabelsFilter = ({ activeLabel, onLabelChange, counts }: DMLabelsFilterProps) => {
  return (
    <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide">
      {labels.map((label) => {
        const Icon = label.icon;
        const isActive = activeLabel === label.value;
        const count = counts?.[label.value] || 0;

        return (
          <motion.button
            key={label.value}
            whileTap={{ scale: 0.95 }}
            onClick={() => onLabelChange(label.value)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            )}
          >
            <Icon className={cn('w-3.5 h-3.5', !isActive && label.color)} />
            <span>{label.label}</span>
            {count > 0 && (
              <span className={cn(
                'px-1.5 py-0.5 rounded-full text-[10px] min-w-[18px] text-center',
                isActive ? 'bg-primary-foreground/20' : 'bg-background'
              )}>
                {count}
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
};
