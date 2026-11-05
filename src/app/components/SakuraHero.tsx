/**
 * Opening copy for the Sakura homepage — sits over the wide hero camera station.
 * Off-white type for contrast on the night scene; anchored bottom-left under PreLogo.
 */
export default function SakuraHero() {
  return (
    <section
      className="relative flex min-h-[100svh] flex-col justify-end px-4 pb-10 pt-24 sm:px-6 sm:pb-14 lg:px-10"
      aria-labelledby="sakura-hero-title"
    >
      <div className="max-w-xl">
        <h1
          id="sakura-hero-title"
          className="font-ogg text-4xl font-bold leading-[1.05] tracking-tight text-[#f5f0f2] sm:text-5xl lg:text-6xl"
        >
          SERVICII{" "}
          <span className="font-light text-[#f4aabb]">DIGITALE</span>
        </h1>
        <p className="mt-4 max-w-md font-geist text-sm text-[#c9b8be] sm:text-base">
          Inovație digitală pentru branduri care vor să fie în față.
        </p>
        {/* Names both gestures so scroll parallax and sideways orbit are discoverable */}
        <p className="mt-8 font-geist text-[0.72rem] uppercase tracking-[0.12em] text-[#a8949c]">
          Scroll · trage lateral
        </p>
      </div>
    </section>
  );
}
