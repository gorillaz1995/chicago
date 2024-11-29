"use client";

import { useState } from "react";
import { BackgroundGradient } from "./ui/background-gradient";
import { motion, AnimatePresence } from "framer-motion";

export default function Popx() {
  const [showPhoneMessage, setShowPhoneMessage] = useState(false);
  const [showEmailMessage, setShowEmailMessage] = useState(false);

  // Function to copy text and show message
  const handleCopy = async (text: string, isPhone: boolean) => {
    await navigator.clipboard.writeText(text);
    if (isPhone) {
      setShowPhoneMessage(true);
      setTimeout(() => setShowPhoneMessage(false), 2000);
    } else {
      setShowEmailMessage(true);
      setTimeout(() => setShowEmailMessage(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative">
      {/* Main Content */}
      <BackgroundGradient className="p-8 rounded-3xl max-w-md w-full">
        <h1 className="text-4xl font-bold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 font-muller">
          Date de Contact
        </h1>

        <div className="space-y-4">
          {/* Phone Button */}
          <button
            onClick={() => handleCopy("0721 792 999", true)}
            className="w-full inline-flex h-12 animate-shimmer items-center justify-center rounded-full border border-slate-800 bg-[linear-gradient(110deg,#000103,45%,#1e2631,55%,#000103)] bg-[length:200%_100%] px-6 font-medium text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50 font-muller"
          >
            Numar Telefon
          </button>

          {/* Email Button */}
          <button
            onClick={() => handleCopy("tedy.ionf@gmail.com", false)}
            className="w-full inline-flex h-12 animate-shimmer items-center justify-center rounded-full border border-slate-800 bg-[linear-gradient(110deg,#000103,45%,#1e2631,55%,#000103)] bg-[length:200%_100%] px-6 font-medium text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50 font-muller"
          >
            Adresa Email
          </button>
        </div>
      </BackgroundGradient>

      {/* Notification Messages */}
      <AnimatePresence mode="wait">
        {showPhoneMessage && (
          <motion.div
            key="phone-message"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black text-white px-6 py-3 rounded-lg shadow-xl z-50 font-muller"
          >
            Ai copiat numarul de telefon
          </motion.div>
        )}

        {showEmailMessage && (
          <motion.div
            key="email-message"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black text-white px-6 py-3 rounded-lg shadow-xl z-50 font-muller"
          >
            Ai copiat adresa de email
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
