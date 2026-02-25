import { FlaskConical, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ScienceBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

export const ScienceBadge = ({ size = 'sm', label = 'NRC 2006', className = '' }: ScienceBadgeProps) => {
  const sizes = {
    sm: { icon: 'w-3 h-3', text: 'text-[9px]', px: 'px-2 py-0.5', gap: 'gap-1' },
    md: { icon: 'w-3.5 h-3.5', text: 'text-[10px]', px: 'px-2.5 py-1', gap: 'gap-1.5' },
    lg: { icon: 'w-4 h-4', text: 'text-xs', px: 'px-3 py-1.5', gap: 'gap-2' },
  };
  const s = sizes[size];

  return (
    <div className={`inline-flex items-center ${s.gap} ${s.px} rounded-full bg-primary/10 border border-primary/20 ${className}`}>
      <FlaskConical className={`${s.icon} text-primary`} strokeWidth={1.5} />
      <span className={`${s.text} font-semibold text-primary`}>{label}</span>
      <ShieldCheck className={`${s.icon} text-primary/60`} strokeWidth={1.5} />
    </div>
  );
};
