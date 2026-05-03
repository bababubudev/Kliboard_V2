import type { Transition, Variants } from "motion/react";

export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

export const DURATION = {
  fast: 0.15,
  base: 0.2,
  slow: 0.25,
  medium: 0.35,
} as const;

export const baseTransition: Transition = {
  duration: DURATION.base,
  ease: EASE_OUT,
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

export const fileItemVariants: Variants = {
  hidden: { opacity: 0, y: -8 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8, scale: 0.97 },
};

export const errorVariants: Variants = {
  hidden: { opacity: 0, y: -4 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

export const listStagger: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.03, delayChildren: 0.02 },
  },
};

export const scaleReveal: Variants = {
  hidden: { opacity: 0, scale: 0.97 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.97 },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.05, delayChildren: 0.02 },
  },
  exit: {},
};

export const screenFade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURATION.slow, ease: EASE_OUT } },
  exit: { opacity: 0, transition: { duration: DURATION.fast, ease: EASE_OUT } },
};

export const switchVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

export const iconSwap: Variants = {
  hidden: { opacity: 0, scale: 0.5, rotate: -90 },
  visible: { opacity: 1, scale: 1, rotate: 0 },
  exit: { opacity: 0, scale: 0.5, rotate: 90 },
};
