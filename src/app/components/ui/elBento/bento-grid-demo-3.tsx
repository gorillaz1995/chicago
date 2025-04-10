"use client";
import { cn } from "@/lib/utils";
import { BentoGrid, BentoGridItem } from "./bento-grid";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

export default function BentoGridThirdDemo() {
  // State to track if the device has touch capability
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // Detect touch capability on component mount
  useEffect(() => {
    setIsTouchDevice("ontouchstart" in window || navigator.maxTouchPoints > 0);
  }, []);

  return (
    <BentoGrid className="max-w-5xl mx-auto md:auto-rows-[25rem] py-10">
      {items.map((item, i) => (
        <BentoGridItem
          key={i}
          title={item.title}
          description={item.description}
          header={item.header}
          className={cn("[&>p:text-lg]", item.className)}
          icon={item.icon}
          data-touch={isTouchDevice ? "true" : "false"}
        />
      ))}
    </BentoGrid>
  );
}

const SkeletonOne = () => {
  // State to track if animation should play
  const [isAnimating, setIsAnimating] = useState(false);
  // State to track if device has touch capability
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // Detect touch capability and set up animation loop for touch devices
  useEffect(() => {
    const touchDevice =
      "ontouchstart" in window || navigator.maxTouchPoints > 0;
    setIsTouchDevice(touchDevice);
    // Set up animation loop for touch devices
    let animationInterval: NodeJS.Timeout | undefined;
    if (touchDevice) {
      animationInterval = setInterval(() => {
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 500);
      }, 2000);
    }

    // Clean up interval on component unmount
    return () => {
      if (animationInterval) clearInterval(animationInterval);
    };
  }, []);

  const variants = {
    initial: {
      x: 0,
    },
    animate: {
      x: 10,
      rotate: 5,
      transition: {
        duration: 0.2,
      },
    },
  };
  const variantsSecond = {
    initial: {
      x: 0,
    },
    animate: {
      x: -10,
      rotate: -5,
      transition: {
        duration: 0.2,
      },
    },
  };

  // Handle click/tap for non-touch devices
  const handleInteraction = () => {
    if (!isTouchDevice) {
      setIsAnimating(true);
      // Reset animation state after animation completes
      setTimeout(() => setIsAnimating(false), 500);
    }
  };

  return (
    <motion.div
      initial="initial"
      animate={isAnimating ? "animate" : "initial"}
      whileHover="animate"
      onClick={handleInteraction}
      className="flex flex-1 w-full h-full min-h-[6rem] dark:bg-dot-white/[0.2] bg-dot-black/[0.2] flex-col space-y-2 cursor-pointer"
    >
      <motion.div
        variants={variants}
        className="flex flex-row rounded-full border border-neutral-100 dark:border-white/[0.2] p-2 items-center space-x-2 bg-white dark:bg-black"
      >
        <div className="h-6 w-6 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 shrink-0" />
        <div className="w-full bg-gray-100 h-4 rounded-full dark:bg-neutral-900" />
      </motion.div>
      <motion.div
        variants={variantsSecond}
        className="flex flex-row rounded-full border border-neutral-100 dark:border-white/[0.2] p-2 items-center space-x-2 w-3/4 ml-auto bg-white dark:bg-black"
      >
        <div className="w-full bg-gray-100 h-4 rounded-full dark:bg-neutral-900" />
        <div className="h-6 w-6 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 shrink-0" />
      </motion.div>
      <motion.div
        variants={variants}
        className="flex flex-row rounded-full border border-neutral-100 dark:border-white/[0.2] p-2 items-center space-x-2 bg-white dark:bg-black"
      >
        <div className="h-6 w-6 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 shrink-0" />
        <div className="w-full bg-gray-100 h-4 rounded-full dark:bg-neutral-900" />
      </motion.div>
    </motion.div>
  );
};
const SkeletonTwo = () => {
  // State to track if animation should play
  const [isAnimating, setIsAnimating] = useState(false);
  // State to track if device has touch capability
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // Detect touch capability and set up animation loop for touch devices
  useEffect(() => {
    const touchDevice =
      "ontouchstart" in window || navigator.maxTouchPoints > 0;
    setIsTouchDevice(touchDevice);
    // Set up animation loop for touch devices
    let animationInterval: NodeJS.Timeout | undefined;
    if (touchDevice) {
      animationInterval = setInterval(() => {
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 2500);
      }, 2000);
    }

    // Clean up interval on component unmount
    return () => {
      if (animationInterval) clearInterval(animationInterval);
    };
  }, []);

  const variants = {
    initial: {
      width: 0,
    },
    animate: {
      width: "100%",
      transition: {
        duration: 0.2,
      },
    },
    hover: {
      width: ["0%", "100%"],
      transition: {
        duration: 2,
      },
    },
  };

  // Using static widths instead of random values to prevent hydration mismatch
  const widths = ["80%", "65%", "90%", "75%", "85%", "70%"];

  // Handle click/tap for non-touch devices
  const handleInteraction = () => {
    if (!isTouchDevice) {
      setIsAnimating(true);
      // Reset animation state after animation completes
      setTimeout(() => setIsAnimating(false), 2500);
    }
  };

  return (
    <motion.div
      initial="initial"
      animate={isAnimating ? "hover" : "animate"}
      whileHover="hover"
      onClick={handleInteraction}
      className="flex flex-1 w-full h-full min-h-[6rem] dark:bg-dot-white/[0.2] bg-dot-black/[0.2] flex-col space-y-2 cursor-pointer"
    >
      {widths.map((width, i) => (
        <motion.div
          key={"skelenton-two" + i}
          variants={variants}
          style={{
            maxWidth: width,
          }}
          className="flex flex-row rounded-full border border-neutral-100 dark:border-white/[0.2] p-2 items-center space-x-2 bg-neutral-100 dark:bg-black w-full h-4"
        ></motion.div>
      ))}
    </motion.div>
  );
};
const SkeletonThree = () => {
  const variants = {
    initial: {
      backgroundPosition: "0 50%",
    },
    animate: {
      backgroundPosition: ["0, 50%", "100% 50%", "0 50%"],
    },
  };
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={variants}
      transition={{
        duration: 5,
        repeat: Number.POSITIVE_INFINITY,
        repeatType: "reverse",
      }}
      className="flex flex-1 w-full h-full min-h-[6rem] dark:bg-dot-white/[0.2] rounded-lg bg-dot-black/[0.2] flex-col space-y-2"
      style={{
        background:
          "linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab)",
        backgroundSize: "400% 400%",
      }}
    >
      <motion.div className="h-full w-full rounded-lg"></motion.div>
    </motion.div>
  );
};
const SkeletonFour = () => {
  const first = {
    initial: {
      x: 20,
      rotate: -5,
    },
    hover: {
      x: 0,
      rotate: 0,
    },
  };
  const second = {
    initial: {
      x: -20,
      rotate: 5,
    },
    hover: {
      x: 0,
      rotate: 0,
    },
  };
  return (
    <motion.div
      initial="initial"
      animate="animate"
      whileHover="hover"
      className="flex flex-1 w-full h-full min-h-[6rem] dark:bg-dot-white/[0.2] bg-dot-black/[0.2] flex-row space-x-2"
    >
      <motion.div
        variants={first}
        className="h-full w-1/3 rounded-2xl bg-white p-4 dark:bg-black dark:border-white/[0.1] border border-neutral-200 flex flex-col items-center justify-center"
      >
        <div className="rounded-full h-10 w-10 bg-gradient-to-r from-blue-400 to-purple-500" />
        <p className="sm:text-sm text-xs text-center font-semibold text-neutral-500 mt-4">
          Am comandat de la voi si a ajuns altceva
        </p>
        <p className="border border-red-500 bg-red-100 dark:bg-red-900/20 text-red-600 text-xs rounded-full px-2 py-0.5 mt-4">
          Nervos
        </p>
      </motion.div>
      <motion.div className="h-full relative z-20 w-1/3 rounded-2xl bg-white p-4 dark:bg-black dark:border-white/[0.1] border border-neutral-200 flex flex-col items-center justify-center">
        <div className="rounded-full h-10 w-10 bg-gradient-to-r from-green-400 to-teal-500" />
        <p className="sm:text-sm text-xs text-center font-semibold text-neutral-500 mt-4">
          Chiar am sa mai comand..
        </p>
        <p className="border border-green-500 bg-green-100 dark:bg-green-900/20 text-green-600 text-xs rounded-full px-2 py-0.5 mt-4">
          Multumit
        </p>
      </motion.div>
      <motion.div
        variants={second}
        className="h-full w-1/3 rounded-2xl bg-white p-4 dark:bg-black dark:border-white/[0.1] border border-neutral-200 flex flex-col items-center justify-center"
      >
        <div className="rounded-full h-10 w-10 bg-gradient-to-r from-orange-400 to-red-500" />
        <p className="sm:text-sm text-xs text-center font-semibold text-neutral-500 mt-4">
          Nu faceti giveaway?
        </p>
        <p className="border border-orange-500 bg-orange-100 dark:bg-orange-900/20 text-orange-600 text-xs rounded-full px-2 py-0.5 mt-4">
          Nehotarat
        </p>
      </motion.div>
    </motion.div>
  );
};
const SkeletonFive = () => {
  // State to track if device has touch capability
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  // State to track if animation should play
  const [isAnimating, setIsAnimating] = useState(false);

  // Detect touch capability and set up animation loop for touch devices
  useEffect(() => {
    const touchDevice =
      "ontouchstart" in window || navigator.maxTouchPoints > 0;
    setIsTouchDevice(touchDevice);
    // Set up animation loop for touch devices
    let animationInterval: NodeJS.Timeout | undefined;
    if (touchDevice) {
      animationInterval = setInterval(() => {
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 500);
      }, 2000);
    }

    // Clean up interval on component unmount
    return () => {
      if (animationInterval !== undefined) clearInterval(animationInterval);
    };
  }, []);

  const variants = {
    initial: {
      x: 0,
    },
    animate: {
      x: 10,
      rotate: 5,
      transition: {
        duration: 0.2,
      },
    },
  };
  const variantsSecond = {
    initial: {
      x: 0,
    },
    animate: {
      x: -10,
      rotate: -5,
      transition: {
        duration: 0.2,
      },
    },
  };

  // Handle click/tap for non-touch devices
  const handleInteraction = () => {
    if (!isTouchDevice) {
      setIsAnimating(true);
      // Reset animation state after animation completes
      setTimeout(() => setIsAnimating(false), 500);
    }
  };

  return (
    <motion.div
      initial="initial"
      animate={isAnimating ? "animate" : "initial"}
      whileHover="animate"
      onClick={handleInteraction}
      className="flex flex-1 w-full h-full min-h-[6rem] dark:bg-dot-white/[0.2] bg-dot-black/[0.2] flex-col space-y-2"
    >
      <motion.div
        variants={variants}
        className="flex flex-row rounded-2xl border border-neutral-100 dark:border-white/[0.2] p-2  items-start space-x-2 bg-white dark:bg-black"
      >
        <div className="rounded-full h-10 w-10 bg-gradient-to-r from-purple-400 to-indigo-500" />
        <p className="text-xs text-neutral-500">
          Postez zilnic pe Instagram si TikTok, dar nu am rezultate. Ce fac
          gresit?
        </p>
      </motion.div>
      <motion.div
        variants={variantsSecond}
        className="flex flex-row rounded-full border-2 border-neutral-100 dark:border-white/[0.2] p-4 items-center justify-end space-x-3 w-3/4 ml-auto bg-white dark:bg-black"
      >
        <p className="text-xs text-neutral-500">
          Foloseste hashtag-uri relevante si localizare, posteaza marti de la 11
          AM sau joi de la 7 PM.
        </p>
        <div
          className="h-6 w-6 rounded-full"
          style={{
            background:
              "linear-gradient(to left, #d84040, #b2393a, #8e3134, #6a2a2c, #482223, #391e1f, #2b1a1a, #1d1616, #1d1616, #1d1616, #1d1616, #1d1616)",
          }}
        />
      </motion.div>
    </motion.div>
  );
};
const items = [
  {
    title: "Prompt Engineering cu AI custom",
    description: (
      <span className="text-sm">
        Testeaza capabilitatile agentilor AI personalizati pentru rezultate
        precise si in pas cu tendintele actuale.
      </span>
    ),
    header: <SkeletonOne />,
    className: "md:col-span-1",
    icon: <span className="h-4 w-4 text-neutral-500">📋</span>,
  },
  {
    title: "Fara clauze contractuale omise",
    description: (
      <span className="text-sm">
        Fara timp pierdut citind sau redactand contracte, lasa AI sa te ajute
      </span>
    ),
    header: <SkeletonTwo />,
    className: "md:col-span-1",
    icon: <span className="h-4 w-4 text-neutral-500">📄</span>,
  },
  {
    title: "Continut digital optimizat",
    description: (
      <span className="text-sm">
        Mereu la curent cu feedback-ul clientilor tai dar si cu algoritmii
        social media si motoarelor de cautare.
      </span>
    ),
    header: <SkeletonThree />,
    className: "md:col-span-1",
    icon: <span className="h-4 w-4 text-neutral-500">✍️</span>,
  },
  {
    title: "Interpretarea automata a mesajelor de pe retelele sociale. ",
    description: (
      <span className="text-sm">
        O intelegere in amanunt a emotiilor pe baza interactiunilor cu canalele
        de social media.
      </span>
    ),
    header: <SkeletonFour />,
    className: "md:col-span-2",
    icon: <span className="h-4 w-4 text-neutral-500">📊</span>,
  },

  {
    title: "Continut sintetizat",
    description: (
      <span className="text-sm">
        Afla ce faci gresit pe retelele sociale si cum sa te corectezi rapid,
        fara costuri suplimentare pentru audit
      </span>
    ),
    header: <SkeletonFive />,
    className: "md:col-span-1",
    icon: <span className="h-4 w-4 text-neutral-500">📑</span>,
  },
];
