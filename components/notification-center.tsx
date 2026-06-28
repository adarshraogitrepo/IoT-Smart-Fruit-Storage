"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Bell, AlertTriangle, CheckCircle2, Info, Trash2 } from "lucide-react"
import type { Notification } from "@/hooks/use-alerts"
import { formatTime } from "@/lib/analytics"

const TONE = {
  good: { icon: CheckCircle2, color: "var(--safe)" },
  info: { icon: Info, color: "var(--chart-1)" },
  warn: { icon: AlertTriangle, color: "var(--warn)" },
  danger: { icon: AlertTriangle, color: "var(--danger)" },
}

export function NotificationCenter({
  notifications,
  onClear,
}: {
  notifications: Notification[]
  onClear: () => void
}) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-border glass p-5">
      <div className="flex items-center gap-2">
        <Bell className="size-4 text-primary" />
        <h2 className="font-heading text-lg font-semibold">Notification Center</h2>
        {notifications.length > 0 && (
          <span className="ml-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
            {notifications.length}
          </span>
        )}
        {notifications.length > 0 && (
          <button
            onClick={onClear}
            className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <Trash2 className="size-3.5" /> Clear
          </button>
        )}
      </div>

      <div className="mt-4 max-h-[360px] flex-1 space-y-2 overflow-y-auto pr-1">
        {notifications.length === 0 && (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            No notifications yet — all systems nominal.
          </div>
        )}
        <AnimatePresence initial={false}>
          {notifications.map((n) => {
            const t = TONE[n.tone]
            const Icon = t.icon
            return (
              <motion.div
                key={n.id}
                layout
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-start gap-3 rounded-xl border border-border bg-card/40 p-3"
              >
                <Icon className="mt-0.5 size-4 shrink-0" style={{ color: t.color }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{n.title}</span>
                    <span className="shrink-0 font-mono text-[0.65rem] text-muted-foreground">
                      {formatTime(n.time)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{n.detail}</p>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
