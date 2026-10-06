"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// Read credentials from .env.local with safe defaults
const VALID_USERNAME = process.env.NEXT_PUBLIC_PARTNER_USER || "fastever";
const VALID_PASSWORD = process.env.NEXT_PUBLIC_PARTNER_PASS || "fastever1234";

interface PartnerApp {
  id: string;
  name: string;
  category: string;
  emoji: string;
  description: string;
  fileName: string;
  fileSize: string;
  features: string[];
}

const APPS_LIST: PartnerApp[] = [
  {
    id: "delivery",
    name: "FASTever Delivery Partner",
    category: "Delivery Application",
    emoji: "🛵",
    description: "Official application for delivery fleet riders to receive trip alerts, track navigation routes, and complete drop-offs.",
    fileName: "fastever-delivery-partner.apk",
    fileSize: "62.0 MB",
    features: ["Real-time trip order dispatch", "Live pickup & drop navigation", "Delivery completion verification"],
  },
  {
    id: "morning",
    name: "FASTever Morning",
    category: "Morning Route & Essentials",
    emoji: "🌅",
    description: "Specialized early morning fulfillment application for milk, dairy, and scheduled daily household subscriptions.",
    fileName: "fastever-morning.apk",
    fileSize: "54.5 MB",
    features: ["Early morning delivery runs", "Daily subscription scheduling", "Route-by-route order checklists"],
  },
  {
    id: "restaurant",
    name: "FASTever Restaurant",
    category: "Kitchen & Dining Partner",
    emoji: "🍳",
    description: "Complete restaurant dashboard to accept kitchen tickets, monitor order prep times, and toggle menu availability.",
    fileName: "fastever-restaurant.apk",
    fileSize: "59.2 MB",
    features: ["Instant kitchen sound alerts", "Real-time prep time management", "Live stock out-of-stock switch"],
  },
  {
    id: "vendor",
    name: "FASTever Vendor",
    category: "Merchant & Store Partner",
    emoji: "🏪",
    description: "Store partner application to manage grocery and product inventory, confirm pickups, and review payouts.",
    fileName: "fastever-vendor.apk",
    fileSize: "60.4 MB",
    features: ["Store catalog & stock control", "Direct dispatch scheduling", "Daily sales & order summaries"],
  },
];

