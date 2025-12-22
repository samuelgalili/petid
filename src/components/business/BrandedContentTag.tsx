import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Handshake, BadgeCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface BrandedContentTagProps {
  postId: string;
}

export const BrandedContentTag = ({ postId }: BrandedContentTagProps) => {
  const { data: brandedContent } = useQuery({
    queryKey: ['branded-content', postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branded_content')
        .select(`
          *,
          business_profiles:partner_business_id(business_name, logo_url, is_verified)
        `)
        .eq('post_id', postId)
        .eq('status', 'approved')
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!postId,
  });

  if (!brandedContent) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-1.5 px-2 py-1 bg-muted/50 rounded-full text-xs text-muted-foreground"
    >
      <Handshake className="w-3 h-3" />
      <span>שותפות בתשלום עם</span>
      <span className="font-medium text-foreground flex items-center gap-0.5">
        {brandedContent.business_profiles?.business_name}
        {brandedContent.business_profiles?.is_verified && (
          <BadgeCheck className="w-3 h-3 text-primary" />
        )}
      </span>
    </motion.div>
  );
};
