"use client";

import React from "react";
import { FlipWords } from "./FlipWords";

const LoadingSec = () => {
  // Array of greetings in different languages
  const greetings = [
    "SALUT",
    "HELLO",
    "HOLA",
    "CIAO",
    "BONJOUR",
    "HALLO",
    "ПРИВЕТ",
    "你好",
    "こんにちは",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      {/* Container for the animated text */}
      <div className="relative">
        <FlipWords
          words={greetings}
          duration={1000} // 1 second duration between words
          className="text-6xl md:text-8xl font-bold text-white tracking-tight"
        />
      </div>
    </div>
  );
};

export default LoadingSec;
