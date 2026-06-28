"use client"

import { MessageCircle, Send, Loader2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import type { AlertConfig } from "@/hooks/use-alerts"

type AlertSettingsProps = {
  config: AlertConfig
  setConfig: React.Dispatch<React.SetStateAction<AlertConfig>>
  sending: boolean
  onSendTest: () => void
}

export function AlertSettings({ config, setConfig, sending, onSendTest }: AlertSettingsProps) {
  return (
    <div className="glass-strong rounded-2xl border border-border/30 p-6">
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle className="w-5 h-5 text-neon" />
        <h2 className="text-lg font-semibold">WhatsApp Alerts</h2>
      </div>

      <div className="space-y-4">
        <label className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium">Enable WhatsApp alerts</div>
            <div className="text-xs text-muted-foreground">Send periodic status updates & critical alerts</div>
          </div>
          <Switch
            checked={config.enabled}
            onCheckedChange={(enabled) => setConfig((c) => ({ ...c, enabled }))}
          />
        </label>

        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-wider text-muted-foreground">
            Recipient phone (E.164)
          </label>
          <Input
            placeholder="+15551234567"
            value={config.phone}
            onChange={(e) => setConfig((c) => ({ ...c, phone: e.target.value }))}
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground">Example: +1 (555) 123-4567 → +15551234567</p>
        </div>

        <button
          type="button"
          disabled={sending || !config.phone.trim()}
          onClick={onSendTest}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-neon px-4 py-2.5 text-sm font-semibold text-neon-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {sending ? "Sending..." : "Send test alert"}
        </button>

        <p className="text-xs text-muted-foreground border-t border-border/20 pt-3 mt-3">
          Status updates: Every 60 seconds • Critical alerts: Immediate
        </p>
      </div>
    </div>
  )
}
