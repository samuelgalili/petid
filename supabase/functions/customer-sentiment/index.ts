import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple sentiment analysis based on Hebrew and English keywords
const positiveWords = [
  'מעולה', 'נהדר', 'אהבתי', 'מומלץ', 'שירות', 'מהיר', 'איכותי', 'תודה', 'אדיר', 'מושלם',
  'great', 'excellent', 'amazing', 'love', 'perfect', 'wonderful', 'fantastic', 'best', 'happy', 'satisfied'
];

const negativeWords = [
  'גרוע', 'נורא', 'מאכזב', 'איטי', 'בעיה', 'תקלה', 'כעס', 'מתסכל', 'חרא', 'לא מרוצה',
  'bad', 'terrible', 'awful', 'slow', 'problem', 'issue', 'angry', 'frustrated', 'disappointed', 'worst'
];

const analyzeSentiment = (text: string): { score: number; label: string; keywords: string[] } => {
  const lowerText = text.toLowerCase();
  const foundPositive: string[] = [];
  const foundNegative: string[] = [];
  
  positiveWords.forEach(word => {
    if (lowerText.includes(word)) foundPositive.push(word);
  });
  
  negativeWords.forEach(word => {
    if (lowerText.includes(word)) foundNegative.push(word);
  });
  
  const positiveScore = foundPositive.length;
  const negativeScore = foundNegative.length;
  const total = positiveScore + negativeScore;
  
  let score = 50; // neutral
  if (total > 0) {
    score = Math.round((positiveScore / total) * 100);
  }
  
  let label = 'neutral';
  if (score >= 70) label = 'positive';
  else if (score <= 30) label = 'negative';
  
  return {
    score,
    label,
    keywords: [...foundPositive.map(w => `+${w}`), ...foundNegative.map(w => `-${w}`)]
  };
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, customerId, analyzeReviews } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (text) {
      // Analyze single text
      const result = analyzeSentiment(text);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (analyzeReviews) {
      // Analyze all product reviews
      const { data: reviews } = await supabase
        .from('product_reviews')
        .select('id, product_id, rating, review_text, created_at')
        .order('created_at', { ascending: false })
        .limit(100);

      const analyzedReviews = (reviews || []).map(review => ({
        ...review,
        sentiment: analyzeSentiment(review.review_text || '')
      }));

      const avgSentiment = analyzedReviews.reduce((sum, r) => sum + r.sentiment.score, 0) / (analyzedReviews.length || 1);
      
      const distribution = {
        positive: analyzedReviews.filter(r => r.sentiment.label === 'positive').length,
        neutral: analyzedReviews.filter(r => r.sentiment.label === 'neutral').length,
        negative: analyzedReviews.filter(r => r.sentiment.label === 'negative').length
      };

      // Extract common themes
      const allKeywords: Record<string, number> = {};
      analyzedReviews.forEach(r => {
        r.sentiment.keywords.forEach(kw => {
          allKeywords[kw] = (allKeywords[kw] || 0) + 1;
        });
      });
      
      const topThemes = Object.entries(allKeywords)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([keyword, count]) => ({ keyword, count }));

      return new Response(
        JSON.stringify({
          totalReviews: analyzedReviews.length,
          averageSentiment: Math.round(avgSentiment),
          distribution,
          topThemes,
          recentNegative: analyzedReviews
            .filter(r => r.sentiment.label === 'negative')
            .slice(0, 5),
          recentPositive: analyzedReviews
            .filter(r => r.sentiment.label === 'positive')
            .slice(0, 5)
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (customerId) {
      // Analyze customer's messages and reviews
      const { data: messages } = await supabase
        .from('messages')
        .select('content, created_at')
        .eq('sender_id', customerId)
        .order('created_at', { ascending: false })
        .limit(50);

      const { data: reviews } = await supabase
        .from('product_reviews')
        .select('review_text, rating, created_at')
        .eq('user_id', customerId);

      const allTexts = [
        ...(messages || []).map(m => m.content),
        ...(reviews || []).map(r => r.review_text)
      ].filter(Boolean);

      const sentiments = allTexts.map(text => analyzeSentiment(text));
      const avgScore = sentiments.reduce((sum, s) => sum + s.score, 0) / (sentiments.length || 1);

      return new Response(
        JSON.stringify({
          customerId,
          overallSentiment: Math.round(avgScore),
          sentimentLabel: avgScore >= 70 ? 'positive' : avgScore <= 30 ? 'negative' : 'neutral',
          messageCount: messages?.length || 0,
          reviewCount: reviews?.length || 0,
          avgReviewRating: reviews?.length 
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
            : null
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Please provide text, customerId, or set analyzeReviews: true' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in customer-sentiment:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