export default function DownloadsPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isCheckingSession, setIsCheckingSession] = useState<boolean>(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const sessionAuth = sessionStorage.getItem("fastever_partner_authed");
    if (sessionAuth === "true") {
      setIsAuthenticated(true);
    }
    setIsCheckingSession(false);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() === VALID_USERNAME && password === VALID_PASSWORD) {
      sessionStorage.setItem("fastever_partner_authed", "true");
      setIsAuthenticated(true);
      setErrorMsg("");
    } else {
      setErrorMsg("Invalid username or password. Please contact FASTever admin.");
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("fastever_partner_authed");
    setIsAuthenticated(false);
    setUsername("");
    setPassword("");
  };

  if (isCheckingSession) {
    return <main className="min-h-screen bg-[#080808]" />;
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080808] text-white">
      {/* BACKGROUND GLOW */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-250px] h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-[#FFC700]/10 blur-[120px]" />
        <div className="absolute bottom-[-250px] right-[-100px] h-[500px] w-[500px] rounded-full bg-[#FFC700]/5 blur-[120px]" />
      </div>

      {/* HEADER */}
      <header className="relative z-20 flex w-full items-center justify-between px-5 py-6 sm:px-10 lg:px-16">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold backdrop-blur-md transition hover:border-[#FFC700]/50 hover:text-[#FFC700]"
        >
          <span>←</span>
          <span>Back</span>
        </button>

        <div className="flex items-center gap-4">
          {isAuthenticated && (
            <button
              type="button"
              onClick={handleLogout}
              className="text-xs uppercase tracking-wider text-white/50 transition hover:text-white"
            >
              Lock Portal
            </button>
          )}
          <div className="text-right">
            <h2 className="text-xl font-black tracking-tight">
              FAST<span className="text-[#FFC700]">ever</span>
            </h2>
            <p className="text-[8px] uppercase tracking-[0.3em] text-white/40">
              Partner Portal
            </p>
          </div>
        </div>
      </header>

      {/* LOCK / LOGIN SCREEN */}
      {!isAuthenticated ? (
        <section className="relative z-10 mx-auto flex min-h-[calc(100vh-120px)] max-w-md flex-col items-center justify-center px-5 pb-16">
          <div className="w-full rounded-[28px] border border-white/10 bg-white/[0.04] p-8 shadow-2xl backdrop-blur-2xl">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFC700] text-2xl text-black shadow-[0_0_30px_rgba(255,199,0,0.3)]">
                🔒
              </div>
              <h1 className="text-2xl font-black">Authorized Access Only</h1>
              <p className="mt-2 text-xs text-white/50">
                Enter your partner credentials to access direct APK downloads.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-white/60">
                  Partner ID / Username
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter partner ID"
                  className="w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white placeholder-white/20 outline-none transition focus:border-[#FFC700]"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-white/60">
                  Access Key / Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white placeholder-white/20 outline-none transition focus:border-[#FFC700]"
                />
              </div>

              {errorMsg && (
                <p className="text-center text-xs font-medium text-red-400">
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                className="w-full rounded-xl bg-[#FFC700] py-3.5 text-sm font-black uppercase tracking-wider text-black transition-all hover:bg-white active:scale-[0.98]"
              >
                Unlock Downloads
              </button>
            </form>
          </div>
        </section>
      ) : (
        /* 4 PARTNER APPS GRID */
        <section className="relative z-10 mx-auto flex min-h-[calc(100vh-100px)] max-w-6xl flex-col items-center px-5 pb-16 pt-4 sm:px-8">
          <div className="mb-12 max-w-2xl text-center">
            <span className="mb-4 inline-flex rounded-full border border-[#FFC700]/30 bg-[#FFC700]/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-[#FFC700]">
              Verified Partner Access
            </span>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
              FASTever Partner Suite
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-sm leading-6 text-white/50 sm:text-base">
              Download the official Android applications for delivery riders, morning subscriptions, restaurant kitchens, and retail vendors.
            </p>
          </div>

          <div className="grid w-full max-w-5xl grid-cols-1 gap-6 md:grid-cols-2">
            {APPS_LIST.map((app) => (
              <div
                key={app.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] p-7 backdrop-blur-xl transition-all duration-300 hover:border-[#FFC700]/40 hover:bg-white/[0.06] sm:p-8"
              >
                <div>
                  <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FFC700] text-3xl shadow-[0_10px_30px_rgba(255,199,0,0.2)]">
                    {app.emoji}
                  </div>
                  <p className="mb-1 text-[10px] font-black uppercase tracking-[0.25em] text-[#FFC700]">
                    {app.category}
                  </p>
                  <h2 className="text-2xl font-black">{app.name}</h2>
                  <p className="mt-3 text-sm leading-6 text-white/50">
                    {app.description}
                  </p>

                  <div className="my-6 space-y-2.5">
                    {app.features.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2.5 text-xs text-white/70">
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#FFC700]/20 text-[9px] font-black text-[#FFC700]">
                          ✓
                        </span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <a
                    href={`/downloads/${app.fileName}`}
                    download={app.fileName}
                    className="flex w-full items-center justify-between rounded-2xl bg-[#FFC700] px-6 py-4 font-black text-black transition-all duration-300 hover:scale-[1.01] hover:bg-white active:scale-[0.98]"
                  >
                    <div className="text-left">
                      <span className="block text-[9px] uppercase tracking-[0.2em] opacity-70">
                        Android APK • {app.fileSize}
                      </span>
                      <span className="text-sm">Download {app.name}</span>
                    </div>
                    <span className="text-2xl">↓</span>
                  </a>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-12 text-xs font-bold uppercase tracking-[0.3em] text-white/20">
            FASTever.in • Internal Distribution Only
          </p>
        </section>
      )}
    </main>
  );
}