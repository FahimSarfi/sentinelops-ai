"use client";
import { motion, useReducedMotion } from "motion/react";
export function Reveal({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={false}
      whileInView={reduce ? { opacity: 1 } : { opacity: [0.8, 1], y: [12, 0] }}
      viewport={{ once: true, amount: 0.08 }}
      transition={{ duration: reduce ? 0 : 0.6 }}
      style={{ opacity: 1 }}
    >
      {children}
    </motion.div>
  );
}
