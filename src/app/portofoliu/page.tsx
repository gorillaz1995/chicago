"use client";

import React from "react";
import Popx from "../components/Popx";
import PreLogo from "../components/PreLogo";

// Portfolio page component displaying PreLogo and Popx components
function Page() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <PreLogo />
      <Popx />
    </div>
  );
}

export default Page;
