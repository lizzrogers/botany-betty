import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useGarden } from "@/lib/garden-context";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { NotebookPen, Plus, Leaf, Eye, Droplets, Sprout, CheckCircle2, FlaskConical } from "lucide-react";
import { fetchJournalEntries, fetchActivePlants, fetchGardenAreas, formatDateTime } from "@/lib/garden-data";
import { ENTRY_TYPE_CONFIG } from "@/lib/statusConfig";

const ENTRY_ICONS = { Eye, Droplets, Sprout, CheckCircle2, NotebookPen, FlaskConical };

export default function Journal() {
  const navigate = useNavigate();
  const { activeGarden, needsOnboarding } = useGarden();
  const [entries, setEntries] = useState([]);
  const [plants, setPlants] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterPlant, setFilterPlant] = useState("all");
  const [filterArea, setFilterArea] = useState("all");
  const [filterType, setFilterType] = useState("all");

  useEffect(() => {
    if (needsOnboarding) { navigate("/onboarding"); return; }
    if (!activeGarden) return;
    (async () => {
      setLoading(true);
      try {
        const [e, p, a] = await Promise.all([
          fetchJournalEntries(activeGarden.id, 100),
          fetchActivePlants(activeGarden.id),
          fetchGardenAreas(activeGarden.id)
        ]);
        setEntries(e); setPlants(p); setAreas(a);
      } finally { setLoading(false); }
    })();
  }, [activeGarden, needsOnboarding]);

  const plantName = (id) => plants.find((p) => p.id === id)?.display_name || "A plant";
  const areaName = (id) => areas.find((a) => a.id === id)?.name || "";

  const filtered = entries.filter((e) => {
    if (filterPlant !== "all" && !(e.plant_ids || []).includes(filterPlant)) return false;
    if (filterArea !== "all" && e.garden_area_id !== filterArea) return false;
    if (filterType !== "all" && e.entry_type !== filterType) return false;
    return true;
  });

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-8 animate-pulse"><div className="h-8 w-40 bg-muted rounded mb-6" /><div className="h-24 bg-muted rounded-2xl mb-3" /><div className="h-24 bg-muted rounded-2xl" /></div>;

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-6 md:py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-semibold">Journal</h1>
          <p className="text-muted-foreground text-sm mt-1">Your garden's story, in order.</p>
        </div>
        <Button onClick={() => navigate("/add-update")} className="tap-target shrink-0"><Plus className="h-5 w-5 mr-1" /> Add</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Select value={filterPlant} onValueChange={setFilterPlant}>
          <SelectTrigger className="tap-target w-auto min-w-[140px] text-sm"><SelectValue placeholder="All plants" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All plants</SelectItem>
            {plants.map((p) => <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterArea} onValueChange={setFilterArea}>
          <SelectTrigger className="tap-target w-auto min-w-[140px] text-sm"><SelectValue placeholder="All areas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All areas</SelectItem>
            {areas.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="tap-target w-auto min-w-[140px] text-sm"><SelectValue placeholder="All types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {Object.entries(ENTRY_TYPE_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
          <NotebookPen className="h-10 w-10 text-primary/40 mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">No journal entries yet. Add your first update to start your garden's story.</p>
          <Button onClick={() => navigate("/add-update")} className="tap-target"><Plus className="h-4 w-4 mr-1.5" /> Add update</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((entry) => {
            const typeCfg = ENTRY_TYPE_CONFIG[entry.entry_type] || ENTRY_TYPE_CONFIG.general;
            const TypeIcon = ENTRY_ICONS[typeCfg.icon] || NotebookPen;
            return (
              <div key={entry.id} className="rounded-2xl border border-border bg-surface overflow-hidden">
                {entry.media?.length > 0 && (
                  <div className="flex gap-1 overflow-x-auto no-scrollbar">
                    {entry.media.map((m, i) => <img key={i} src={m} alt="" className="h-40 w-full object-cover" />)}
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <TypeIcon className="h-3.5 w-3.5" /> {typeCfg.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatDateTime(entry.created_date)}</span>
                  </div>
                  {entry.plant_ids?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {entry.plant_ids.map((pid) => (
                        <button key={pid} onClick={() => navigate(`/plant/${pid}`)} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                          <Leaf className="h-3 w-3" /> {plantName(pid)}
                        </button>
                      ))}
                    </div>
                  )}
                  {entry.garden_area_id && !entry.plant_ids?.length && (
                    <p className="text-xs text-muted-foreground mb-2">{areaName(entry.garden_area_id)}</p>
                  )}
                  {entry.note && <p className="text-sm text-foreground/90 leading-relaxed">{entry.note}</p>}
                  {entry.voice_transcript && <p className="text-sm text-muted-foreground italic mt-1">"{entry.voice_transcript}"</p>}
                  {entry.ai_processing_status === "complete" && <p className="text-xs text-primary mt-2">✓ AI analyzed</p>}
                  {entry.ai_processing_status === "pending" && <p className="text-xs text-muted-foreground mt-2">AI analyzing…</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}