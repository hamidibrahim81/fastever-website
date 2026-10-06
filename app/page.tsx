"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function Home() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
    });

    return () => unsubscribe();
  }, []);

  const handleHubClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (isLoggedIn) {
      router.push("/hub");
    } else {
      router.push("/login");
    }
  };

  return (
    <main className="relative flex h-screen w-full flex-col items-center justify-between overflow-hidden bg-black px-4 py-8 text-white sm:p-0">
      {/* SINGLE BACKGROUND VIDEO FOR ALL SCREENS */}
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className="absolute inset-0 h-full w-full object-cover blur-[2px] brightness-75"
      >
        <source src="/delivery.mp4" type="video/mp4" />
      </video>

      {/* TINT OVERLAY */}
      <div className="pointer-events-none absolute inset-0 z-10 bg-black/25" />

      {/* TOP-RIGHT: 3-LINE (HAMBURGER) MENU BUTTON */}
      <div className="absolute right-6 top-6 z-40 sm:right-10 sm:top-8">
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
          className="flex h-12 w-12 flex-col items-center justify-center gap-1.5 rounded-2xl border border-white/20 bg-black/50 backdrop-blur-md transition-all duration-300 hover:border-[#FFC700] hover:bg-black/80 active:scale-95"
        >
          <span
            className={`h-0.5 w-6 rounded-full bg-white transition-all duration-300 ${
              menuOpen ? "translate-y-2 rotate-45 bg-[#FFC700]" : ""
            }`}
          />
          <span
            className={`h-0.5 w-6 rounded-full bg-white transition-all duration-300 ${
              menuOpen ? "opacity-0" : ""
            }`}
          />
          <span
            className={`h-0.5 w-6 rounded-full bg-white transition-all duration-300 ${
              menuOpen ? "-translate-y-2 -rotate-45 bg-[#FFC700]" : ""
            }`}
          />
        </button>

        {/* DROPDOWN MENU */}
        {menuOpen && (
          <div className="absolute right-0 mt-3 w-56 overflow-hidden rounded-2xl border border-white/10 bg-black/90 p-2 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                router.push("/downloads");
              }}
              className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition hover:bg-[#FFC700] hover:text-black group"
            >
              <div>
                <span className="block text-[9px] font-bold uppercase tracking-widest text-[#FFC700] transition-colors group-hover:text-black">
                  Internal
                </span>
                <span className="text-sm font-black uppercase tracking-wider">
                  Partner Apps
                </span>
              </div>
              <span className="text-base font-bold transition-transform group-hover:translate-x-1">
                →
              </span>
            </button>
          </div>
        )}
      </div>

      {/* TOP / CENTER CONTENT WRAPPER */}
      <div className="relative z-30 flex h-full w-full max-w-md flex-col items-center justify-center gap-8 sm:block">
        {/* TOP: EXTRA LARGE HUB BUTTON */}
        <div className="sm:absolute sm:left-1/2 sm:top-8 sm:-translate-x-1/2">
          <a
            href="/hub"
            onClick={handleHubClick}
            className="group flex items-center gap-4 rounded-2xl border-2 border-white/30 bg-black/60 px-10 py-4 shadow-2xl backdrop-blur-md transition-all duration-300 hover:scale-105 hover:border-[#FFC700] hover:bg-[#FFC700]/20 sm:gap-6 sm:rounded-3xl sm:border-[3px] sm:px-16 sm:py-6"
          >
            <span className="text-3xl font-black tracking-[0.25em] text-white transition-colors duration-300 group-hover:text-[#FFC700] sm:text-5xl md:text-6xl">
              HUB
            </span>
            <span className="text-3xl text-white transition-all duration-300 group-hover:translate-x-2 group-hover:text-[#FFC700] sm:text-5xl md:text-6xl">
              →
            </span>
          </a>
        </div>

        {/* CENTER: APP STORE & PLAY STORE BUTTONS ONLY */}
        <div className="flex flex-col items-center gap-4 sm:absolute sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:flex-row sm:gap-6">
          {/* APP STORE */}
          <a
            href="https://apps.apple.com/app/fastever/id6763805908"
            target="_blank"
            rel="noopener noreferrer"
            className="transition duration-300 hover:scale-105 hover:brightness-110 active:scale-95"
          >
            <img
              src="/ios.png"
              alt="Download FASTever on the App Store"
              className="h-12 w-auto drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)] sm:h-14 md:h-16"
            />
          </a>

          {/* GOOGLE PLAY */}
          <a
            href="https://play.google.com/store/apps/details?id=com.fastever.customer"
            target="_blank"
            rel="noopener noreferrer"
            className="transition duration-300 hover:scale-105 hover:brightness-110 active:scale-95"
          >
            <img
              src="/playstore.png"
              alt="Get FASTever on Google Play"
              className="h-12 w-auto drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)] sm:h-14 md:h-16"
            />
          </a>
        </div>
      </div>

      {/* BOTTOM RIGHT: CHAT SUPPORT BUTTON */}
      <div className="absolute bottom-6 right-6 z-30 sm:bottom-8 sm:right-14">
        <button
          type="button"
          onClick={() => {
            window.open("https://wa.me/", "_blank");
          }}
          className="flex h-16 w-16 flex-col items-center justify-center rounded-full bg-[#FFC700] text-black shadow-[0_0_25px_rgba(255,199,0,0.6)] transition-all duration-300 hover:scale-105 hover:bg-black hover:text-[#FFC700] active:scale-95 sm:h-20 sm:w-20 md:h-24 md:w-24"
        >
          <span className="text-[10px] font-black uppercase tracking-wider sm:text-xs">
            CHAT
          </span>
          <span className="text-[8px] font-bold uppercase tracking-wider opacity-80 sm:text-[9px]">
            SUPPORT
          </span>
        </button>
      </div>
    </main>
  );
}