import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  normalizePhotoAnalysis,
  forceConfidenceFromImageQuality,
  canShowHigherImpactRecommendation,
  buildActionTitle,
  dueDateFromUrgency,
  validateFollowUpDate,
  canReanalyze,
  isDuplicateAction,
  hasNoMeaningfulAbnormality,
  classifyActionRisk,
  UNCERTAINTY_RESULT
} from "../../shared/garden-ai.js";
import {
  buildPlantContextPackage,
  findMatchingKnowledgeSources,
  buildHistorySummary,
  currentSeason
} from "../../shared/garden-context.js";

// Orchestrator for the Garden Guidance Foundation.
// Builds a Plant Context Package, analyzes the photo with the LLM, stores
// structured observations + analysis, and creates safe Garden Actions.
//
// The journal entry must be saved BEFORE calling this function.
// On AI failure the journal entry is preserved and an uncertainty result is returned.
export default async function(req) {
  let base44 = null;
  let journalEntryId = null;
  // When re-analyzing, the prior analysis being superseded. Preserved (not
  // deleted) and linked to the new analysis for longitudinal plant memory.
  let priorAnalysisId = null;

  try {
    base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    journalEntryId = body?.journal_entry_id || null;
    const plantId = body?.plant_id;
    const photoUrl = body?.photo_url;
    const forceReanalyze = Boolean(body?.force_reanalyze);

    if (!plantId) return Response.json({ error: 'plant_id is required.' }, { status: 400 });
    if (!photoUrl) return Response.json({ error: 'photo_url is required.' }, { status: 400 });

    // Cost control (Part 11): skip if this journal entry was already analyzed,
    // unless a controlled re-analysis is explicitly requested.
    if (journalEntryId) {
      const existing = await base44.entities.AIAnalysis.filter({ journal_entry_id: journalEntryId });
      if (existing.length > 0 && !forceReanalyze) {
        return Response.json({ analysis: existing[0], already_analyzed: true, model_provider: "cached" });
      }
      // Controlled re-analysis: only when the prior result warrants it.
      // History is preserved — the prior analysis is marked superseded
      // (not deleted) so the system retains longitudinal plant memory.
      if (existing.length > 0 && forceReanalyze) {
        // With history preservation there may be multiple analyses tied
        // to the same journal entry. Re-evaluate eligibility against the
        // most recent one (sorted by analysis_date descending).
        const sorted = existing.slice().sort((a, b) =>
          new Date(b.analysis_date || b.created_date).getTime() -
          new Date(a.analysis_date || a.created_date).getTime()
        );
        const currentAnalysis = sorted[0];
        if (!canReanalyze(currentAnalysis)) {
          return Response.json({ analysis: currentAnalysis, already_analyzed: true, model_provider: "cached", reanalysis_blocked: true });
        }
        // Preserve the prior analysis. Mark superseded_at now; the
        // superseded_by_analysis_id link is set after the new record exists.
        priorAnalysisId = currentAnalysis.id;
        await base44.entities.AIAnalysis.update(priorAnalysisId, {
          superseded_at: new Date().toISOString()
        });
      }
      await base44.entities.JournalEntry.update(journalEntryId, { ai_processing_status: "processing" });
    }

    // Part 1: Build the Plant Context Package from the database.
    const context = await buildPlantContextPackage(base44, plantId, journalEntryId);
    if (!context) return Response.json({ error: 'Plant not found.' }, { status: 404 });

    const season = currentSeason();
    const historySummary = buildHistorySummary(context);

    const plantDescription = [
      context.plant.plant_type ? `Plant type: ${context.plant.plant_type}` : "",
      context.plant.variety ? `Variety: ${context.plant.variety}` : "",
      context.plant.current_status ? `Current status: ${context.plant.current_status}` : "",
      context.plant.planting_date ? `Planted: ${context.plant.planting_date}` : "",
      context.area?.sun_exposure ? `Sun exposure: ${context.area.sun_exposure}` : "",
      context.area?.watering_method ? `Watering method: ${context.area.watering_method}` : "",
      context.area?.soil_notes ? `Soil: ${context.area.soil_notes}` : "",
      context.garden?.region ? `Region: ${context.garden.region}` : "",
      `Season: ${season}`
    ].filter(Boolean).join("\n");

    // Part 2 + 3: Structured photo observation with observation/explanation separation.
    const prompt = `You are a careful garden photo observer for California home vegetable and herb gardens.
Analyze the provided photo and the plant context below.

Your first job is OBSERVATION — describe what is visibly present. Do not invent problems.

Distinguish clearly between:
1. OBSERVATION — what is visibly present in the photo.
2. POSSIBLE EXPLANATION — what might explain it (list alternatives if unsure). Do NOT present this as a confirmed diagnosis.
3. RECOMMENDATION — what the gardener should do next (safest useful step).
4. CONFIDENCE — how certain you are.

CRITICAL RULES:
- If the plant looks healthy with no visible issues, return an empty observations array and set observation_summary to "No meaningful abnormality visible." Do NOT invent a problem.
- If the image is too blurry, dark, distant, or obstructed, set image_quality to "poor" or "unusable", confidence_level to "low", and recommended_next_action to "photograph_again".
- For low or medium confidence, recommend ONLY low-risk actions: observe, photograph_again, inspect_leaves, check_soil_moisture, adjust_watering_timing, temporary_shade, improve_airflow, remove_dead_material, gather_more_evidence.
- Never recommend pesticides, fungicides, fertilizer, major pruning, or soil amendments unless confidence is high. If you cannot, recommend gathering more evidence instead.
- Never invent pesticide/fungicide labels, application rates, or safety information.
- Never present a low-confidence conclusion as a diagnosis.

${plantDescription ? "Plant context:\n" + plantDescription + "\n" : ""}
${historySummary ? "Recent history:\n" + historySummary + "\n" : ""}

Return ONLY a JSON object with this exact shape:
{
  "observation_summary": "one or two sentences describing what is visibly present, or 'No meaningful abnormality visible.'",
  "observations": [
    { "observation_category": "wilting|yellowing|spotting|discoloration|leaf_damage|curling|visible_pest|flowering|fruiting|fruit_damage|vigor|growth|other", "severity": "none|mild|moderate|severe", "confidence": "high|medium|low", "description": "what is seen" }
  ],
  "possible_explanations": ["possible cause 1", "possible cause 2"],
  "recommended_next_action": "a single action key: observe|photograph_again|inspect_leaves|check_soil_moisture|adjust_watering_timing|temporary_shade|improve_airflow|remove_dead_material|gather_more_evidence|pesticide|fungicide|fertilizer|major_pruning|soil_amendment",
  "confidence_level": "high|medium|low",
  "urgency": "urgent|today|follow_up|routine|upcoming",
  "follow_up_date": "YYYY-MM-DD or null",
  "image_quality": "good|fair|poor|unusable",
  "additional_evidence_needed": "what to photograph or record next, or empty string if not needed",
  "higher_impact_considered": false,
  "visible_growth_stage": "seedling|vegetative|flowering|fruiting|mature|unknown",
  "flowering_present": false,
  "fruit_present": false,
  "visible_pest_possible": false,
  "source_references": [],
  "change_from_previous": "how this compares to prior observations, or empty if none"
}`;

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
          image_quality: { type: "string" },
          additional_evidence_needed: { type: "string" },
          higher_impact_considered: { type: "boolean" },
          visible_growth_stage: { type: "string" },
          flowering_present: { type: "boolean" },
          fruit_present: { type: "boolean" },
          visible_pest_possible: { type: "boolean" },
          source_references: { type: "array", items: { type: "string" } },
          change_from_previous: { type: "string" }
        },
        required: ["observation_summary", "observations", "possible_explanations", "recommended_next_action", "confidence_level", "urgency", "image_quality"]
      }
    });

    let normalized = normalizePhotoAnalysis(result);
    if (!normalized) {
      throw new Error("AI returned an invalid or empty result.");
    }

    // Part 4: Force confidence toward LOW when image quality is insufficient.
    normalized.confidence_level = forceConfidenceFromImageQuality(normalized.confidence_level, normalized.image_quality);

    // Part 2 rule: Handle "no meaningful abnormality" cleanly.
    if (hasNoMeaningfulAbnormality(normalized.observations)) {
      if (!normalized.observation_summary) {
        normalized.observation_summary = "No meaningful abnormality visible.";
      }
      normalized.possible_explanations = [];
      if (!normalized.recommended_next_action) normalized.recommended_next_action = "observe";
      normalized.urgency = "routine";
    }

    // Part 6: Find matching approved KnowledgeSources via structured matching.
    const issues = (normalized.observations || [])
      .filter((o) => o.severity && o.severity !== "none")
      .map((o) => o.observation_category)
      .filter(Boolean);
    const knowledgeSources = await findMatchingKnowledgeSources(base44, {
      crop: context.plant.plant_type,
      issues,
      topic: normalized.recommended_next_action,
      region: context.garden?.region,
      season
    });

    normalized.source_references = knowledgeSources.map((s) =>
      `${s.title}${s.organization ? " — " + s.organization : ""}`
    );
    const knowledgeSourceIds = knowledgeSources.map((s) => s.id);

    // Part 5: Safety gate — suppress higher-impact recommendations without
    // high confidence AND an approved knowledge source.
    normalized.action_risk = classifyActionRisk(normalized.recommended_next_action);
    if (normalized.action_risk === "higher_impact") {
      normalized.higher_impact_considered = true;
      if (!canShowHigherImpactRecommendation(normalized.confidence_level, knowledgeSources)) {
        normalized.recommended_next_action = "gather_more_evidence";
        normalized.action_risk = "low";
        if (!normalized.additional_evidence_needed) {
          normalized.additional_evidence_needed = "Take a closer photo of the affected area before considering any treatment.";
        }
      }
    }

    // Validate the LLM-provided follow-up date. The raw value is preserved in
    // raw_result for debugging; only the validated date is used operationally.
    const llmFollowUpDateOriginal = normalized.follow_up_date;
    normalized.follow_up_date = validateFollowUpDate(normalized.follow_up_date);

    // Mark all prior analyses for this plant as non-current. Only the
    // newest analysis is considered current; prior records are preserved
    // as historical context for longitudinal plant memory.
    await base44.entities.AIAnalysis.updateMany(
      { plant_id: plantId },
      { $set: { is_current: false } }
    );

    // Part 7: Store the structured AIAnalysis record.
    const analysisRecord = await base44.entities.AIAnalysis.create({
      journal_entry_id: journalEntryId || undefined,
      plant_id: plantId,
      analysis_date: new Date().toISOString(),
      observation_summary: normalized.observation_summary,
      change_from_previous: normalized.change_from_previous,
      confidence_level: normalized.confidence_level,
      possible_explanations: normalized.possible_explanations,
      urgency: normalized.urgency,
      recommended_next_action: normalized.recommended_next_action,
      follow_up_date: normalized.follow_up_date,
      source_references: normalized.source_references,
      additional_evidence_needed: normalized.additional_evidence_needed,
      higher_impact_considered: normalized.higher_impact_considered,
      image_quality: normalized.image_quality,
      knowledge_source_ids: knowledgeSourceIds,
      raw_result: { ...normalized, llm_follow_up_date_original: llmFollowUpDateOriginal },
      model_provider: "base44-llm",
      is_current: true
    });

    // Link the superseded prior analysis to the new one for the audit trail.
    if (priorAnalysisId) {
      await base44.entities.AIAnalysis.update(priorAnalysisId, {
        superseded_by_analysis_id: analysisRecord.id
      });
    }

    // Part 2: Store structured PlantObservation records.
    for (const obs of normalized.observations || []) {
      await base44.entities.PlantObservation.create({
        plant_id: plantId,
        journal_entry_id: journalEntryId || undefined,
        observation_date: new Date().toISOString(),
        observation_category: obs.observation_category,
        severity: obs.severity,
        confidence: obs.confidence,
        description: obs.description
      });
    }

    // Part 8: Supersede prior pending actions that are no longer appropriate,
    // then create a new Garden Action with duplicate prevention. Completed
    // and skipped actions are preserved untouched.
    if (priorAnalysisId) {
      const priorPendingActions = await base44.entities.GardenAction.filter({
        originating_ai_analysis_id: priorAnalysisId,
        status: "pending"
      });
      const newActionKey = String(normalized.recommended_next_action || "").toLowerCase();
      const needsNoAction = !normalized.recommended_next_action || newActionKey === "observe";
      for (const action of priorPendingActions) {
        if (needsNoAction) {
          await base44.entities.GardenAction.update(action.id, {
            status: "superseded",
            superseded_by_analysis_id: analysisRecord.id,
            superseded_reason: "Superseded by re-analysis: plant now appears healthy."
          });
        } else {
          const oldTitleKey = String(action.title || "").toLowerCase();
          const sameAction = oldTitleKey.includes(newActionKey) || newActionKey.includes(oldTitleKey);
          if (!sameAction) {
            await base44.entities.GardenAction.update(action.id, {
              status: "superseded",
              superseded_by_analysis_id: analysisRecord.id,
              superseded_reason: `Superseded by re-analysis recommending: ${normalized.recommended_next_action.replace(/_/g, " ")}`
            });
          }
        }
      }
    }

    if (normalized.recommended_next_action && normalized.recommended_next_action !== "observe") {
      const existingPending = await base44.entities.GardenAction.filter({
        plant_id: plantId,
        status: "pending"
      });
      if (!isDuplicateAction(existingPending, normalized.recommended_next_action, plantId)) {
        const actionTitle = buildActionTitle(normalized.recommended_next_action, context.plant.display_name);
        const reason = normalized.possible_explanations?.length
          ? normalized.possible_explanations.join("; ")
          : normalized.additional_evidence_needed || "Recommended by Botany Betty's photo analysis.";
        await base44.entities.GardenAction.create({
          garden_id: context.plant.garden_id,
          plant_id: plantId,
          title: actionTitle,
          description: normalized.observation_summary,
          reason,
          priority: normalized.urgency,
          due_date: dueDateFromUrgency(normalized.urgency, normalized.follow_up_date),
          source_type: "ai_analysis",
          originating_ai_analysis_id: analysisRecord.id,
          status: "pending"
        });
      }
    }

    // Mark the journal entry as complete.
    if (journalEntryId) {
      await base44.entities.JournalEntry.update(journalEntryId, { ai_processing_status: "complete" });
    }

    return Response.json({
      analysis: { ...normalized, id: analysisRecord.id },
      plant_display_name: context.plant.display_name,
      knowledge_sources: knowledgeSources.map((s) => ({
        id: s.id,
        title: s.title,
        organization: s.organization,
        url: s.url
      })),
      model_provider: "base44-llm"
    });
  } catch (error) {
    // Part 10: On AI failure, preserve the journal entry and return an uncertainty result.
    if (base44 && journalEntryId) {
      try { await base44.entities.JournalEntry.update(journalEntryId, { ai_processing_status: "failed" }); } catch {}
    }
    return Response.json({
      analysis: UNCERTAINTY_RESULT,
      error: error.message,
      journal_saved: true,
      message: "Botany Betty couldn't analyze this update right now, but your journal entry has been saved."
    });
  }
}