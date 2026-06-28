"use client"

import { motion } from "framer-motion"
import { Moon, Sun, Activity, Cpu } from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import type { DataSource } from "@/hooks/use-sensor-data"

export function Hero({ source }: { source: DataSource }) {
  const { theme, toggle } = useTheme()
  const online = source === "firebase"

  return (
    <header className="relative overflow-hidden rounded-3xl border border-border glass-strong px-6 py-8 sm:px-10 sm:py-12">
      <div
        className="absolute inset-0 -z-10 opacity-60"
        style={{
          background:
            "radial-gradient(circle at 15% 0%, color-mix(in oklch, var(--neon) 20%, transparent), transparent 45%), radial-gradient(circle at 100% 100%, color-mix(in oklch, var(--chart-2) 16%, transparent), transparent 50%)",
        }}
      />
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.3em] text-muted-foreground">
            <Cpu className="size-3.5 text-primary" />
            Mission Control · ESP32 Telemetry
          </div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-pretty font-heading text-3xl font-bold leading-tight tracking-tight sm:text-5xl"
          >
            <span className="neon-text text-primary">SMART FRUIT STORAGE</span>
          </motion.h1>
          <p className="max-w-xl text-pretty text-sm text-muted-foreground sm:text-base">
            AI-Powered Spoilage Prevention System — real-time environmental
            intelligence for your cold storage chamber.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5 rounded-full border border-border bg-card/60 px-4 py-2">
            <span className="relative inline-flex size-2.5">
              <span
                className="pulse-ring absolute inline-flex size-2.5 rounded-full"
                style={{ color: online ? "var(--safe)" : "var(--warn)" }}
              />
              <span
                className="relative inline-flex size-2.5 rounded-full"
                style={{ background: online ? "var(--safe)" : "var(--warn)" }}
              />
            </span>
            <span className="font-mono text-xs font-semibold tracking-wider">
              {source === "firebase" ? "SYSTEM ONLINE" : source === "error" ? "CONNECTION ERROR" : "CONNECTING…"}
            </span>
            <Activity className="size-3.5 text-muted-foreground" />
          </div>

          <button
            type="button"
            onClick={toggle}
            aria-label="Toggle theme"
            className="grid size-10 place-items-center rounded-full border border-border bg-card/60 text-foreground transition-colors hover:bg-accent"
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-2 text-[0.7rem] font-mono uppercase tracking-wider text-muted-foreground">
        <span className="rounded-md border border-border px-2 py-0.5">
          source: {source}
        </span>
        <span className="rounded-md border border-border px-2 py-0.5">
          refresh: 3s
        </span>
      </div>
    </header>
  )
}
