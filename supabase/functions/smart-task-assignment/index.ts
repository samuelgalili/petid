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
    const { taskId, taskType, priority, skills } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all team members (admins and editors)
    const { data: teamMembers } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        role,
        profiles!inner(id, full_name, last_active_at)
      `)
      .in('role', ['admin', 'editor', 'moderator']);

    if (!teamMembers?.length) {
      return new Response(
        JSON.stringify({ error: 'No team members found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Analyze workload for each team member
    const memberScores = await Promise.all(
      teamMembers.map(async (member) => {
        // Get current assigned tasks
        const { data: assignedTasks } = await supabase
          .from('admin_tasks')
          .select('id, priority, status')
          .eq('assigned_to', member.user_id)
          .neq('status', 'done');

        const currentLoad = assignedTasks?.length || 0;
        const highPriorityTasks = assignedTasks?.filter(t => t.priority === 'high').length || 0;

        // Get completed tasks in last 7 days (productivity measure)
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        
        const { data: completedTasks } = await supabase
          .from('admin_tasks')
          .select('id')
          .eq('assigned_to', member.user_id)
          .eq('status', 'done')
          .gte('updated_at', weekAgo.toISOString());

        const completedCount = completedTasks?.length || 0;

        // Check last activity
        const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
        const lastActive = profile?.last_active_at 
          ? new Date(profile.last_active_at) 
          : new Date(0);
        const hoursSinceActive = (Date.now() - lastActive.getTime()) / (1000 * 60 * 60);

        // Calculate score (lower is better for assignment)
        let score = 0;
        
        // Workload factor (0-40 points)
        score += currentLoad * 10;
        score += highPriorityTasks * 5;
        
        // Productivity bonus (reduces score)
        score -= completedCount * 3;
        
        // Activity factor
        if (hoursSinceActive > 24) score += 20;
        else if (hoursSinceActive > 8) score += 10;
        
        // Role matching
        if (taskType === 'content' && member.role === 'editor') score -= 15;
        if (taskType === 'moderation' && member.role === 'moderator') score -= 15;
        if (priority === 'high' && member.role === 'admin') score -= 10;

        return {
          userId: member.user_id,
          name: profile?.full_name || 'Unknown',
          role: member.role,
          currentLoad,
          highPriorityTasks,
          weeklyCompleted: completedCount,
          hoursSinceActive: Math.round(hoursSinceActive),
          score: Math.max(0, score),
          available: hoursSinceActive < 24
        };
      })
    );

    // Sort by score (lowest first = best match)
    memberScores.sort((a, b) => a.score - b.score);

    // Get top recommendation
    const recommended = memberScores[0];
    const alternatives = memberScores.slice(1, 4);

    // Auto-assign if requested
    if (taskId && recommended) {
      await supabase
        .from('admin_tasks')
        .update({ assigned_to: recommended.userId })
        .eq('id', taskId);
    }

    return new Response(
      JSON.stringify({
        recommended: {
          ...recommended,
          reason: generateReason(recommended, taskType, priority)
        },
        alternatives,
        autoAssigned: !!taskId,
        taskId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in smart-task-assignment:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateReason(member: any, taskType?: string, priority?: string): string {
  const reasons: string[] = [];
  
  if (member.currentLoad === 0) {
    reasons.push('פנוי לחלוטין');
  } else if (member.currentLoad < 3) {
    reasons.push('עומס עבודה נמוך');
  }
  
  if (member.weeklyCompleted > 5) {
    reasons.push('פרודוקטיביות גבוהה השבוע');
  }
  
  if (member.hoursSinceActive < 1) {
    reasons.push('פעיל עכשיו');
  }
  
  if (taskType === 'content' && member.role === 'editor') {
    reasons.push('מתאים לתוכן');
  }
  
  if (priority === 'high' && member.role === 'admin') {
    reasons.push('מנהל לטיפול דחוף');
  }
  
  return reasons.length > 0 ? reasons.join(', ') : 'זמין להקצאה';
}
