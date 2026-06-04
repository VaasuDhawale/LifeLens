import { motion } from "framer-motion";

export function LoadingSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <motion.div
          className="min-h-60 rounded-lg border border-white/10 bg-white/[0.045] p-4"
          key={index}
          initial={{ opacity: 0.35 }}
          animate={{ opacity: [0.35, 0.75, 0.35] }}
          transition={{ duration: 1.25, repeat: Infinity, delay: index * 0.08 }}
        >
          <div className="h-28 rounded-lg bg-white/[0.06]" />
          <div className="mt-5 h-4 w-3/4 rounded-full bg-white/[0.08]" />
          <div className="mt-3 h-3 w-full rounded-full bg-white/[0.05]" />
          <div className="mt-2 h-3 w-2/3 rounded-full bg-white/[0.05]" />
        </motion.div>
      ))}
    </div>
  );
}
