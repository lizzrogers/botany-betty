import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useGarden } from "@/lib/garden-context";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Droplets, Sprout, CheckCircle2, Eye, Mic, Save, Leaf } from "lucide-react";
import PhotoCapture from "@/components/PhotoCapture";
import { fetchActivePlants, fetchGardenAreas } from "@/lib/garden-data";

const QUICK_ACTIONS = [
  { key: "watered", label: "Watered", icon: Droplets, entryType: "watered" },
  { key: "harvest", label: "Harvested", icon: Sprout, entryType: "harvest" },
  { key: "completed_task", label: "Completed Task", icon: CheckCircle2, entryType: "completed_task" },
  { key: "observation", label: "General Observation", icon: Eye, entryType: "observation" }
];

export default function AddUpdate() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { activeGarden, needsOnboarding } = useGarden();
  const { toast } = useToast();
  const [plants, setPlants] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlants, setSelectedPlants] = useState([]);
  const [selectedArea, setSelectedArea] = useState("");
  const [photos, setPhotos] = useState([]);
  const [note, setNote] = useState("");
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [recording, setRecording] = useState(false);
  const [quickAction, setQuickAction] = useState(params.get("type") || "");
  const [saving, setSaving] = useState(false);

  // Harvest-specific
  const [harvestCrop, setHarvestCrop] = useState("");
  const [harvestQty, setHarvestQty] = useState("");
  const [harvestUnit, setHarvestUnit] = useState("each");

  useEffect(() => {
    if (needsOnboarding) { navigate("/onboarding"); return; }
    if (!activeGarden) return;
    (async () => {
      try {
        const [p, a] = await Promise.all([fetchActivePlants(activeGarden.id), fetchGardenAreas(activeGarden.id)]);
        setPlants(p); setAreas(a);
        const plantParam = params.get("plant");
        if (plantParam) setSelectedPlants([plantParam]);
      } finally { setLoading(false); }
    })();
  }, [activeGarden, needsOnboarding]);

  const togglePlant = (id) => {
    setSelectedPlants((prev) => prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]);
  };

  const startVoice = () => {
    // Use the browser's SpeechRecognition if available for voice-to-text.
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      toast({ description: "Voice input isn't available on this browser. You can type your note instead." });
      return;
    }
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    setRecording(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setVoiceTranscript((prev) => (prev ? prev + " " : "") + transcript);
    };
    recognition.onerror = () => { toast({ variant: "destructive", description: "Voice input failed." }); setRecording(false); };
    recognition.onend = () => setRecording(false);
    recognition.start();
  };

  const save = async () => {
    if (!activeGarden) return;
    if (selectedPlants.length === 0 && !selectedArea) {
      toast({ variant: "destructive", description: "Choose a plant or garden area." });
      return;
    }
    setSaving(true);
    try {
      const entryType = QUICK_ACTIONS.find((q) => q.key === quickAction)?.entryType || "general";
      const combinedNote = [note, voiceTranscript].filter(Boolean).join(voiceTranscript && note ? " " : "");

      const entry = await base44.entities.JournalEntry.create({
        garden_id: activeGarden.id,
        plant_ids: selectedPlants,
        garden_area_id: selectedArea || undefined,
        entry_type: entryType,
        note: note || undefined,
        voice_transcript: voiceTranscript || undefined,
        media: photos,
        ai_processing_status: photos.length > 0 ? "pending" : "skipped"
      });

      // Quick action side-effects
      if (quickAction === "watered") {
        for (const pid of selectedPlants) {
          await base44.entities.WateringRecord.create({
            garden_id: activeGarden.id, plant_id: pid, garden_area_id: selectedArea || undefined,
            timestamp: new Date().toISOString(), source: "quick_action"
          });
        }
        if (!selectedPlants.length && selectedArea) {
          await base44.entities.WateringRecord.create({
            garden_id: activeGarden.id, garden_area_id: selectedArea,
            timestamp: new Date().toISOString(), source: "quick_action"
          });
        }
      }

      if (quickAction === "harvest" && selectedPlants.length > 0) {
        for (const pid of selectedPlants) {
          await base44.entities.Harvest.create({
            garden_id: activeGarden.id, plant_id: pid,
            crop: harvestCrop || plants.find((p) => p.id === pid)?.plant_type || "Produce",
            date: new Date().toISOString().slice(0, 10),
            quantity: harvestQty ? parseFloat(harvestQty) : undefined,
            unit: harvestUnit,
            photo: photos[0] || undefined
          });
        }
      }

      // Trigger AI plant update analysis if a photo was attached to a single plant.
      // The backend function builds the full plant context, stores structured
      // observations + analysis, and creates safe Garden Actions.
      // The journal entry is already saved above — AI failure does not lose it.
      if (photos.length > 0 && selectedPlants.length === 1) {
        try {
          const res = await base44.functions.invoke("analyzePlantUpdate", {
            journal_entry_id: entry.id,
            plant_id: selectedPlants[0],
            photo_url: photos[0]
          });
          if (res.data?.error) {
            toast({ description: "Botany Betty couldn't analyze this update right now, but your journal entry has been saved." });
          }
        } catch (e) {
          // Journal entry is already saved — AI failure does not lose it.
          toast({ description: "Botany Betty couldn't analyze this update right now, but your journal entry has been saved." });
        }
      }

      toast({ description: "Update saved." });
      navigate(selectedPlants.length === 1 ? `/plant/${selectedPlants[0]}` : "/journal");
    } catch (e) {
      toast({ variant: "destructive", description: "Could not save the update." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="max-w-2xl mx-auto px-4 py-8 animate-pulse"><div className="h-8 w-40 bg-muted rounded mb-6" /><div className="h-20 bg-muted rounded-2xl mb-4" /><div className="h-32 bg-muted rounded-2xl" /></div>;

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-8 py-6 md:py-8">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <h1 className="font-display text-3xl font-semibold mb-6">Add Update</h1>

      {/* Select plants or area */}
      <section className="mb-6">
        <Label className="text-base font-medium">What is this about?</Label>
        <p className="text-sm text-muted-foreground mb-3">Select one or more plants, or a garden area.</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {plants.map((p) => (
            <button
              key={p.id}
              onClick={() => togglePlant(p.id)}
              className={`tap-target flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
                selectedPlants.includes(p.id) ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface hover:bg-muted"
              }`}
            >
              <Leaf className="h-3.5 w-3.5" /> {p.display_name}
            </button>
          ))}
        </div>
        {areas.length > 0 && (
          <Select value={selectedArea} onValueChange={setSelectedArea}>
            <SelectTrigger className="tap-target"><SelectValue placeholder="Or choose a garden area" /></SelectTrigger>
            <SelectContent>
              {areas.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </section>

      {/* Quick actions */}
      <section className="mb-6">
        <Label className="text-base font-medium">Quick action</Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
          {QUICK_ACTIONS.map((q) => (
            <button
              key={q.key}
              onClick={() => setQuickAction(quickAction === q.key ? "" : q.key)}
              className={`tap-target flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-sm font-medium transition-colors ${
                quickAction === q.key ? "border-accent bg-accent text-accent-foreground" : "border-border bg-surface hover:bg-muted"
              }`}
            >
              <q.icon className="h-5 w-5" /> {q.label}
            </button>
          ))}
        </div>
      </section>

      {/* Harvest details */}
      {quickAction === "harvest" && (
        <section className="mb-6 rounded-2xl border border-border bg-surface p-4">
          <Label htmlFor="crop">Crop</Label>
          <Input id="crop" value={harvestCrop} onChange={(e) => setHarvestCrop(e.target.value)} placeholder="e.g. Tomatoes" className="tap-target mt-1.5 mb-3" />
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="qty">Quantity</Label>
              <Input id="qty" type="number" value={harvestQty} onChange={(e) => setHarvestQty(e.target.value)} placeholder="0" className="tap-target mt-1.5" />
            </div>
            <div className="w-28">
              <Label>Unit</Label>
              <Select value={harvestUnit} onValueChange={setHarvestUnit}>
                <SelectTrigger className="tap-target mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="each">each</SelectItem>
                  <SelectItem value="lbs">lbs</SelectItem>
                  <SelectItem value="oz">oz</SelectItem>
                  <SelectItem value="cups">cups</SelectItem>
                  <SelectItem value="bunches">bunches</SelectItem>
                  <SelectItem value="grams">grams</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>
      )}

      {/* Photo */}
      <section className="mb-6">
        <Label className="text-base font-medium">Photo</Label>
        <p className="text-sm text-muted-foreground mb-2">Capture what you're seeing. AI can analyze it for you.</p>
        <PhotoCapture photos={photos} onAdd={(url) => setPhotos((p) => [...p, url])} onRemove={(i) => setPhotos((p) => p.filter((_, idx) => idx !== i))} />
      </section>

      {/* Note + voice */}
      <section className="mb-6">
        <Label className="text-base font-medium" htmlFor="note">What are you noticing or what did you do?</Label>
        <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Type a quick note…" className="mt-2 min-h-[100px] text-base" />
        <div className="mt-2">
          <Button type="button" variant="outline" size="sm" onClick={startVoice} disabled={recording} className="tap-target">
            <Mic className="h-4 w-4 mr-1.5" /> {recording ? "Listening…" : "Voice note"}
          </Button>
          {voiceTranscript && (
            <div className="mt-2 rounded-xl bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground mb-1">Voice transcript:</p>
              <p className="text-sm">{voiceTranscript}</p>
            </div>
          )}
        </div>
      </section>

      <Button onClick={save} disabled={saving} size="lg" className="tap-target w-full text-base">
        {saving ? <><span className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" /> Saving…</> : <><Save className="h-5 w-5 mr-2" /> Save update</>}
      </Button>
    </div>
  );
}