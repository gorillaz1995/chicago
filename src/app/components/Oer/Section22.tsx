import React from "react";

function Section22() {
  // Section component with backdrop blur and distortion effects
  return (
    <div className="h-screen relative">
      {/* Blur backdrop with distortion effect */}
      <div
        className="absolute inset-0 backdrop-blur-lg"
        style={{
          backdropFilter: "blur(9px)",
          WebkitBackdropFilter: "blur(9px)",
          background: "rgba(255, 255, 255, 0.4)",
          transform: "scale(1.02)",
          filter: "url(#distortion)",
        }}
      />

      {/* SVG filter for distortion effect */}
      <svg className="hidden">
        <filter id="distortion">
          <feTurbulence
            type="turbulence"
            baseFrequency="0.01 0.01"
            numOctaves="2"
            result="turbulence"
          />
          <feDisplacementMap
            in2="turbulence"
            in="SourceGraphic"
            scale="10"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </svg>

      {/* Content */}
      <div className="relative z-10 h-full flex items-center justify-center">
        <div className="text-center text-black text-2xl max-w-4xl px-6">
          ## **Section 1: De la șuruburi la pixeli** **Subheadline:** Într-o
          altă viață, proiectam în AutoCAD echipamente industriale și mă ocupam
          de mentenanța tehnică într-unul dintre cele mai moderne hoteluri din
          România. *Am crezut multă vreme că pasiunea mea e să calculez forțe de
          torsiune și să desenez roți dințate.* Dar de ce să fiu doar o rotiță
          într-un mecanism când aș putea construi mecanismul întreg? Acum
          transform idei în site-uri moderne, povești în campanii care vând și
          afaceri obișnuite în prezențe digitale care impresionează.
        </div>
      </div>
    </div>
  );
}

export default Section22;
