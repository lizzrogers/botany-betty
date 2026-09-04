import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { normalizeIdentification } from "../../shared/garden-ai.js";

// AI-assisted plant identification from a photo.
// Returns structured results (likely plant, confidence, alternatives).
// The user MUST confirm — this never creates a plant record itself.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const photoUrl = body?.photo_url;
    if (!photoUrl) return Response.json({ error: 'A photo_url is required.' }, { status: 400 });

    const prompt = `You are a horticultural identification assistant for California home vegetable and herb gardens.
Analyze the provided photo and identify the plant. Consider only edible vegetables and culinary herbs commonly grown in California home gardens.

Return ONLY a JSON object with this exact shape:
{
  "likely_plant": "common name of the most likely plant, e.g. Tomato",
  "confidence": "high" | "medium" | "low",
  "alternatives": ["other plausible common names, if any"],
  "notes": "one short sentence noting key visual cues, or empty string"
}

Rules:
- If the photo is unclear, not a plant, or you cannot identify it with reasonable confidence, set confidence to "low" and likely_plant to "Unknown".
- Never present an uncertain identification as certain.
- Do not include ornamental flowers, shrubs, trees, or houseplants as likely_plant.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      file_urls: [photoUrl],
      response_json_schema: {
        type: "object",
        properties: {
          likely_plant: { type: "string" },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
          alternatives: { type: "array", items: { type: "string" } },
          notes: { type: "string" }
        },
        required: ["likely_plant", "confidence", "alternatives", "notes"]
      }
    });

    const normalized = normalizeIdentification(result);
    return Response.json({ identification: normalized, model_provider: "base44-llm" });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}