import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { normalizePhotoAnalysis, canShowHigherImpactRecommendation } from "../../shared/garden-ai.js";

// AI photo observation analysis for a journal entry.
// Separates observation, possible explanation, recommendation, and confidence.
// Stores structured results; never relies on prose alone.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const photoUrl = body?.photo_url;
    const plantContext = body?.plant_context || {};
    const historyContext = body?.history_context || "";

    if (!photoUrl) return Response.json({ error: 'A photo_url is required.' }, { status: 400 });

    const plantDescription = [
      plantContext.plant_type ? `Plant type: ${plantContext.plant_type}` : "",
      plantContext.variety ? `Variety: ${plantContext.variety}` : "",
      plantContext.current_status ? `Current status: ${plantContext.current_status}` : "",
      plantContext.planting_date ? `Planted: ${plantContext.planting_date}` : ""
    ].filter(Boolean).join("\n");

    const prompt = `You are a careful garden photo observer for California home vegetable and herb gardens.
Analyze the provided photo and the plant context below. Distinguish clearly between:
1. OBSERVATION — what is visibly present in the photo.
2. POSSIBLE EXPLANATION — what might explain it (list alternatives if unsure).
3. RECOMMENDATION — what the gardener should do next.
4. CONFIDENCE — how certain you are.

${plantDescription ? "Plant context:\n" + plantDescription + "\n" : ""}
${historyContext ? "Recent history:\n" + historyContext + "\n" : ""}

Return ONLY a JSON object with this exact shape:
{
  "observation_summary": "one or two sentences describing what is visibly present",
  "observations": [
    { "observation_category": "wilting|yellowing|spotting|discoloration|leaf_damage|visible_pest|flowering|fruiting|vigor|growth|other", "severity": "none|mild|moderate|severe", "confidence": "high|medium|low", "description": "what is seen" }
  ],
  "possible_explanations": ["possible cause 1", "possible cause 2"],
  "recommended_next_action": "a single concrete next action, e.g. check_soil_moisture",
  "confidence_level": "high|medium|low",
  "urgency": "urgent|today|follow_up|routine|upcoming",
  "follow_up_date": "YYYY-MM-DD or null",
  "source_references": [],
  "change_from_previous": "how this compares to prior observations, or empty if none"
}

Safety rules:
- For low or medium confidence, recommend only low-risk actions: observe, photograph_again, inspect_leaves, check_soil_moisture, adjust_watering_timing, temporary_shade, improve_airflow, remove_dead_material.
- Never recommend pesticides, fungicides, fertilizer, major pruning, or soil amendments unless confidence is high AND you can cite an approved authoritative source. If you cannot, recommend gathering more evidence instead.
- Never present a low-confidence conclusion as a diagnosis.
- If the photo is unclear, set confidence_level to "low" and recommend photographing again with more detail.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      file_urls: [photoUrl],
      response_json_schema: {
        type: "object",
        properties: {
          observation_summary: { type: "string" },
          observations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                observation_category: { type: "string" },
                severity: { type: "string" },
                confidence: { type: "string" },
                description: { type: "string" }
              }
            }
          },
          possible_explanations: { type: "array", items: { type: "string" } },
          recommended_next_action: { type: "string" },
          confidence_level: { type: "string", enum: ["high", "medium", "low"] },
          urgency: { type: "string" },
          follow_up_date: { type: "string" },
          source_references: { type: "array", items: { type: "string" } },
          change_from_previous: { type: "string" }
        },
        required: ["observation_summary", "observations", "possible_explanations", "recommended_next_action", "confidence_level", "urgency"]
      }
    });

    const normalized = normalizePhotoAnalysis(result);

    // Safety gate: suppress strong higher-impact recommendations without
    // high confidence + an approved source. This is the extension point that
    // will be strengthened with authoritative knowledge source retrieval.
    if (normalized.action_risk === "higher_impact" && !canShowHigherImpactRecommendation(normalized.confidence_level, normalized.source_references)) {
      normalized.recommended_next_action = "gather_more_evidence";
      normalized.possible_explanations = normalized.possible_explanations.length
        ? normalized.possible_explanations
        : ["More evidence is needed before recommending a stronger intervention."];
    }

    return Response.json({ analysis: normalized, model_provider: "base44-llm" });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}