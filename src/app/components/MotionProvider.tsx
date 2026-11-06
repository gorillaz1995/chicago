"use client";

import { LazyMotion, domAnimation } from "motion/react";
import type { ReactNode } from "react";

type MotionProviderProps = {
  children: ReactNode;
};

/**
 * Shared animation runtime for the app.
 * `domAnimation` covers gestures and transforms; `strict` requires the lighter `m` component.
 */
export default function MotionProvider({ children }: MotionProviderProps) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  );
}
