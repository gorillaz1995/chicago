import React from "react";
import GracesThree from "./components/graces/GracesThree";

// Main page component that displays the 3D GracesThree scene
function Page() {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <GracesThree />
    </div>
  );
}

export default Page;
