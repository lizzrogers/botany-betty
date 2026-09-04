import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sprout, MapPin, Trees, Leaf, ArrowRight, Check } from "lucide-react";
import BrandMark from "@/components/BrandMark";
import { useGarden } from "@/lib/garden-context";

const CA_REGIONS = ["Bay Area", "Central Coast", "Central Valley", "SoCal Coast", "SoCal Inland", "Desert", "Sierra Foothills", "North Coast"];

export default function Onboarding() {
  const navigate = useNavigate();
  const { refreshGardens } = useGarden();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [gardenName, setGardenName] = useState("");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const [region, setRegion] = useState("");
  const [areaName, setAreaName] = useState("");
  const [areaType, setAreaType] = useState("raised_bed");
  const [plantName, setPlantName] = useState("");
  const [plantType, setPlantType] = useState("");

  const finish = async (skipPlant = false) => {
    setSaving(true);
    setError("");
    try {
      const garden = await base44.entities.Garden.create({
        name: gardenName || "My Garden",
        city,
        zip,
        region,
        active: true
      });
      const area = await base44.entities.GardenArea.create({
        garden_id: garden.id,
        name: areaName || "Main Bed",
        area_type: areaType,
        active: true
      });
      if (!skipPlant && plantType) {
        await base44.entities.Plant.create({
          garden_id: garden.id,
          garden_area_id: area.id,
          display_name: plantName || `${plantType} #1`,
          plant_type: plantType,
          identification_method: "manual",
          current_status: "healthy",
          active: true
        });
      }
      await refreshGardens();
      navigate("/");
    } catch (e) {
      setError(e.message || "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-6 py-6">
        <BrandMark />
      </header>
      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-md">
          {step === 0 && (
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <Sprout className="h-10 w-10 text-primary" />
              </div>
              <h1 className="font-display text-3xl font-semibold leading-tight">Welcome to Botany Betty</h1>
              <p className="mt-3 text-muted-foreground text-lg leading-relaxed">
                Your personalized California garden coach. We'll help you know what needs attention today, what to do next, and how your garden is doing over time.
              </p>
              <p className="mt-4 text-sm text-muted-foreground">Let's set up your garden — it only takes a minute.</p>
              <Button onClick={() => setStep(1)} size="lg" className="tap-target w-full mt-8 text-base">
                Get started <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          )}

          {step === 1 && (
            <div>
              <StepHeader icon={MapPin} title="Where is your garden?" subtitle="We use your location for weather-aware guidance." />
              <div className="space-y-4 mt-6">
                <div>
                  <Label htmlFor="city">California city</Label>
                  <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Sacramento" className="tap-target mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="zip">ZIP code</Label>
                  <Input id="zip" value={zip} onChange={(e) => setZip(e.target.value)} placeholder="e.g. 95814" className="tap-target mt-1.5" />
                </div>
                <div>
                  <Label>Region (optional)</Label>
                  <Select value={region} onValueChange={setRegion}>
                    <SelectTrigger className="tap-target mt-1.5"><SelectValue placeholder="Pick a region" /></SelectTrigger>
                    <SelectContent>
                      {CA_REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <StepNav onBack={() => setStep(0)} onNext={() => setStep(2)} disabled={!city && !zip} saving={saving} />
            </div>
          )}

          {step === 2 && (
            <div>
              <StepHeader icon={Trees} title="Name your garden" subtitle="Give your garden a name you'll recognize." />
              <div className="mt-6">
                <Label htmlFor="gname">Garden name</Label>
                <Input id="gname" value={gardenName} onChange={(e) => setGardenName(e.target.value)} placeholder="e.g. Backyard Garden" className="tap-target mt-1.5" autoFocus />
              </div>
              <StepNav onBack={() => setStep(1)} onNext={() => setStep(3)} disabled={!gardenName} saving={saving} />
            </div>
          )}

          {step === 3 && (
            <div>
              <StepHeader icon={Trees} title="Create your first garden area" subtitle="Where are your plants growing? A raised bed, container, or patch of yard." />
              <div className="space-y-4 mt-6">
                <div>
                  <Label htmlFor="aname">Area name</Label>
                  <Input id="aname" value={areaName} onChange={(e) => setAreaName(e.target.value)} placeholder="e.g. Raised Bed 1" className="tap-target mt-1.5" autoFocus />
                </div>
                <div>
                  <Label>Area type</Label>
                  <Select value={areaType} onValueChange={setAreaType}>
                    <SelectTrigger className="tap-target mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="raised_bed">Raised bed</SelectItem>
                      <SelectItem value="in_ground">In-ground</SelectItem>
                      <SelectItem value="container">Container</SelectItem>
                      <SelectItem value="patio">Patio</SelectItem>
                      <SelectItem value="greenhouse">Greenhouse</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <StepNav onBack={() => setStep(2)} onNext={() => setStep(4)} disabled={!areaName} saving={saving} />
            </div>
          )}

          {step === 4 && (
            <div>
              <StepHeader icon={Leaf} title="Add your first plant" subtitle="Tell us about one plant you're already growing. You can add more anytime." />
              <div className="space-y-4 mt-6">
                <div>
                  <Label htmlFor="ptype">Plant type</Label>
                  <Input id="ptype" value={plantType} onChange={(e) => setPlantType(e.target.value)} placeholder="e.g. Tomato, Basil, Pepper" className="tap-target mt-1.5" autoFocus />
                </div>
                <div>
                  <Label htmlFor="pname">Display name (optional)</Label>
                  <Input id="pname" value={plantName} onChange={(e) => setPlantName(e.target.value)} placeholder="e.g. Tomato #1" className="tap-target mt-1.5" />
                </div>
              </div>
              {error && <p className="text-sm text-destructive mt-3">{error}</p>}
              <div className="mt-6 space-y-2">
                <Button onClick={() => finish(false)} disabled={saving || !plantType} size="lg" className="tap-target w-full text-base">
                  {saving ? "Saving…" : <>Finish setup <Check className="h-5 w-5 ml-2" /></>}
                </Button>
                <Button onClick={() => finish(true)} disabled={saving} variant="ghost" className="tap-target w-full text-muted-foreground">
                  Skip for now
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StepHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <div>
        <h2 className="font-display text-2xl font-semibold leading-tight">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      </div>
    </div>
  );
}

function StepNav({ onBack, onNext, disabled, saving }) {
  return (
    <div className="mt-8 flex items-center gap-3">
      <Button onClick={onBack} variant="ghost" className="tap-target text-muted-foreground">Back</Button>
      <Button onClick={onNext} disabled={disabled || saving} size="lg" className="tap-target flex-1 text-base">
        Continue <ArrowRight className="h-5 w-5 ml-2" />
      </Button>
    </div>
  );
}