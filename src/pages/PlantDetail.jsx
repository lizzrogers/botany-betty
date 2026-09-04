import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Image as ImageIcon, Flag, Check, Droplets, Sprout, Eye, FlaskConical, Calendar, NotebookPen } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import ConfidenceNotice from "@/components/ConfidenceNotice";
import { getStatus, getConfidence, ENTRY_TYPE_CONFIG } from "@/lib/statusConfig";
import { formatDate, formatDateTime } from "@/lib/garden-data";

export default function PlantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [plant, setPlant] = useState(null);
  const [area, setArea] = useState(null);
  const [observations, setObservations] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [actions, setActions] = useState([]);
  const [journal, setJournal] = useState([]);
  const [watering, setWatering] = useState([]);
  const [harvests, setHarvests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingStatus, setEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState("");

  const loadAll = async () => {
    setLoading(true);
    try {
      const p = await base44.entities.Plant.get(id);
      setPlant(p);
      setNewStatus(p.current_status);
      const [obs, ana, acts, jou, wat, har] = await Promise.all([
        base44.entities.PlantObservation.filter({ plant_id: id }, "-observation_date"),
        base44.entities.AIAnalysis.filter({ plant_id: id }, "-analysis_date"),
        base44.entities.GardenAction.filter({ plant_id: id }, "-created_date"),
        base44.entities.JournalEntry.filter({ garden_id: p.garden_id }, "-created_date", 50),
        base44.entities.WateringRecord.filter({ plant_id: id }, "-timestamp"),
        base44.entities.Harvest.filter({ plant_id: id }, "-date")
      ]);
      setObservations(obs);
      setAnalyses(ana);
      setActions(acts);
      setWatering(wat);
      setHarvests(har);
      const plantJournal = jou.filter((e) => e.plant_ids?.includes(id));
      setJournal(plantJournal);
      if (p.garden_area_id) {
        try { setArea(await base44.entities.GardenArea.get(p.garden_area_id)); } catch {}
      }
    } catch (e) {
      toast({ variant: "destructive", description: "Could not load this plant." });
      navigate("/garden");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, [id]);

  const saveStatus = async () => {
    try {
      await base44.entities.Plant.update(id, { current_status: newStatus });
      setPlant({ ...plant, current_status: newStatus });
      setEditingStatus(false);
      toast({ description: "Status updated." });
    } catch { toast({ variant: "destructive", description: "Could not update status." }); }
  };

  const finishPlant = async () => {
    try {
      await base44.entities.Plant.update(id, { active: false, current_status: "finished", finished_date: new Date().toISOString().slice(0, 10) });
      toast({ description: "Plant marked as finished. Great season!" });
      loadAll();
    } catch { toast({ variant: "destructive", description: "Could not finish the plant." }); }
  };

  const quickWater = async () => {
    try {
      await base44.entities.WateringRecord.create({ garden_id: plant.garden_id, plant_id: id, timestamp: new Date().toISOString(), source: "quick_action" });
      toast({ description: "Watering recorded." });
      loadAll();
    } catch { toast({ variant: "destructive", description: "Could not record watering." }); }
  };

  if (loading || !plant) return <div className="max-w-3xl mx-auto px-4 py-8 animate-pulse"><div className="h-8 w-32 bg-muted rounded mb-4" /><div className="h-48 bg-muted rounded-2xl mb-4" /><div className="h-32 bg-muted rounded-2xl" /></div>;

  const status = getStatus(plant.current_status);
  const pendingActions = actions.filter((a) => a.status === "pending");

  // Build a merged timeline
  const timeline = [
    ...journal.map((e) => ({ type: "journal", date: e.created_date, data: e })),
    ...observations.map((o) => ({ type: "observation", date: o.observation_date, data: o })),
    ...analyses.map((a) => ({ type: "analysis", date: a.analysis_date, data: a })),
    ...watering.map((w) => ({ type: "watering", date: w.timestamp, data: w })),
    ...harvests.map((h) => ({ type: "harvest", date: h.date || h.created_date, data: h })),
    ...actions.filter((a) => a.status === "completed").map((a) => ({ type: "action", date: a.completed_date, data: a }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-6 md:py-8">
      <button onClick={() => navigate("/garden")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> My Garden
      </button>

      {/* Hero */}
      <div className="rounded-2xl overflow-hidden border border-border bg-surface mb-6">
        <div className="relative aspect-[16/10] bg-muted">
          {plant.primary_photo ? (
            <img src={plant.primary_photo} alt={plant.display_name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-primary/10">
              <ImageIcon className="h-12 w-12 text-primary/30" />
            </div>
          )}
        </div>
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-semibold">{plant.display_name}</h1>
              <p className="text-muted-foreground mt-0.5">{plant.plant_type}{plant.variety ? ` · ${plant.variety}` : ""}</p>
            </div>
            <StatusBadge label={status.label} icon={status.icon} tone={status.tone} size="md" />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-sm text-muted-foreground">
            {area && <span>{area.name}</span>}
            {plant.planting_date && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Planted {formatDate(plant.planting_date)}</span>}
            {plant.identification_method === "ai_photo" && <span>AI-identified</span>}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
        <Button onClick={() => navigate(`/add-update?plant=${id}`)} className="tap-target col-span-2 md:col-span-1"><Plus className="h-4 w-4 mr-1.5" /> Add Update</Button>
        <Button onClick={quickWater} variant="outline" className="tap-target"><Droplets className="h-4 w-4 mr-1.5" /> Watered</Button>
        <Button onClick={() => navigate(`/add-update?plant=${id}&type=harvest`)} variant="outline" className="tap-target"><Sprout className="h-4 w-4 mr-1.5" /> Harvest</Button>
        {plant.active !== false && (
          <Button onClick={finishPlant} variant="outline" className="tap-target text-muted-foreground"><Flag className="h-4 w-4 mr-1.5" /> Finish</Button>
        )}
      </div>

      {/* Status editor */}
      {editingStatus ? (
        <div className="rounded-2xl border border-border bg-surface p-4 mb-6">
          <Label>Update status</Label>
          <div className="flex gap-2 mt-2">
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger className="tap-target flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="healthy">Healthy</SelectItem>
                <SelectItem value="watch">Watch</SelectItem>
                <SelectItem value="needs_attention">Needs Attention</SelectItem>
                <SelectItem value="serious_concern">Serious Concern</SelectItem>
                <SelectItem value="harvesting">Harvesting</SelectItem>
                <SelectItem value="finished">Finished</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={saveStatus} className="tap-target">Save</Button>
            <Button onClick={() => { setEditingStatus(false); setNewStatus(plant.current_status); }} variant="ghost" className="tap-target">Cancel</Button>
          </div>
        </div>
      ) : (
        <button onClick={() => setEditingStatus(true)} className="text-sm text-primary hover:underline mb-6 block">Update status</button>
      )}

      {/* Current concerns / latest analysis */}
      {analyses.length > 0 && (
        <section className="mb-6">
          <h2 className="font-display text-xl font-bold mb-3">Latest AI Assessment</h2>
          <div className="rounded-2xl border border-border bg-surface p-5">
            <ConfidenceNotice level={analyses[0].confidence_level} className="mb-3" />
            {(analyses[0].image_quality === "poor" || analyses[0].image_quality === "unusable") && (
              <p className="text-sm text-status-warning mb-3">This photo was hard to read clearly. A sharper, closer photo would help.</p>
            )}
            <p className="text-sm font-medium mb-1">What I noticed</p>
            <p className="text-sm text-foreground/90 leading-relaxed mb-3">{analyses[0].observation_summary}</p>
            {analyses[0].possible_explanations?.length > 0 && (
              <div className="mb-3">
                <p className="text-sm font-medium mb-1">What it might mean</p>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
                  {analyses[0].possible_explanations.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}
            {analyses[0].recommended_next_action && (
              <div className="rounded-xl bg-primary/10 p-3 mb-3">
                <p className="text-sm font-medium text-primary mb-0.5">What to do next</p>
                <p className="text-sm text-primary/90">{analyses[0].recommended_next_action.replace(/_/g, " ")}</p>
              </div>
            )}
            {analyses[0].additional_evidence_needed && (
              <div className="rounded-xl bg-muted/50 p-3 mb-3">
                <p className="text-sm font-medium mb-0.5">To get a clearer answer</p>
                <p className="text-sm text-muted-foreground">{analyses[0].additional_evidence_needed}</p>
              </div>
            )}
            {analyses[0].source_references?.length > 0 && (
              <div className="mb-3">
                <p className="text-sm font-medium mb-1">Why this recommendation?</p>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
                  {analyses[0].source_references.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
            {analyses[0].change_from_previous && <p className="text-sm text-muted-foreground mb-2"><span className="font-medium">Change: </span>{analyses[0].change_from_previous}</p>}
            <p className="text-xs text-muted-foreground">{formatDateTime(analyses[0].analysis_date)}</p>
          </div>
        </section>
      )}

      {/* Next recommended actions */}
      {pendingActions.length > 0 && (
        <section className="mb-6">
          <h2 className="font-display text-xl font-bold mb-3">Next Actions</h2>
          <div className="space-y-2">
            {pendingActions.map((a) => (
              <div key={a.id} className="rounded-xl border border-border bg-surface p-3 flex items-center justify-between gap-3">
                <div><p className="font-medium text-sm">{a.title}</p>{a.due_date && <p className="text-xs text-muted-foreground">Due {formatDate(a.due_date)}</p>}</div>
                <Button size="sm" variant="outline" onClick={async () => { await base44.entities.GardenAction.update(a.id, { status: "completed", completed_date: new Date().toISOString() }); loadAll(); }} className="tap-target"><Check className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Timeline */}
      <section>
        <h2 className="font-display text-xl font-bold mb-3">History</h2>
        {timeline.length === 0 ? (
          <p className="text-muted-foreground text-sm">No history yet. Add an update to start building this plant's story.</p>
        ) : (
          <div className="space-y-3">
            {timeline.map((item, i) => <TimelineEntry key={i} item={item} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function TimelineEntry({ item }) {
  const icons = { journal: NotebookPen, observation: Eye, analysis: FlaskConical, watering: Droplets, harvest: Sprout, action: Check };
  const Icon = icons[item.type] || Eye;
  const labels = { journal: "Journal", observation: "Observation", analysis: "AI Analysis", watering: "Watered", harvest: "Harvest", action: "Completed" };
  const d = item.data;
  let detail = "";
  if (item.type === "journal") detail = d.note || d.voice_transcript || (d.entry_type && ENTRY_TYPE_CONFIG[d.entry_type]?.label) || "Update";
  else if (item.type === "observation") detail = `${d.observation_category?.replace("_", " ")}${d.description ? ": " + d.description : ""}`;
  else if (item.type === "analysis") detail = d.observation_summary;
  else if (item.type === "watering") detail = "Watered this plant";
  else if (item.type === "harvest") detail = `${d.quantity || ""} ${d.unit || ""} ${d.crop || ""}`.trim();
  else if (item.type === "action") detail = d.title;

  return (
    <div className="flex gap-3 rounded-xl border border-border bg-surface p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">{labels[item.type]}</p>
          <span className="text-xs text-muted-foreground shrink-0">{formatDateTime(item.date)}</span>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">{detail}</p>
        {d.media?.length > 0 && (
          <div className="flex gap-1.5 mt-2">
            {d.media.slice(0, 3).map((m, i) => <img key={i} src={m} alt="" className="h-14 w-14 rounded-lg object-cover border border-border" />)}
          </div>
        )}
      </div>
    </div>
  );
}