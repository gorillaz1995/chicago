"use client"

import { cn } from "@/lib/utils"
import { AnimatePresence, LazyMotion, m } from "motion/react"
import React, { type ComponentPropsWithoutRef, useEffect, useMemo, useState } from "react"

/** Layout shifts in the list need drag/layout features, loaded only when this list mounts. */
const loadLayoutFeatures = () =>
  import("@/lib/motion-features").then((mod) => mod.default)

export function AnimatedListItem({ children }: { children: React.ReactNode }) {
  const animations = {
    initial: { scale: 0, opacity: 0 },
    animate: { scale: 1, opacity: 1, originY: 0 },
    exit: { scale: 0, opacity: 0 },
    transition: { type: "spring" as const, stiffness: 350, damping: 40 },
  }

  return (
    <m.div {...animations} layout className="mx-auto w-full">
      {children}
    </m.div>
  )
}

export interface AnimatedListProps extends ComponentPropsWithoutRef<"div"> {
  children: React.ReactNode
  delay?: number
}

export const AnimatedList = React.memo(({ children, className, delay = 1000, ...props }: AnimatedListProps) => {
  const [index, setIndex] = useState(0)
  const childrenArray = useMemo(() => React.Children.toArray(children), [children])

  useEffect(() => {
    if (index < childrenArray.length - 1) {
      const timeout = setTimeout(() => {
        setIndex((prevIndex) => (prevIndex + 1) % childrenArray.length)
      }, delay)

      return () => clearTimeout(timeout)
    }
  }, [index, delay, childrenArray.length])

  const itemsToShow = useMemo(() => {
    const result = childrenArray.slice(0, index + 1).reverse()
    return result
  }, [index, childrenArray])

  return (
    <LazyMotion features={loadLayoutFeatures} strict>
      <div className={cn(`flex flex-col items-center gap-4`, className)} {...props}>
        <AnimatePresence>
          {itemsToShow.map((item) => (
            <AnimatedListItem key={(item as React.ReactElement).key}>{item}</AnimatedListItem>
          ))}
        </AnimatePresence>
      </div>
    </LazyMotion>
  )
})

AnimatedList.displayName = "AnimatedList"

