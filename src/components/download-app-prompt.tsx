import { useEffect, useState } from "react";
import { Download, Smartphone, X } from "lucide-react";

import { Button } from "@/components/ui/button";

const DISMISS_STORAGE_KEY = "aquasmart-download-app-prompt-dismissed-at";
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

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

function getInstallInstructions() {
  const userAgent = window.navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const isAndroid = /Android/i.test(userAgent);

  if (isIOS) {
    return [
      "Open this website in Safari.",
      'Tap the Share button, then choose "Add to Home Screen".',
      'Tap "Add" to install AquaSmart on your home screen.',
    ];
  }

  if (isAndroid) {
    return [
      "Open this website in Chrome.",
      "Tap the three-dot menu in the browser.",
      'Choose "Install app" or "Add to Home screen", then follow the prompts.',
    ];
  }

  return [
    "Open this website in your browser on your phone.",
    "Open the browser menu or sharing options.",
    'Choose "Install app" or "Add to Home screen", if available.',
  ];
}

export function DownloadAppPrompt() {
  const [visible, setVisible] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);

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
    if (!installPrompt) {
      setShowInstructions(true);
      return;
    }

    try {
      await installPrompt.prompt();
      await installPrompt.userChoice;
    } catch (error) {
      console.error("AquaSmart installation prompt could not be opened", error);
      setShowInstructions(true);
    } finally {
      setInstallPrompt(null);
    }
  };

  const installInstructions = getInstallInstructions();

  return (
    <div
      role="dialog"
      aria-label="Install AquaSmart mobile app"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-2xl border bg-background/95 p-4 shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:bottom-5"
    >
      <div className="flex gap-3">
        <img
          src="/icons/Fish%20logo.png?v=2"
          alt="AquaSmart fish logo"
          className="h-12 w-12 shrink-0 rounded-xl object-contain"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold tracking-tight">Install AquaSmart</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add AquaSmart to your phone from this website for quick access to farm alerts, water
                quality updates, and feeding tools. No app store download is needed.
              </p>
            </div>
            <button
              type="button"
              onClick={dismissPrompt}
              className="-mr-1 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Dismiss AquaSmart installation prompt"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={installApp}>
              <Download className="h-4 w-4" />
              {installPrompt ? "Install app" : "How to install"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={dismissPrompt}>
              Remind me later
            </Button>
          </div>

          {showInstructions && (
            <div className="mt-3 rounded-lg bg-muted/60 p-3 text-sm">
              <p className="font-medium">Install from this website</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
                {installInstructions.map((instruction) => (
                  <li key={instruction}>{instruction}</li>
                ))}
              </ol>
              <button
                type="button"
                className="mt-2 text-sm font-medium text-primary underline underline-offset-4"
                onClick={() => setShowInstructions(false)}
              >
                Hide instructions
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
