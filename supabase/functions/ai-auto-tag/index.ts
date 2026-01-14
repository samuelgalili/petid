import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, data } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let tags: string[] = [];
    let category = '';

    if (type === 'product') {
      const { name, description, price } = data;
      
      // AI-based tagging logic
      const keywords = `${name} ${description}`.toLowerCase();
      
      // Pet type detection
      if (keywords.includes('כלב') || keywords.includes('dog')) tags.push('כלבים');
      if (keywords.includes('חתול') || keywords.includes('cat')) tags.push('חתולים');
      
      // Category detection
      if (keywords.includes('מזון') || keywords.includes('food') || keywords.includes('אוכל')) {
        category = 'מזון';
        tags.push('מזון');
      }
      if (keywords.includes('צעצוע') || keywords.includes('toy') || keywords.includes('משחק')) {
        category = 'צעצועים';
        tags.push('צעצועים');
      }
      if (keywords.includes('תרופה') || keywords.includes('medicine') || keywords.includes('בריאות')) {
        category = 'בריאות';
        tags.push('בריאות');
      }
      if (keywords.includes('אביזר') || keywords.includes('accessory') || keywords.includes('קולר')) {
        category = 'אביזרים';
        tags.push('אביזרים');
      }
      
      // Price tier
      if (price < 50) tags.push('מבצע');
      else if (price > 200) tags.push('פרימיום');
      
    } else if (type === 'lead') {
      const { source, notes, value } = data;
      
      // Lead scoring tags
      if (value > 1000) tags.push('high-value');
      else if (value > 500) tags.push('medium-value');
      else tags.push('low-value');
      
      // Source tags
      if (source) tags.push(source.toLowerCase());
      
      // Interest detection from notes
      if (notes) {
        const notesLower = notes.toLowerCase();
        if (notesLower.includes('urgent') || notesLower.includes('דחוף')) tags.push('urgent');
        if (notesLower.includes('enterprise') || notesLower.includes('עסקי')) tags.push('enterprise');
      }
    }

    return new Response(
      JSON.stringify({ tags, category, success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in ai-auto-tag:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
