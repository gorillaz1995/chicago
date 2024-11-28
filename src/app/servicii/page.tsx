import React from "react";
import { LampDemo } from "../components/ui/lamp";

function page() {
  return (
    <div>
      <LampDemo />
      {/* Section with lorem ipsum text on dark background */}
      <div className="w-full min-h-screen bg-[rgba(15,15,25,1)] text-[#e0e0ff] p-8 md:p-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-light mb-8 bg-gradient-to-br from-[#e0e0ff] to-[#b4c6ff] bg-clip-text text-transparent">
            Lorem Ipsum
          </h2>
          <p className="text-lg md:text-xl leading-relaxed text-[#b4c6ff] mb-6">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
            ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
            aliquip ex ea commodo consequat.
          </p>
          <p className="text-lg md:text-xl leading-relaxed text-[#b4c6ff]">
            Duis aute irure dolor in reprehenderit in voluptate velit esse
            cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat
            cupidatat non proident, sunt in culpa qui officia deserunt mollit
            anim id est laborum.
          </p>
        </div>
      </div>
    </div>
  );
}

export default page;
