"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

// ----------------------------------------------------------------
// Variants
// ----------------------------------------------------------------

export const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0,
    },
  },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  },
};

// ----------------------------------------------------------------
// Components
// ----------------------------------------------------------------

interface ContainerProps {
  children: ReactNode;
  className?: string;
}

/**
 * Wraps a list of <StaggerItem> children and orchestrates
 * the staggered entrance animation when the container
 * enters the viewport.
 */
export default function StaggerContainer({ children, className }: ContainerProps) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Individual item inside a <StaggerContainer>.
 * Each item animates in sequence with a stagger offset.
 */
export function StaggerItem({ children, className }: ContainerProps) {
  return (
    <motion.div variants={staggerItem} className={className}>
      {children}
    </motion.div>
  );
}
