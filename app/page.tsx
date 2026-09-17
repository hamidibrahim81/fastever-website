"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function Home() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
    });

    return () => unsubscribe();
  }, []);

  const handleHubClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isLoggedIn) {
      router.push("/hub");
    } else {
      router.push("/login");
    }
  };

  return (
    <main className="relative h-screen w-full overflow-hidden bg-black text-white">
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

      {/* TOP CENTER: EXTRA LARGE HUB BUTTON */}
      <div className="absolute top-6 left-1/2 z-30 -translate-x-1/2 sm:top-8">
        <a
          href="/hub"
          onClick={handleHubClick}
          className="group flex items-center gap-4 rounded-2xl border-2 border-white/30 bg-black/60 px-10 py-4 backdrop-blur-md transition-all duration-300 hover:scale-105 hover:border-[#FFC700] hover:bg-[#FFC700]/20 sm:gap-6 sm:rounded-3xl sm:border-[3px] sm:px-16 sm:py-6"
        >
          <span className="text-3xl font-black tracking-[0.25em] text-white transition-colors duration-300 group-hover:text-[#FFC700] sm:text-5xl md:text-6xl">
            HUB
          </span>
          <span className="text-3xl text-white transition-all duration-300 group-hover:translate-x-2 group-hover:text-[#FFC700] sm:text-5xl md:text-6xl">
            →
          </span>
        </a>
      </div>

      {/* CENTER: APP STORE & PLAY STORE BUTTONS */}
      <div className="absolute top-1/2 left-1/2 z-30 flex -translate-x-1/2 -translate-y-1/2 items-center gap-3 sm:gap-6">
        {/* APP STORE */}
        <a
          href="https://apps.apple.com/app/fastever/id6763805908"
          target="_blank"
          rel="noopener noreferrer"
          className="transition duration-300 hover:scale-105 hover:brightness-110 active:scale-95"
        >
          <img
            src="/ios.png"
            alt="Download on the App Store"
            className="h-10 w-auto drop-shadow-[0_4px_16px_rgba(0,0,0,0.7)] sm:h-14 md:h-16"
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
            alt="Get it on Google Play"
            className="h-10 w-auto drop-shadow-[0_4px_16px_rgba(0,0,0,0.7)] sm:h-14 md:h-16"
          />
        </a>
      </div>

      {/* BOTTOM RIGHT: CHAT SUPPORT BUTTON */}
      <div className="absolute bottom-4 right-6 z-30 sm:bottom-4 sm:right-14">
        <button
          type="button"
          onClick={() => {
            window.open("https://wa.me/", "_blank");
          }}
          className="flex h-16 w-16 flex-col items-center justify-center rounded-full bg-[#FFC700] text-black shadow-[0_0_20px_rgba(255,199,0,0.5)] transition-all duration-300 hover:scale-105 hover:bg-black hover:text-[#FFC700] active:scale-95 sm:h-20 sm:w-20 md:h-24 md:w-24"
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