import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Globe, Moon, Sun, Bell, Shield, ChevronRight, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useLocation } from "wouter";

const LANGUAGES = [
  { code: "en", name: "English", native: "English" },
  { code: "zh", name: "Chinese (Simplified)", native: "\u7B80\u4F53\u4E2D\u6587" },
  { code: "zh-TW", name: "Chinese (Traditional)", native: "\u7E41\u9AD4\u4E2D\u6587" },
  { code: "ja", name: "Japanese", native: "\u65E5\u672C\u8A9E" },
  { code: "ko", name: "Korean", native: "\uD55C\uAD6D\uC5B4" },
  { code: "es", name: "Spanish", native: "Espa\u00F1ol" },
  { code: "fr", name: "French", native: "Fran\u00E7ais" },
  { code: "de", name: "German", native: "Deutsch" },
  { code: "ru", name: "Russian", native: "\u0420\u0443\u0441\u0441\u043A\u0438\u0439" },
  { code: "ar", name: "Arabic", native: "\u0627\u0644\u0639\u0631\u0628\u064A\u0629" },
  { code: "pt", name: "Portuguese", native: "Portugu\u00EAs" },
  { code: "vi", name: "Vietnamese", native: "Ti\u1EBFng Vi\u1EC7t" },
];

export default function ProfileSettingsPage() {
  const [, navigate] = useLocation();
  const [langDialogOpen, setLangDialogOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState("en");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("axomx-lang");
    if (saved) setCurrentLang(saved);
    const notifSaved = localStorage.getItem("axomx-notifications");
    if (notifSaved !== null) setNotificationsEnabled(notifSaved === "true");
  }, []);

  const selectLanguage = (code: string) => {
    setCurrentLang(code);
    localStorage.setItem("axomx-lang", code);
    setLangDialogOpen(false);
  };

  const toggleNotifications = () => {
    const next = !notificationsEnabled;
    setNotificationsEnabled(next);
    localStorage.setItem("axomx-notifications", String(next));
  };

  const currentLangObj = LANGUAGES.find((l) => l.code === currentLang) || LANGUAGES[0];

  return (
    <div className="space-y-4 pb-20" data-testid="page-profile-settings">
      <div className="gradient-green-dark p-4 pt-2 rounded-b-2xl" style={{ animation: "fadeSlideIn 0.4s ease-out" }}>
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <Button size="icon" variant="ghost" onClick={() => navigate("/profile")} data-testid="button-back-profile">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-bold">Settings</h1>
        </div>
      </div>

      <div className="px-4 space-y-3" style={{ animation: "fadeSlideIn 0.5s ease-out 0.1s both" }}>
        <h3 className="text-sm font-bold">General</h3>

        <Card className="border-border bg-card">
          <CardContent className="p-0">
            <button
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover-elevate border-b border-border/50"
              onClick={() => setLangDialogOpen(true)}
              data-testid="button-language"
            >
              <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <Globe className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">Language</div>
                <div className="text-[10px] text-muted-foreground">Interface language setting</div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-xs text-muted-foreground">{currentLangObj.native}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </button>

            <button
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover-elevate"
              onClick={toggleNotifications}
              data-testid="button-toggle-notifications"
            >
              <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <Bell className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">Push Notifications</div>
                <div className="text-[10px] text-muted-foreground">Receive alerts and updates</div>
              </div>
              <div
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  notificationsEnabled ? "bg-primary" : "bg-muted"
                }`}
              >
                <div
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                    notificationsEnabled ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </div>
            </button>
          </CardContent>
        </Card>

        <h3 className="text-sm font-bold pt-2">Security</h3>

        <Card className="border-border bg-card">
          <CardContent className="p-0">
            <button
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover-elevate"
              data-testid="button-security"
            >
              <div className="h-8 w-8 rounded-md bg-amber-500/10 flex items-center justify-center shrink-0">
                <Shield className="h-4 w-4 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">Security Center</div>
                <div className="text-[10px] text-muted-foreground">2FA, password & device management</div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          </CardContent>
        </Card>

        <div className="pt-4 text-center">
          <span className="text-[10px] text-muted-foreground">AxomX v1.0.0</span>
        </div>
      </div>

      <Dialog open={langDialogOpen} onOpenChange={setLangDialogOpen}>
        <DialogContent className="bg-card border-border max-w-sm max-h-[70vh]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Select Language</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Choose your preferred interface language
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1 overflow-y-auto max-h-[50vh] py-2">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-md text-left hover-elevate ${
                  currentLang === lang.code ? "bg-primary/10" : ""
                }`}
                onClick={() => selectLanguage(lang.code)}
                data-testid={`lang-${lang.code}`}
              >
                <div>
                  <div className="text-sm font-medium">{lang.native}</div>
                  <div className="text-[10px] text-muted-foreground">{lang.name}</div>
                </div>
                {currentLang === lang.code && (
                  <Check className="h-4 w-4 text-primary shrink-0" />
                )}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
