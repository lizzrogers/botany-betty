import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Search, Check, RefreshCw, Leaf } from "lucide-react";
import PhotoCapture from "@/components/PhotoCapture";
import ConfidenceNotice from "@/components/ConfidenceNotice";

const COMMON_PLANTS = [
  "Tomato", "Cherry Tomato", "Basil", "Sweet Basil", "Pepper", "Bell Pepper", "Jalapeño",
  "Zucchini", "Cucumber", "Lettuce", "Kale", "Swiss Chard", "Cilantro", "Parsley",
  "Rosemary", "Thyme", "Mint", "Oregano", "Sage", "Chives", "Green Onion",
  "Eggplant", "Carrot", "Radish", "Bush Bean", "Pole Bean", "Squash", "Pumpkin",
  "Strawberry", "Cauliflower", "Broccoli", "Cabbage", "Arugula", "Spinach", "Fennel", "Dill"
];

export default function AddPlantDialog({ open, onOpenChange, area, areas, onDone }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mode, setMode] = useState(null); // null | "photo" | "manual"
  const [photos, setPhotos] = useState([]);
  const [identifying, setIdentifying] = useState(false);
  const [identification, setIdentification] = useState(null);
  const [confirmedType, setConfirmedType] = useState("");
  const [variety, setVariety] = useState("");
  const [plantingDate, setPlantingDate] = useState("");
  const [selectedArea, setSelectedArea] = useState(area?.id || "");
  const [displayName, setDisplayName] = useState("");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setMode(null); setPhotos([]); setIdentification(null); setConfirmedType("");
    setVariety(""); setPlantingDate(""); setDisplayName(""); setSearch("");
  };

  const close = () => { reset(); onOpenChange(false); };

  const identify = async () => {
    if (!photos[0]) return;
    setIdentifying(true);
    setIdentification(null);
    try {
      const res = await base44.functions.invoke("identifyPlant", { photo_url: photos[0] });
      setIdentification(res.data.identification);
      if (res.data.identification?.likely_plant && res.data.identification.likely_plant !== "Unknown") {
        setConfirmedType(res.data.identification.likely_plant);
      }
    } catch (e) {
      toast({ variant: "destructive", description: "Could not identify the plant. You can enter it manually." });
    } finally {
      setIdentifying(false);
    }
  };

  const save = async () => {
    if (!confirmedType) { toast({ variant: "destructive", description: "Please confirm the plant type." }); return; }
    setSaving(true);
    try {
      const gardenId = area?.garden_id || areas[0]?.garden_id;
      const plant = await base44.entities.Plant.create({
        garden_id: gardenId,
        garden_area_id: selectedArea || area?.id || null,
        display_name: displayName || `${confirmedType} #${Date.now() % 1000}`,
        plant_type: confirmedType,
        variety: variety || undefined,
        planting_date: plantingDate || undefined,
        identification_method: mode === "photo" ? (identification ? "ai_photo" : "manual_with_ai_help") : "manual",
        ai_identification_confidence: identification?.confidence || "unknown",
        current_status: "healthy",
        primary_photo: photos[0] || undefined,
        active: true
      });
      toast({ description: `${confirmedType} added to your garden.` });
      close();
      onDone?.();
      navigate(`/plant/${plant.id}`);
    } catch (e) {
      toast({ variant: "destructive", description: "Could not save the plant." });
    } finally {
      setSaving(false);
    }
  };

  const filtered = COMMON_PLANTS.filter((p) => p.toLowerCase().includes(search.toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add a plant</DialogTitle>
        </DialogHeader>

        {!mode && (
          <div className="space-y-3 py-2">
            <button onClick={() => setMode("photo")} className="tap-target w-full flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 hover:bg-muted text-left">
              <Camera className="h-6 w-6 text-primary" />
              <div>
                <p className="font-medium">Take a photo</p>
                <p className="text-sm text-muted-foreground">AI will help identify it. You confirm.</p>
              </div>
            </button>
            <button onClick={() => setMode("manual")} className="tap-target w-full flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 hover:bg-muted text-left">
              <Search className="h-6 w-6 text-primary" />
              <div>
                <p className="font-medium">Choose manually</p>
                <p className="text-sm text-muted-foreground">Search common vegetables & herbs.</p>
              </div>
            </button>
          </div>
        )}

        {mode === "photo" && (
          <div className="space-y-4 py-2">
            <PhotoCapture photos={photos} onAdd={(url) => setPhotos((p) => [...p, url])} onRemove={(i) => setPhotos((p) => p.filter((_, idx) => idx !== i))} max={1} />
            {photos.length > 0 && !identification && (
              <Button onClick={identify} disabled={identifying} className="tap-target w-full">
                {identifying ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Identifying…</> : "Identify this plant"}
              </Button>
            )}
            {identification && (
              <div className="space-y-3">
                <div className="rounded-2xl border border-border bg-muted/40 p-4">
                  <p className="text-sm text-muted-foreground">This appears to be</p>
                  <p className="font-display text-xl font-semibold mt-0.5">{identification.likely_plant}</p>
                  <p className="text-sm text-muted-foreground mt-1">Is that correct?</p>
                  <ConfidenceNotice level={identification.confidence} className="mt-3" />
                  {identification.alternatives?.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">Alternatives: {identification.alternatives.join(", ")}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setMode("manual")} variant="outline" className="tap-target flex-1">Choose another</Button>
                  <Button onClick={() => setConfirmedType(identification.likely_plant)} className="tap-target flex-1" disabled={!identification.likely_plant || identification.likely_plant === "Unknown"}>
                    <Check className="h-4 w-4 mr-1" /> Yes
                  </Button>
                </div>
              </div>
            )}
            {confirmedType && <PlantDetailsFields {...{ confirmedType, setConfirmedType, variety, setVariety, plantingDate, setPlantingDate, selectedArea, setSelectedArea, displayName, setDisplayName, areas }} />}
            {confirmedType && (
              <DialogFooter>
                <Button variant="ghost" onClick={() => { setMode(null); setPhotos([]); setIdentification(null); setConfirmedType(""); }} className="tap-target">Start over</Button>
                <Button onClick={save} disabled={saving} className="tap-target">{saving ? "Saving…" : "Add plant"}</Button>
              </DialogFooter>
            )}
          </div>
        )}

        {mode === "manual" && (
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="search">Search plants</Label>
              <Input id="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tomato, basil, pepper…" className="tap-target mt-1.5" autoFocus />
            </div>
            <div className="max-h-48 overflow-y-auto rounded-xl border border-border divide-y divide-border">
              {filtered.length === 0 ? (
                <button onClick={() => setConfirmedType(search)} className="tap-target w-full text-left px-3 text-sm text-primary">Use "{search}"</button>
              ) : (
                filtered.slice(0, 20).map((p) => (
                  <button key={p} onClick={() => setConfirmedType(p)} className={`tap-target w-full text-left px-3 py-2.5 text-sm hover:bg-muted flex items-center gap-2 ${confirmedType === p ? "bg-primary/10 font-medium text-primary" : ""}`}>
                    <Leaf className="h-4 w-4 text-muted-foreground" /> {p}
                  </button>
                ))
              )}
            </div>
            {confirmedType && <PlantDetailsFields {...{ confirmedType, setConfirmedType, variety, setVariety, plantingDate, setPlantingDate, selectedArea, setSelectedArea, displayName, setDisplayName, areas }} />}
            {confirmedType && (
              <DialogFooter>
                <Button variant="ghost" onClick={reset} className="tap-target">Start over</Button>
                <Button onClick={save} disabled={saving} className="tap-target">{saving ? "Saving…" : "Add plant"}</Button>
              </DialogFooter>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PlantDetailsFields({ confirmedType, setConfirmedType, variety, setVariety, plantingDate, setPlantingDate, selectedArea, setSelectedArea, displayName, setDisplayName, areas }) {
  return (
    <div className="space-y-3 border-t border-border pt-4">
      <div>
        <Label htmlFor="ptype">Plant type</Label>
        <Input id="ptype" value={confirmedType} onChange={(e) => setConfirmedType(e.target.value)} className="tap-target mt-1.5" />
      </div>
      <div>
        <Label htmlFor="pname">Display name (optional)</Label>
        <Input id="pname" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. Tomato #1" className="tap-target mt-1.5" />
      </div>
      <div>
        <Label htmlFor="pvariety">Variety (optional)</Label>
        <Input id="pvariety" value={variety} onChange={(e) => setVariety(e.target.value)} placeholder="e.g. Early Girl" className="tap-target mt-1.5" />
      </div>
      <div>
        <Label htmlFor="pdate">Planting / transplant date (optional)</Label>
        <Input id="pdate" type="date" value={plantingDate} onChange={(e) => setPlantingDate(e.target.value)} className="tap-target mt-1.5" />
      </div>
      {areas && areas.length > 0 && (
        <div>
          <Label>Garden area</Label>
          <Select value={selectedArea} onValueChange={setSelectedArea}>
            <SelectTrigger className="tap-target mt-1.5"><SelectValue placeholder="Choose an area" /></SelectTrigger>
            <SelectContent>
              {areas.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}