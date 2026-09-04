import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const AREA_TYPES = [
  { value: "raised_bed", label: "Raised bed" },
  { value: "in_ground", label: "In-ground" },
  { value: "container", label: "Container" },
  { value: "patio", label: "Patio" },
  { value: "greenhouse", label: "Greenhouse" },
  { value: "other", label: "Other" }
];

export default function EditAreaDialog({ area, onOpenChange, onDone }) {
  const { toast } = useToast();
  const open = !!area;
  const isNew = area?.__new;
  const [name, setName] = useState("");
  const [areaType, setAreaType] = useState("raised_bed");
  const [sunExposure, setSunExposure] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (area) {
      setName(area.name || "");
      setAreaType(area.area_type || "raised_bed");
      setSunExposure(area.sun_exposure || "");
    }
  }, [area]);

  const save = async () => {
    if (!name.trim()) { toast({ variant: "destructive", description: "Please name your area." }); return; }
    setSaving(true);
    try {
      if (isNew) {
        await base44.entities.GardenArea.create({ garden_id: area.garden_id, name, area_type: areaType, sun_exposure: sunExposure || undefined, active: true });
      } else {
        await base44.entities.GardenArea.update(area.id, { name, area_type: areaType, sun_exposure: sunExposure || undefined });
      }
      toast({ description: isNew ? "Garden area created." : "Garden area updated." });
      onOpenChange(false);
      onDone?.();
    } catch { toast({ variant: "destructive", description: "Could not save the area." }); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isNew ? "New garden area" : "Edit garden area"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="aname">Area name</Label>
            <Input id="aname" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Raised Bed 1" className="tap-target mt-1.5" autoFocus />
          </div>
          <div>
            <Label>Area type</Label>
            <Select value={areaType} onValueChange={setAreaType}>
              <SelectTrigger className="tap-target mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                {AREA_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Sun exposure (optional)</Label>
            <Select value={sunExposure} onValueChange={setSunExposure}>
              <SelectTrigger className="tap-target mt-1.5"><SelectValue placeholder="Not sure yet" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="full_sun">Full sun</SelectItem>
                <SelectItem value="partial_sun">Partial sun</SelectItem>
                <SelectItem value="partial_shade">Partial shade</SelectItem>
                <SelectItem value="shade">Shade</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="tap-target">Cancel</Button>
          <Button onClick={save} disabled={saving} className="tap-target">{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}