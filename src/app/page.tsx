import React from "react";
import SilverHeadHero from "@/components/silver-head/SilverHeadHero";
import MouthReveal from "@/components/silver-head/MouthReveal";
import MouthLamp from "@/components/silver-head/MouthLamp";
import { LAMP_NEXT_SECTION_ID } from "@/components/silver-head/lampSection";
import SakuraClose from "./components/SakuraClose";
import Section22 from "./components/Oer/Section22";

/**
 * Homepage: pinned silver-head dive, then the lamp plays as the mouth
 * exit finishes. The bento and the closing section follow in normal scroll.
 */
function Page() {
  return (
    <>
      <SilverHeadHero />

      <MouthReveal>
        <MouthLamp />
      </MouthReveal>

      <section
        id={LAMP_NEXT_SECTION_ID}
        className="relative flex min-h-[90svh] items-center px-4 py-16 sm:px-6 lg:px-10 lg:py-24"
        aria-label="Servicii și capacități"
      >
        <div className="w-full rounded-2xl bg-white/85 p-4 shadow-sm backdrop-blur-sm sm:p-6 lg:p-8">
          <Section22 />
        </div>
      </section>

      <SakuraClose />
    </>
  );
}

export default Page;
