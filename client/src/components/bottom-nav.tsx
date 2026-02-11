import { useLocation, Link } from "wouter";
import { Home, BarChart3, Vault, Brain, User } from "lucide-react";
import { Button } from "@/components/ui/button";

const tabs = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/trade", icon: BarChart3, label: "Trade" },
  { path: "/vault", icon: Vault, label: "Vault" },
  { path: "/strategy", icon: Brain, label: "Strategy" },
  { path: "/profile", icon: User, label: "Profile" },
];

export function BottomNav() {
  const [location] = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/95 backdrop-blur-md"
      data-testid="bottom-nav"
    >
      <div className="mx-auto flex max-w-lg items-center justify-around gap-1 px-2 py-1">
        {tabs.map((tab) => {
          const isActive =
            tab.path === "/"
              ? location === "/"
              : location.startsWith(tab.path);
          return (
            <Link key={tab.path} href={tab.path}>
              <Button
                variant="ghost"
                size="sm"
                className={`flex flex-col items-center gap-0.5 px-3 py-2 ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
                data-testid={`nav-${tab.label.toLowerCase()}`}
              >
                <tab.icon className={`h-5 w-5 ${isActive ? "drop-shadow-[0_0_6px_hsl(142,72%,45%,0.5)]" : ""}`} />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </Button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
