export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className="absolute inset-0 h-full w-full scale-110 object-cover blur-[4px] brightness-50"
      >
        <source src="/delivery.mp4" type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-black/55" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-red-950/20 to-black" />

      <section className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <img
          src="/logo.png"
          alt="FASTever Logo"
          className="w-44 drop-shadow-[0_0_45px_rgba(255,0,0,0.65)] md:w-56"
        />

        <p className="mt-8 max-w-2xl text-lg font-medium text-white/90 md:text-2xl">
          Food • Grocery • Essentials Delivery
        </p>

        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.45em] text-red-400 md:text-sm">
          Starting in Konni
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:gap-5">
          <a
            href="https://play.google.com/store/apps/details?id=com.fastever.customer"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Download FASTever on Play Store"
            className="transition duration-300 hover:scale-105"
          >
            <img
              src="/playstore.png"
              alt="Get it on Google Play"
              className="h-14 w-auto drop-shadow-2xl md:h-16"
            />
          </a>

          <a
            href="https://apps.apple.com/app/fastever/id6763805908"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Download FASTever on App Store"
            className="transition duration-300 hover:scale-105"
          >
            <img
              src="/ios.png"
              alt="Download on the App Store"
              className="h-14 w-auto drop-shadow-2xl md:h-16"
            />
          </a>
        </div>

        <p className="mt-10 text-[10px] font-medium tracking-[0.35em] text-white/50 md:text-xs">
          FAST • SMART • PREMIUM DELIVERY EXPERIENCE
        </p>
      </section>
    </main>
  );
}