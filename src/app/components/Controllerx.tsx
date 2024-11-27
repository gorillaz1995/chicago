import { useRef, useEffect, useState } from "react";

interface AutoScrollProps {
  interval?: number; // Time in ms between scrolls
  scrollAmount?: number; // How many pixels to scroll each time
  direction?: "horizontal" | "vertical"; // Scroll direction
}

const AutoScroll: React.FC<AutoScrollProps> = ({
  interval = 3000,
  scrollAmount = 100,
  direction = "vertical",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Auto scroll function
    const scroll = () => {
      if (!isScrolling) return;

      if (direction === "vertical") {
        container.scrollBy({
          top: scrollAmount,
          behavior: "smooth",
        });

        // Reset scroll position if reached bottom
        if (
          container.scrollTop + container.clientHeight >=
          container.scrollHeight
        ) {
          container.scrollTop = 0;
        }
      } else {
        container.scrollBy({
          left: scrollAmount,
          behavior: "smooth",
        });

        // Reset scroll position if reached right edge
        if (
          container.scrollLeft + container.clientWidth >=
          container.scrollWidth
        ) {
          container.scrollLeft = 0;
        }
      }
    };

    // Start auto-scrolling
    const scrollInterval = setInterval(scroll, interval);

    // Cleanup
    return () => clearInterval(scrollInterval);
  }, [interval, scrollAmount, direction, isScrolling]);

  return (
    <div
      ref={containerRef}
      style={{
        height: "100%",
        width: "100%",
        overflow: "hidden",
        position: "relative",
      }}
      onMouseEnter={() => setIsScrolling(false)}
      onMouseLeave={() => setIsScrolling(true)}
    >
      {/* Content goes here */}
    </div>
  );
};

export default AutoScroll;
