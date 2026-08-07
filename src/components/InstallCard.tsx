"use client";

import { useEffect, useState } from "react";
import Icon from "./Icon";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallCard() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent));

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-hairline bg-soft px-4 py-3">
        <Icon name="check" size={18} className="text-[var(--color-good)]" />
        <p className="text-[13px] font-medium">Running as an installed app.</p>
      </div>
    );
  }

  return (
    <div className="card p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-b from-[#ff5a5f] to-[#e0134b] text-white">
          <Icon name="install" size={19} />
        </span>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold">Install on your phone</p>
          <p className="mt-0.5 text-[13px] text-ink-2">
            {isIOS
              ? "In Safari, tap Share then “Add to Home Screen”."
              : "Get a home-screen icon, full screen, and offline access to today’s schedule."}
          </p>
          {deferred && (
            <button
              type="button"
              className="btn-dark btn-sm mt-3"
              onClick={async () => {
                await deferred.prompt();
                await deferred.userChoice;
                setDeferred(null);
              }}
            >
              Install app
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
