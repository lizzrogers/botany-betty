import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useGarden } from "@/lib/garden-context";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trees, MapPin, Pencil, Archive } from "lucide-react";
import PlantCard from "@/components/PlantCard";
import StatusBadge from "@/components/StatusBadge";
import { getStatus } from "@/lib/statusConfig";
import { fetchGardenAreas, fetchActivePlants, plantsNeedingAttention } from "@/lib/garden-data";
import AddPlantDialog from "@/components/AddPlantDialog";
import EditAreaDialog from "@/components/EditAreaDialog";

export default function MyGarden() {
  const { activeGarden, needsOnboarding } = useGarden();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [areas, setAreas] = useState([]);
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addPlantOpen, setAddPlantOpen] = useState(false);
  const [addPlantArea, setAddPlantArea] = useState(null);
  const [editingArea, setEditingArea] = useState(null);

  const load = async () => {
    if (!activeGarden) return;
    setLoading(true);
    try {
      const [a, p] = await Promise.all([fetchGardenAreas(activeGarden.id), fetchActivePlants(activeGarden.id)]);
      setAreas(a);
      setPlants(p);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (needsOnboarding) { navigate("/onboarding"); return; }
    load();
  }, [activeGarden, needsOnboarding]);

  const plantsByArea = (areaId) => plants.filter((p) => p.garden_area_id === areaId);
  const uncategorized = plants.filter((p) => !p.garden_area_id || !areas.some((a) => a.id === p.garden_area_id));
  const attention = plantsNeedingAttention(plants);

  const handleAddPlant = (area) => { setAddPlantArea(area); setAddPlantOpen(true); };

  const handleArchiveArea = async (area) => {
    try {
      await base44.entities.GardenArea.update(area.id, { active: false });
      toast({ description: "Garden area archived." });
      load();
    } catch { toast({ variant: "destructive", description: "Could not archive area." }); }
  };

  if (loading) return <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 animate-pulse"><div className="h-8 w-48 bg-muted rounded mb-6" /><div className="h-32 bg-muted rounded-2xl mb-4" /><div className="h-32 bg-muted rounded-2xl" /></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-8">
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">{activeGarden?.name || "My Garden"}</h1>
          {activeGarden?.city && (
            <p className="text-muted-foreground flex items-center gap-1 mt-1 text-sm">
              <MapPin className="h-4 w-4" /> {activeGarden.city}{activeGarden.region ? ` · ${activeGarden.region}` : ""}
            </p>
          )}
        </div>
        <Button onClick={() => handleAddPlant(null)} className="tap-target shrink-0">
          <Plus className="h-5 w-5 mr-1" /> Add Plant
        </Button>
      </div>

      {attention.length > 0 && (
        <div className="mb-6 rounded-2xl border border-status-warning/30 bg-status-warning/5 p-4">
          <p className="text-sm font-medium text-status-warning mb-3">{attention.length} {attention.length === 1 ? "plant needs" : "plants need"} attention</p>
          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-1 px-1">
            {attention.map((p) => (
              <div key={p.id} className="shrink-0 w-36"><PlantCard plant={p} /></div>
            ))}
          </div>
        </div>
      )}

      {areas.length === 0 && plants.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
          <Trees className="h-10 w-10 text-primary/40 mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">No garden areas yet. Create your first area to start adding plants.</p>
          <Button onClick={() => setEditingArea({ __new: true, garden_id: activeGarden.id })} className="tap-target">
            <Plus className="h-5 w-5 mr-1" /> Create garden area
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {areas.map((area) => (
            <div key={area.id}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="font-display text-xl font-bold">{area.name}</h2>
                  <p className="text-xs text-muted-foreground capitalize">{area.area_type?.replace("_", " ")}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleAddPlant(area)} className="tap-target"><Plus className="h-4 w-4 mr-1" /> Plant</Button>
                  <Button variant="ghost" size="icon" onClick={() => setEditingArea(area)} className="tap-target" aria-label="Edit area"><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleArchiveArea(area)} className="tap-target text-muted-foreground" aria-label="Archive area"><Archive className="h-4 w-4" /></Button>
                </div>
              </div>
              {plantsByArea(area.id).length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center">
                  <p className="text-sm text-muted-foreground mb-3">No plants in this area yet.</p>
                  <Button variant="outline" size="sm" onClick={() => handleAddPlant(area)} className="tap-target"><Plus className="h-4 w-4 mr-1" /> Add a plant</Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {plantsByArea(area.id).map((plant) => (
                    <PlantCard key={plant.id} plant={plant} />
                  ))}
                </div>
              )}
            </div>
          ))}

          {uncategorized.length > 0 && (
            <div>
              <h2 className="font-display text-xl font-bold mb-3">Other plants</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {uncategorized.map((plant) => <PlantCard key={plant.id} plant={plant} />)}
              </div>
            </div>
          )}

          <Button variant="outline" onClick={() => setEditingArea({ __new: true, garden_id: activeGarden.id })} className="tap-target w-full border-dashed">
            <Plus className="h-5 w-5 mr-1" /> Add garden area
          </Button>
        </div>
      )}

      <AddPlantDialog open={addPlantOpen} onOpenChange={setAddPlantOpen} area={addPlantArea} areas={areas} onDone={load} />
      <EditAreaDialog area={editingArea} onOpenChange={(o) => !o && setEditingArea(null)} onDone={load} />
    </div>
  );
}