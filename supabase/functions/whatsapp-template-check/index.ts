import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TemplateCheckRequest {
  // When was the user's last message (ISO timestamp or null if never)
  lastUserMessageAt: string | null;
  // Who is initiating this message
  initiatedBy: 'platform' | 'ai' | 'user_reply';
  // Type of message being sent
  messageType: 'welcome' | 'followup' | 'confirmation' | 'update' | 'reminder' | 'handoff' | 'conversation';
  // User's first name for template variables
  firstName?: string;
  // Any additional context
  context?: Record<string, string>;
}

interface TemplateCheckResponse {
  requiresTemplate: boolean;
  templateName?: string;
  variables?: Record<string, string>;
  reason?: string;
}

// PETID approved template intents
const TEMPLATE_INTENTS = {
  petid_welcome: {
    description: 'First outreach or new user joined',
    triggers: ['welcome', 'new_user', 'first_contact']
  },
  petid_followup: {
    description: 'Checking in after previous interaction',
    triggers: ['followup', 'check_in']
  },
  petid_confirmation: {
    description: 'Confirming user action or submission',
    triggers: ['confirmation', 'action_confirmed']
  },
  petid_update: {
    description: 'Status or progress updates',
    triggers: ['update', 'status', 'progress']
  },
  petid_reminder: {
    description: 'Gentle reminders or re-engagement',
    triggers: ['reminder', 'reengagement', 'inactive']
  },
  petid_handoff: {
    description: 'Transfer to human or complex cases',
    triggers: ['handoff', 'human', 'escalation']
  }
};

function isWithin24Hours(lastMessageAt: string | null): boolean {
  if (!lastMessageAt) return false;
  
  const lastMessage = new Date(lastMessageAt);
  const now = new Date();
  const hoursDiff = (now.getTime() - lastMessage.getTime()) / (1000 * 60 * 60);
  
  return hoursDiff <= 24;
}

function determineTemplate(messageType: string): string {
  switch (messageType) {
    case 'welcome':
      return 'petid_welcome';
    case 'followup':
      return 'petid_followup';
    case 'confirmation':
      return 'petid_confirmation';
    case 'update':
      return 'petid_update';
    case 'reminder':
      return 'petid_reminder';
    case 'handoff':
      return 'petid_handoff';
    default:
      return 'petid_followup';
  }
}

function checkTemplateRequirement(request: TemplateCheckRequest): TemplateCheckResponse {
  const { lastUserMessageAt, initiatedBy, messageType, firstName, context } = request;
  
  // Rule 1: If PETID initiates the conversation - template required
  if (initiatedBy === 'platform' || initiatedBy === 'ai') {
    // Check if within 24-hour window
    if (!isWithin24Hours(lastUserMessageAt)) {
      const templateName = determineTemplate(messageType);
      return {
        requiresTemplate: true,
        templateName,
        variables: {
          first_name: firstName || 'חבר/ה',
          ...context
        },
        reason: 'Platform/AI initiated message outside 24-hour window'
      };
    }
    
    // Even within 24 hours, certain message types still require templates
    if (['welcome', 'reminder', 'update'].includes(messageType)) {
      const templateName = determineTemplate(messageType);
      return {
        requiresTemplate: true,
        templateName,
        variables: {
          first_name: firstName || 'חבר/ה',
          ...context
        },
        reason: 'System message type requires template regardless of timing'
      };
    }
  }
  
  // Rule 2: User reply within 24 hours - no template required
  if (initiatedBy === 'user_reply' && isWithin24Hours(lastUserMessageAt)) {
    return {
      requiresTemplate: false,
      reason: 'User-initiated conversation within 24-hour window - free reply allowed'
    };
  }
  
  // Rule 3: More than 24 hours since last user message - template required
  if (!isWithin24Hours(lastUserMessageAt)) {
    const templateName = determineTemplate(messageType);
    return {
      requiresTemplate: true,
      templateName,
      variables: {
        first_name: firstName || 'חבר/ה',
        ...context
      },
      reason: 'More than 24 hours since last user message'
    };
  }
  
  // Default: No template required
  return {
    requiresTemplate: false,
    reason: 'Within active conversation window'
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request: TemplateCheckRequest = await req.json();
    
    // Validate required fields
    if (!request.initiatedBy || !request.messageType) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: initiatedBy and messageType are required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const result = checkTemplateRequirement(request);
    
    // Format output according to PETID compliance rules
    let formattedOutput: string | null = null;
    if (result.requiresTemplate && result.templateName) {
      formattedOutput = `[TEMPLATE: ${result.templateName} | variables: ${JSON.stringify(result.variables)}]`;
    }
    
    return new Response(
      JSON.stringify({
        ...result,
        formattedOutput,
        templateOptions: result.requiresTemplate ? TEMPLATE_INTENTS : undefined
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
    
  } catch (error) {
    console.error('WhatsApp template check error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to check template requirement' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
