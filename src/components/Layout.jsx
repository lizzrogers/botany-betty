import React from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { Outlet } from "react-router-dom";
import { Sun, Trees, Plus, NotebookPen, CalendarDays, Settings, User, LogOut } from "lucide-react";
import { useGarden } from "@/lib/garden-context";
import { base44 } from "@/api/base44Client";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import BrandMark from "@/components/BrandMark";

const NAV_ITEMS = [
  { to: "/", label: "Today", icon: Sun, end: true },
  { to: "/garden", label: "My Garden", icon: Trees },
  { to: "/journal", label: "Journal", icon: NotebookPen }
];

function GardenSwitcher() {
  const { gardens, activeGarden, switchGarden } = useGarden();
  if (gardens.length <= 1) {
    return <span className="text-sm font-medium text-muted-foreground truncate">{activeGarden?.name || "My Garden"}</span>;
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="font-medium -ml-2">
          {activeGarden?.name || "My Garden"}
          <span className="ml-1 text-muted-foreground">▾</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Switch garden</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {gardens.map((g) => (
          <DropdownMenuItem key={g.id} onClick={() => switchGarden(g.id)} className={cn(g.id === activeGarden?.id && "font-semibold")}>
            {g.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ProfileMenu() {
  const { user } = useGarden();
  const navigate = useNavigate();
  const handleSignOut = async () => {
    await base44.auth.logout("/login");
  };
  const initials = (user?.full_name || user?.email || "G").charAt(0).toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full tap-target" aria-label="Account and settings">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary font-semibold text-sm">
            {initials}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-medium leading-none">{user?.full_name || "Gardener"}</p>
          <p className="text-xs leading-none text-muted-foreground mt-1">{user?.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/settings")}>
          <Settings className="mr-2 h-4 w-4" /> Settings
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DesktopRail() {
  const navigate = useNavigate();
  return (
    <aside className="hidden md:flex md:flex-col md:w-[260px] md:shrink-0 border-r border-border bg-surface">
      <div className="px-6 py-6">
        <BrandMark />
      </div>
      <nav className="flex-1 px-4 space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors tap-target",
                isActive ? "bg-primary/10 text-primary" : "text-foreground/70 hover:bg-muted hover:text-foreground"
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
        <NavLink
          to="/this-week"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors tap-target",
              isActive ? "bg-primary/10 text-primary" : "text-foreground/70 hover:bg-muted hover:text-foreground"
            )
          }
        >
          <CalendarDays className="h-5 w-5" />
          This Week
        </NavLink>
      </nav>
      <div className="p-4 border-t border-border">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors tap-target",
              isActive ? "bg-primary/10 text-primary" : "text-foreground/70 hover:bg-muted hover:text-foreground"
            )
          }
        >
          <Settings className="h-5 w-5" />
          Settings
        </NavLink>
      </div>
    </aside>
  );
}

function MobileHeader() {
  return (
    <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-background/90 backdrop-blur-md border-b border-border safe-bottom">
      <BrandMark showWordmark={false} />
      <div className="flex items-center gap-2 flex-1 justify-center">
        <GardenSwitcher />
      </div>
      <ProfileMenu />
    </header>
  );
}

function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (to, end) => {
    if (end) return location.pathname === to;
    return location.pathname.startsWith(to);
  };
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-surface/95 backdrop-blur-md border-t border-border safe-bottom">
      <div className="grid grid-cols-5 items-center px-2 pt-1.5 pb-1">
        {NAV_ITEMS.slice(0, 2).map((item) => (
          <NavTab key={item.to} item={item} active={isActive(item.to, item.end)} />
        ))}
        <button
          onClick={() => navigate("/add-update")}
          className="flex flex-col items-center justify-center -mt-5"
          aria-label="Add Update"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg shadow-accent/30 ring-4 ring-background">
            <Plus className="h-7 w-7" />
          </span>
        </button>
        <NavTab item={NAV_ITEMS[2]} active={isActive("/journal")} />
        <NavLink to="/settings" className="flex flex-col items-center gap-0.5 py-1.5 tap-target">
          {({ isActive }) => (
            <>
              <Settings className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted-foreground")} />
              <span className={cn("text-[10px] font-medium", isActive ? "text-primary" : "text-muted-foreground")}>Settings</span>
            </>
          )}
        </NavLink>
      </div>
    </nav>
  );
}

function NavTab({ item, active }) {
  return (
    <NavLink to={item.to} end={item.end} className="flex flex-col items-center gap-0.5 py-1.5 tap-target">
      {({ isActive: navActive }) => (
        <>
          <item.icon className={cn("h-5 w-5", active || navActive ? "text-primary" : "text-muted-foreground")} />
          <span className={cn("text-[10px] font-medium", active || navActive ? "text-primary" : "text-muted-foreground")}>
            {item.label}
          </span>
        </>
      )}
    </NavLink>
  );
}

export default function Layout() {
  return (
    <div className="min-h-screen bg-background flex">
      <DesktopRail />
      <div className="flex-1 flex flex-col min-w-0">
        <MobileHeader />
        <main className="flex-1 pb-24 md:pb-0">
          <Outlet />
        </main>
        <MobileBottomNav />
      </div>
    </div>
  );
}