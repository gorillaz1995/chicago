"use client";
import { BoxReveal } from "./box-reveal";
import { useEffect, useState } from "react";

export function BoxRevealDemo() {
  // State to track viewport width for responsive adjustments
  const [isMobile, setIsMobile] = useState(false);

  // Effect to handle responsive behavior
  useEffect(() => {
    // Function to check if viewport is mobile size
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Initial check
    checkMobile();

    // Add event listener for window resize
    window.addEventListener("resize", checkMobile);

    // Cleanup
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <div
      className={`size-full max-w-lg items-center justify-center overflow-hidden pt-8 ${
        isMobile ? "px-4" : ""
      }`} // Add padding left and right for mobile view
    >
      <BoxReveal boxColor={"#FF1212"} duration={0.5}>
        <p
          className={`${
            isMobile ? "text-[2rem]" : "text-[3rem]"
          } font-semibold font-geist text-center`}
          style={{
            backgroundImage:
              "linear-gradient(to left, #d84040, #b2393a, #8e3134, #6a2a2c, #482223, #391e1f, #2b1a1a, #1d1616, #1d1616, #1d1616, #1d1616, #1d1616)",
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          PROMPT Engineering
          <span className="font-geist font-semibold">.</span>
        </p>
      </BoxReveal>

      <BoxReveal boxColor={"#FF1212"} duration={0.5}>
        <h2
          className={`mt-[.5rem] ${
            isMobile ? "text-[0.8rem]" : "text-[1rem]"
          } font-geist font-normal`}
        >
          Utilizare A.I. pentru solutii eficiente, costuri reduse si timp salvat
          {!isMobile && <br />}{" "}
          <span
            className={`font-geist font-bold ${
              isMobile ? "text-[1rem] block mt-2" : "text-[1.5rem]"
            }`}
            style={{
              backgroundImage:
                "radial-gradient(circle, #8e1616, #7d1c38, #602b49, #433346, #333333)",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            Consultanta gratuita
          </span>
        </h2>
      </BoxReveal>

      <BoxReveal boxColor={"#FF1212"} duration={0.5}>
        <div
          className={`${isMobile ? "mt-4" : "mt-6"} text-center lg:text-right`}
        >
          <p
            className={`${
              isMobile ? "text-[1rem]" : "text-3xl"
            } font-geist font-light`}
          >
            Servicii custom de{" "}
            <span
              className={`font-geist font-semibold ${
                isMobile ? "text-[100%]" : "text-[110%]"
              }`}
              style={{
                backgroundImage:
                  "linear-gradient(to right, #8e1616, #7d1c38, #602b49, #433346, #333333)",
                WebkitBackgroundClip: "text",
                color: "transparent",
              }}
            >
              Web Design, Web Development
            </span>
            ,{" "}
            <span
              className={`font-geist font-semibold ${
                isMobile ? "text-[100%]" : "text-[110%]"
              }`}
              style={{
                backgroundImage:
                  "linear-gradient(to right, #8e1616, #7d1c38, #602b49, #433346, #333333)",
                WebkitBackgroundClip: "text",
                color: "transparent",
              }}
            >
              Graphic Design
            </span>{" "}
            si{" "}
            <span
              className={`font-geist font-semibold ${
                isMobile ? "text-[100%]" : "text-[110%]"
              }`}
              style={{
                backgroundImage:
                  "linear-gradient(to right, #8e1616, #7d1c38, #602b49, #433346, #333333)",
                WebkitBackgroundClip: "text",
                color: "transparent",
              }}
            >
              Social Media Marketing
            </span>{" "}
          </p>
        </div>
      </BoxReveal>
    </div>
  );
}
