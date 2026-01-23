import React from "react";
import NewH from "./components/NewH";

import Section22 from "./components/Oer/Section22";
import Section23 from "./components/Oer/Section23";

// Main page component that displays the SVG path morphing animation
function Page() {
  return (
    <div className="overflow-hidden">
      <NewH />

      <Section22 />
      <Section23 />
    </div>
  );
}

export default Page;
