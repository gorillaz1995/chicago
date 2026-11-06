import React from "react";
import SilverHeadHero from "@/components/silver-head/SilverHeadHero";
import MouthReveal from "@/components/silver-head/MouthReveal";
import MouthLamp from "@/components/silver-head/MouthLamp";
import { LAMP_NEXT_SECTION_ID } from "@/components/silver-head/lampSection";

/**
 * Homepage: pinned silver-head dive, then the lamp plays as the mouth
 * exit finishes. Later homepage sections can attach below without a blank
 * forced viewport after the sequence.
 */
function Page() {
  return (
    <>
      <SilverHeadHero secondaryHref="/contact" />

      <MouthReveal>
        <MouthLamp />
      </MouthReveal>

      <section
        id={LAMP_NEXT_SECTION_ID}
        className="relative"
        aria-hidden="true"
      />
    </>
  );
}

export default Page;
