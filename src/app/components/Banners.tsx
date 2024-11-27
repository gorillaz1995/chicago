"use client";

import React from "react";

const Banners: React.FC = () => {
  return (
    <div>
      {/* Top banner with reverse scrolling text */}
      <div
        style={{
          position: "absolute",
          width: "120%",
          height: "clamp(2.232rem, 4.65vw, 5.58rem)",
          background: "#FCABFC",
          transform: "rotate(-15deg) translateY(-100%)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          boxShadow: "0 0 10px rgba(0,0,0,0.5)",
          overflow: "hidden",
        }}
      >
        <h3
          style={{
            color: "#312DFF",
            fontSize: "clamp(1rem, 2vw, 1.5rem)",
            fontWeight: "bold",
            textTransform: "uppercase",
            textShadow: "1px 1px 2px rgba(0,0,0,0.5)",
            padding: "0.5rem",
            whiteSpace: "nowrap",
            overflow: "hidden",
            width: "100%",
          }}
        >
          <div style={{ overflow: "hidden", width: "100%" }}>
            <div style={{ display: "flex", width: "200%" }}>
              <span
                style={{
                  display: "inline-block",
                  whiteSpace: "nowrap",
                  animation: "scrollTextReverse 70s linear infinite",
                }}
              >
                Create Without Boundaries • Create Without Boundaries •&nbsp;
              </span>
              <span
                style={{
                  display: "inline-block",
                  whiteSpace: "nowrap",
                  animation: "scrollTextReverse 70s linear infinite",
                }}
              >
                Create Without Boundaries • Create Without Boundaries •&nbsp;
              </span>
            </div>
          </div>
        </h3>
      </div>

      {/* Bottom banner with forward scrolling text */}
      <div
        style={{
          position: "absolute",
          width: "120%",
          height: "clamp(2.232rem, 4.65vw, 5.58rem)",
          background: "#312DFF",
          transform: "rotate(-15deg)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          boxShadow: "0 0 10px rgba(0,0,0,0.5)",
          overflow: "hidden",
        }}
      >
        <h3
          style={{
            color: "#FCABFC",
            fontSize: "clamp(1rem, 2vw, 1.5rem)",
            fontWeight: "bold",
            textTransform: "uppercase",
            textShadow: "1px 1px 2px rgba(0,0,0,0.5)",
            padding: "0.5rem",
            whiteSpace: "nowrap",
            overflow: "hidden",
            width: "100%",
          }}
        >
          <div style={{ overflow: "hidden", width: "100%" }}>
            <div style={{ display: "flex", width: "200%" }}>
              <span
                style={{
                  display: "inline-block",
                  whiteSpace: "nowrap",
                  animation: "scrollText 70s linear infinite",
                }}
              >
                Be Bold, Break the Mold • Be Bold, Break the Mold •&nbsp;
              </span>
              <span
                style={{
                  display: "inline-block",
                  whiteSpace: "nowrap",
                  animation: "scrollText 70s linear infinite",
                }}
              >
                Be Bold, Break the Mold • Be Bold, Break the Mold •&nbsp;
              </span>
            </div>
          </div>
        </h3>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes scrollText {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        @keyframes scrollTextReverse {
          0% {
            transform: translateX(-50%);
          }
          100% {
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
};

export default Banners;
