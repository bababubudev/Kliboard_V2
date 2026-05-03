"use client";

import { motion } from "motion/react";
import { SpaceEditor } from "@/components/space/space-editor";
import { RecentSpacesGrid } from "@/components/shared/recent-spaces-grid";
import { fadeUp, staggerContainer, baseTransition } from "@/lib/animations";

export default function Home() {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="flex min-h-[calc(100dvh-7rem)] flex-col items-center px-6 pt-24 sm:pt-[18vh]"
    >
      <motion.h1
        variants={fadeUp}
        transition={baseTransition}
        className="mb-4 text-center font-heading text-4xl font-medium tracking-tight sm:text-5xl"
      >
        create a new space
      </motion.h1>

      <motion.div variants={fadeUp} transition={baseTransition} className="w-full max-w-lg">
        <SpaceEditor />
      </motion.div>

      <motion.div variants={fadeUp} transition={baseTransition} className="mt-28 w-full max-w-3xl pb-16">
        <p className="mb-8 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          recently visited
        </p>
        <RecentSpacesGrid />
      </motion.div>
    </motion.div>
  );
}
