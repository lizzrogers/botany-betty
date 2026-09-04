import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useGarden } from "@/lib/garden-context";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Bell, CreditCard, Heart, Shield, Trash2, LogOut, User, Sparkles } from "lucide-react";

export default function Settings() {
  const navigate = useNavigate();
  const { user, activeGarden, refreshGardens } = useGarden();
  const { toast } = useToast();
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [gardenName, setGardenName] = useState(activeGarden?.name || "");
  const [city, setCity] = useState(activeGarden?.city || "");
  const [zip, setZip] = useState(activeGarden?.zip || "");
  const [region, setRegion] = useState(activeGarden?.region || "");
  const [notif, setNotif] = useState({ urgent_weather: true, action_reminders: true, weekly_plan: true, harvest_reminders: true });
  const [subscription, setSubscription] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingGarden, setSavingGarden] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const subs = await base44.entities.Subscription.list();
        setSubscription(subs[0] || null);
      } catch {}
    })();
  }, []);

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      await base44.auth.updateMe({ full_name: fullName });
      toast({ description: "Profile saved." });
    } catch { toast({ variant: "destructive", description: "Could not save profile." }); }
    finally { setSavingProfile(false); }
  };

  const saveGarden = async () => {
    setSavingGarden(true);
    try {
      await base44.entities.Garden.update(activeGarden.id, { name: gardenName, city, zip, region });
      await refreshGardens();
      toast({ description: "Garden location saved." });
    } catch { toast({ variant: "destructive", description: "Could not save garden." }); }
    finally { setSavingGarden(false); }
  };

  const signOut = async () => { await base44.auth.logout("/login"); };

  const deleteAccount = async () => {
    if (!confirm("This will permanently delete your garden data and account. This cannot be undone. Are you sure?")) return;
    try {
      if (activeGarden) {
        await base44.entities.Garden.delete(activeGarden.id);
      }
      toast({ description: "Your garden data has been deleted. Contact support to fully close your account." });
      await base44.auth.logout("/login");
    } catch { toast({ variant: "destructive", description: "Could not delete. Please contact support." }); }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-8 py-6 md:py-8">
      <h1 className="font-display text-3xl font-semibold mb-6">Settings</h1>

      {/* Profile */}
      <Section icon={User} title="Profile">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="tap-target mt-1.5" />
        </div>
        <div>
          <Label>Email</Label>
          <Input value={user?.email || ""} disabled className="tap-target mt-1.5 bg-muted" />
        </div>
        <Button onClick={saveProfile} disabled={savingProfile} className="tap-target mt-2">{savingProfile ? "Saving…" : "Save profile"}</Button>
      </Section>

      {/* Garden location */}
      <Section icon={MapPin} title="Garden Location">
        <div>
          <Label htmlFor="gname">Garden name</Label>
          <Input id="gname" value={gardenName} onChange={(e) => setGardenName(e.target.value)} className="tap-target mt-1.5" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="city">City</Label>
            <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} className="tap-target mt-1.5" />
          </div>
          <div>
            <Label htmlFor="zip">ZIP</Label>
            <Input id="zip" value={zip} onChange={(e) => setZip(e.target.value)} className="tap-target mt-1.5" />
          </div>
        </div>
        <div>
          <Label>Region</Label>
          <Input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="e.g. Bay Area" className="tap-target mt-1.5" />
        </div>
        <Button onClick={saveGarden} disabled={savingGarden} className="tap-target mt-2">{savingGarden ? "Saving…" : "Save garden"}</Button>
      </Section>

      {/* Notifications */}
      <Section icon={Bell} title="Notification Preferences">
        {[
          { key: "urgent_weather", label: "Urgent weather alerts", desc: "Heat, frost, and other garden-impacting weather" },
          { key: "action_reminders", label: "Action reminders", desc: "When a garden task becomes due" },
          { key: "weekly_plan", label: "Weekly garden plan", desc: "Your prioritized plan each week" },
          { key: "harvest_reminders", label: "Harvest & planting reminders", desc: "When crops are ready or it's time to plant" }
        ].map((n) => (
          <div key={n.key} className="flex items-center justify-between gap-3 py-1">
            <div>
              <p className="text-sm font-medium">{n.label}</p>
              <p className="text-xs text-muted-foreground">{n.desc}</p>
            </div>
            <Switch checked={notif[n.key]} onCheckedChange={(v) => setNotif((p) => ({ ...p, [n.key]: v }))} />
          </div>
        ))}
      </Section>

      {/* Subscription */}
      <Section icon={CreditCard} title="Subscription">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium capitalize">{subscription?.plan || "Free"} plan</p>
            <p className="text-xs text-muted-foreground">{subscription?.status || "Active"}</p>
          </div>
          <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> {subscription?.plan === "premium" ? "Premium" : "Free"}
          </div>
        </div>
        <Button variant="outline" className="tap-target w-full mt-3" onClick={() => toast({ description: "Premium checkout coming soon." })}>
          {subscription?.plan === "premium" ? "Manage subscription" : "Upgrade to Premium"}
        </Button>
        <p className="text-xs text-muted-foreground mt-2">Free: 1 garden, journaling, basic reminders, limited AI. Premium: full personalized weekly plan, weather-aware guidance, deeper follow-ups.</p>
      </Section>

      {/* Sponsor */}
      <Section icon={Heart} title="Sponsor">
        <p className="text-sm text-muted-foreground">Garden guidance supported by our sponsors. Sponsors never influence horticultural advice or access your personal garden data.</p>
        <p className="text-xs text-muted-foreground mt-2 italic">No active sponsor right now.</p>
      </Section>

      {/* Privacy */}
      <Section icon={Shield} title="Privacy">
        <p className="text-sm text-muted-foreground">Your garden data is private to you. Only you can see your garden, plants, photos, and journal. Sponsors never receive identifiable garden information.</p>
      </Section>

      {/* Danger zone */}
      <Section icon={LogOut} title="Account">
        <Button variant="outline" onClick={signOut} className="tap-target w-full mb-2"><LogOut className="h-4 w-4 mr-2" /> Sign out</Button>
        <Button variant="ghost" onClick={deleteAccount} className="tap-target w-full text-destructive hover:text-destructive"><Trash2 className="h-4 w-4 mr-2" /> Delete my garden data</Button>
      </Section>
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <section className="mb-6 rounded-2xl border border-border bg-surface p-5">
      <h2 className="font-display text-lg font-bold flex items-center gap-2 mb-4">
        <Icon className="h-5 w-5 text-primary" /> {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}