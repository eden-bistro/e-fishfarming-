import { useEffect, useState } from "react";
import { Download, Smartphone, X } from "lucide-react";

import { Button } from "@/components/ui/button";

const DISMISS_STORAGE_KEY = "aquasmart-download-app-prompt-dismissed-at";
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const mobileAppUrl = import.meta.env.VITE_MOBILE_APP_URL?.trim();

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandaloneApp() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator && Boolean(window.navigator.standalone))
  );
}

function isMobileViewport() {
  return window.matchMedia("(max-width: 1024px)").matches;
}

function wasRecentlyDismissed() {
  const dismissedAt = Number(window.localStorage.getItem(DISMISS_STORAGE_KEY));
  return Number.isFinite(dismissedAt) && Date.now() - dismissedAt < DISMISS_DURATION_MS;
}

export function DownloadAppPrompt() {
  const [visible, setVisible] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const beforeInstallPromptHandler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", beforeInstallPromptHandler);

    if (isMobileViewport() && !isStandaloneApp() && !wasRecentlyDismissed()) {
      const timer = window.setTimeout(() => setVisible(true), 1200);
      return () => {
        window.clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", beforeInstallPromptHandler);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", beforeInstallPromptHandler);
    };
  }, []);

  if (!visible) return null;

  const dismissPrompt = () => {
    window.localStorage.setItem(DISMISS_STORAGE_KEY, String(Date.now()));
    setVisible(false);
  };

  const installApp = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      await installPrompt.userChoice.catch(() => undefined);
      setInstallPrompt(null);
      dismissPrompt();
      return;
    }

    if (mobileAppUrl) {
      window.location.assign(mobileAppUrl);
    }
  };

  const canDownload = Boolean(installPrompt || mobileAppUrl);

  return (
    <div
      role="dialog"
      aria-label="Download AquaSmart mobile app"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-2xl border bg-background/95 p-4 shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:bottom-5"
    >
      <div className="flex gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Smartphone className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold tracking-tight">Download the AquaSmart mobile app</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Get faster access to farm alerts, water quality updates, and feeding tools from your
                phone.
              </p>
            </div>
            <button
              type="button"
              onClick={dismissPrompt}
              className="-mr-1 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Dismiss mobile app download prompt"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={installApp} disabled={!canDownload}>
              <Download className="h-4 w-4" />
              {installPrompt ? "Install app" : "Download app"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={dismissPrompt}>
              Remind me later
            </Button>
          </div>
          {!canDownload && (
            <p className="mt-2 text-xs text-muted-foreground">
              App store links are coming soon. Set VITE_MOBILE_APP_URL when the mobile app is ready.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
