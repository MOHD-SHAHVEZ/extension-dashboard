import React, { useEffect, useState } from "react";

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function isIosSafari() {
  const ua = window.navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua);
  const safari = /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/.test(ua);
  return ios && safari;
}

export default function InstallAppButton() {
  const [promptEvent, setPromptEvent] = useState(null);
  const [installed, setInstalled] = useState(() => isStandalone());
  const [showIosTip, setShowIosTip] = useState(false);

  useEffect(() => {
    function onPrompt(e) {
      e.preventDefault();
      setPromptEvent(e);
    }
    function onInstalled() {
      setInstalled(true);
      setPromptEvent(null);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  if (promptEvent) {
    return (
      <button
        type="button"
        onClick={async () => {
          promptEvent.prompt();
          const choice = await promptEvent.userChoice;
          if (choice.outcome === "accepted") setPromptEvent(null);
        }}
        className="h-8 px-2.5 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-semibold inline-flex items-center gap-1"
        title="Install app"
      >
        <span className="material-symbols-outlined text-[16px]">install_mobile</span>
        Install
      </button>
    );
  }

  if (!isIosSafari()) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowIosTip((v) => !v)}
        className="h-8 px-2.5 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-semibold inline-flex items-center gap-1"
      >
        <span className="material-symbols-outlined text-[16px]">install_mobile</span>
        Install
      </button>
      {showIosTip && (
        <div className="absolute right-0 top-10 z-[70] w-56 rounded-xl bg-white shadow-lg border border-slate-100 p-3 text-[12px] text-slate-600">
          Safari → Share → <b>Add to Home Screen</b>
        </div>
      )}
    </div>
  );
}
