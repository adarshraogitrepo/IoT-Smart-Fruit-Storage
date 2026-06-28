"use client"

import { motion } from "framer-motion"

export function LoadingScreen() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6">
      <div className="relative grid place-items-center">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="absolute rounded-full border-2"
            style={{
              borderColor: "color-mix(in oklch, var(--primary) 50%, transparent)",
              width: 60 + i * 36,
              height: 60 + i * 36,
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 3 + i, repeat: Infinity, ease: "linear" }}
          />
        ))}
        <motion.span
          className="size-4 rounded-full bg-primary"
          animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
          transition={{ duration: 1.4, repeat: Infinity }}
          style={{ boxShadow: "0 0 24px var(--primary)" }}
        />
      </div>
      <div className="text-center">
        <div className="font-mono text-sm uppercase tracking-[0.3em] text-primary neon-text">
          Initializing Telemetry
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          Establishing link to storage sensors...
        </div>
      </div>
    </div>
  )
}
