import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { RefreshCw, Camera } from "lucide-react";
import PhotoCapture from "@/components/PhotoCapture";

// Controlled re-analysis card.
// Shows only when the prior analysis had low confidence, poor image quality,
// requested additional evidence, OR the prior AI attempt failed (no analysis
// record but a journal entry with photos in "failed" status).
// Re-uses the existing analyzePlantUpdate orchestration with force_reanalyze.
export default function ReanalysisCard({ analysis, plantId, plantDisplayName, journalEntries, onDone }) {
  const { toast } = useToast();
  const [photos, setPhotos] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  // Find a failed journal entry (no analysis record was stored on failure).
  const failedEntry = (journalEntries || []).find(
    (e) => e.media?.length > 0 && e.ai_processing_status === "failed"
  );

  const journalEntryId = analysis?.journal_entry_id || failedEntry?.id;
  const isRetry = !analysis && Boolean(failedEntry);
  const existingPhoto = failedEntry?.media?.[0];

  // Determine whether re-analysis should be offered.
  const qualifies = analysis
    ? (analysis.confidence_level === "low" ||
       analysis.image_quality === "poor" ||
       analysis.image_quality === "unusable" ||
       (analysis.additional_evidence_needed && analysis.additional_evidence_needed.trim()))
    : isRetry;

  if (!qualifies || !journalEntryId) return null;

  const label = isRetry ? "Try Analysis Again" : "Analyze New Photo";
  const canSubmit = isRetry ? true : photos.length > 0;

  const runReanalysis = async () => {
    const newPhoto = photos[0];
    const photoUrl = newPhoto || existingPhoto;
    if (!photoUrl) {
      toast({ variant: "destructive", description: "Upload a new photo first." });
      return;
    }
    setAnalyzing(true);
    try {
      // If a new photo was uploaded, append it to the journal entry's media.
      if (newPhoto) {
        const entry = await base44.entities.JournalEntry.get(journalEntryId);
        await base44.entities.JournalEntry.update(journalEntryId, {
          media: [...(entry.media || []), newPhoto]
        });
      }
      const res = await base44.functions.invoke("analyzePlantUpdate", {
        journal_entry_id: journalEntryId,
        plant_id: plantId,
        photo_url: photoUrl,
        force_reanalyze: true
      });
      if (res.data?.reanalysis_blocked) {
        toast({ description: "This analysis looks clear enough — no need to re-check." });
      } else if (res.data?.error) {
        toast({ variant: "destructive", description: "Botany Betty couldn't analyze the photo right now." });
      } else {
        toast({ description: "Fresh analysis ready!" });
        setPhotos([]);
        setShowUpload(false);
        if (onDone) onDone();
      }
    } catch (e) {
      toast({ variant: "destructive", description: "Something went wrong during re-analysis." });
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4 mb-6">
      <div className="flex items-start gap-3 mb-3">
        <RefreshCw className="h-5 w-5 text-accent shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground">Want a clearer answer?</p>
          <p className="text-sm text-muted-foreground">
            {isRetry
              ? "Let me take another look at this photo."
              : `Upload a sharper, closer photo of ${plantDisplayName || "the plant"} and I'll take another look.`}
          </p>
        </div>
      </div>

      {!isRetry && showUpload && (
        <div className="mb-3">
          <PhotoCapture
            photos={photos}
            onAdd={(url) => setPhotos((p) => [...p, url])}
            onRemove={(i) => setPhotos((p) => p.filter((_, idx) => idx !== i))}
          />
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {!isRetry && !showUpload && (
          <Button variant="outline" size="sm" onClick={() => setShowUpload(true)} className="tap-target">
            <Camera className="h-4 w-4 mr-1.5" /> Upload new photo
          </Button>
        )}
        {(isRetry || showUpload) && (
          <Button onClick={runReanalysis} disabled={analyzing || !canSubmit} size="sm" className="tap-target">
            {analyzing
              ? <><span className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-1.5" /> Analyzing…</>
              : <><RefreshCw className="h-4 w-4 mr-1.5" /> {label}</>}
          </Button>
        )}
        {isRetry && !showUpload && (
          <Button variant="outline" size="sm" onClick={() => setShowUpload(true)} className="tap-target">
            <Camera className="h-4 w-4 mr-1.5" /> Use a new photo instead
          </Button>
        )}
      </div>
    </div>
  );
}