import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { chatCompletion } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Pilot Decoder - Internal function to process pilot output
// Takes pilot output and breaks it down into clear action bits
// Does NOT display anything to the user
interface DecodedPilotResult {
  action_required: boolean;
  missing_data: string[];
  safe_to_recommend: boolean;
  wait_required: boolean;
  explanation: string;
}

interface PilotOutput {
  next_action?: string;
  required_data?: string[];
  reason?: string;
}

function pilot_decoder(pilotOutput: PilotOutput | null): DecodedPilotResult {
  const result: DecodedPilotResult = {
    action_required: false,
    missing_data: [],
    safe_to_recommend: false,
    wait_required: false,
    explanation: ""
  };

  if (!pilotOutput || !pilotOutput.next_action) {
    result.explanation = "Pilot output invalid.";
    return result;
  }

  if (pilotOutput.next_action === "data_missing") {
    result.action_required = true;
    result.missing_data = pilotOutput.required_data || [];
    result.explanation = "Missing mandatory pet data.";
  }

  if (pilotOutput.next_action === "safe_recommendation") {
    result.safe_to_recommend = true;
    result.explanation = pilotOutput.reason || "A safe recommendation exists.";
  }

  if (pilotOutput.next_action === "wait") {
    result.wait_required = true;
    result.explanation = "Better to wait.";
  }

  if (pilotOutput.next_action === "none") {
    result.explanation = "No action needed.";
  }

  return result;
}

const PETID_SYSTEM_PROMPT = `You are the core decision logic of PetID.
PetID is not a store and not a utility.
PetID is a responsibility system for pet owners.

Your purpose is to protect pets by guiding owners toward safe, correct, long-term decisions.
Selling is never the primary goal.

GLOBAL DEFAULT:
If there is doubt — do not recommend.
If data is missing — ask.
If something is not suitable — say so clearly.
Default behavior: do nothing.

MANDATORY DATA BEFORE ANY DECISION:
- Pet age
- Pet breed
- Relevant health status
- Known sensitivities or allergies

If any of these are missing or unclear — stop.

CORE RULES:
1. Recommend only when confidence is high.
2. Never push action, urgency, or sales.
3. One decision at a time, or none.
4. Long-term safety overrides short-term convenience.
5. Truth always overrides revenue.

FORBIDDEN LANGUAGE:
Amazing, Must-have, Best, Deal, Hurry, Perfect.

ALLOWED LANGUAGE:
Recommended, Not required, Not suitable, Better to wait.

STOP CONDITIONS:
- Medical uncertainty
- Conflicting data
- Potential risk to the pet

In stop conditions:
Explain calmly.
Ask for clarification or advise waiting.
Never proceed.

You do not initiate actions.
You do not trigger UI changes.
You do not output unless explicitly asked.

OUTPUT FORMAT (strict JSON only):
{
  "status": "pilot_only",
  "next_action": "none | data_missing | safe_recommendation | wait",
  "reason": "short explanation following PetID Core Rules",
  "required_data": ["list missing fields if any"],
  "long_term_check": "pass | fail",
  "internal_notes": "optional additional reasoning"
}

RULES:
- If mandatory data is missing → next_action = "data_missing".
- If recommendation is unsafe or uncertain → next_action = "wait".
- If there's nothing the user needs to do → next_action = "none".
- If there's a clear safe decision → next_action = "safe_recommendation".
- Always follow the PetID Core Rules.
- Never speak to the user.
- Never generate marketing language.
- Never create UI elements.
- Output ONLY the JSON object, nothing else.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { petData } = await req.json();

    const userPrompt = `Analyze the following pet data and determine the correct next decision for the owner.

Pet Data:
${JSON.stringify(petData, null, 2)}

Remember:
- Output ONLY the JSON object
- Follow PetID Core Rules strictly
- Do not suggest any actions unless absolutely safe and necessary
- If data is missing, identify what's missing`;

    const data = await chatCompletion({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: PETID_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1, // Low temperature for consistent, safe responses
    });

    const content = data.choices?.[0]?.message?.content || "";
    
    // Try to parse the JSON response
    let reasoning;
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        reasoning = JSON.parse(jsonMatch[0]);
      } else {
        reasoning = {
          status: "pilot_only",
          next_action: "wait",
          reason: "Could not parse AI response",
          required_data: [],
          long_term_check: "fail"
        };
      }
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      reasoning = {
        status: "pilot_only",
        next_action: "wait",
        reason: "Response parsing failed - defaulting to safe wait state",
        required_data: [],
        long_term_check: "fail"
      };
    }

    // Decode the pilot output for internal use
    const decoded = pilot_decoder(reasoning);
    console.log("Decoded pilot output:", decoded);

    return new Response(JSON.stringify({ reasoning, decoded }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("pet-pilot-reasoning error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
