import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";

const GardenContext = createContext(null);

export function GardenProvider({ children }) {
  const [user, setUser] = useState(null);
  const [gardens, setGardens] = useState([]);
  const [activeGarden, setActiveGarden] = useState(null);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  const loadGardens = useCallback(async () => {
    try {
      const me = await base44.auth.me();
      setUser(me);
      const list = await base44.entities.Garden.list();
      const active = list.filter((g) => g.active !== false);
      setGardens(active);
      if (active.length > 0) {
        setActiveGarden(active[0]);
        setNeedsOnboarding(false);
      } else {
        setNeedsOnboarding(true);
      }
    } catch (e) {
      setNeedsOnboarding(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGardens();
  }, [loadGardens]);

  const switchGarden = useCallback((gardenId) => {
    const g = gardens.find((g) => g.id === gardenId);
    if (g) setActiveGarden(g);
  }, [gardens]);

  const refreshGardens = useCallback(async () => {
    await loadGardens();
  }, [loadGardens]);

  const value = {
    user,
    gardens,
    activeGarden,
    setActiveGarden,
    switchGarden,
    loading,
    needsOnboarding,
    setNeedsOnboarding,
    refreshGardens
  };

  return <GardenContext.Provider value={value}>{children}</GardenContext.Provider>;
}

export function useGarden() {
  const ctx = useContext(GardenContext);
  if (!ctx) throw new Error("useGarden must be used within GardenProvider");
  return ctx;
}