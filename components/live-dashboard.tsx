'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { useSensorApi } from '@/hooks/use-sensor-api'
import { useAlerts } from '@/hooks/use-alerts'
import { useFanAlerts } from '@/hooks/use-fan-alerts'
import { useThresholds } from '@/lib/thresholds-context'
import { statusFor } from '@/lib/analytics'
import { SettingsPanel } from '@/components/settings-panel'
import { AlertSettings } from '@/components/alert-settings'
import { Thermometer, Droplets, Wind, Power, BookOpen } from 'lucide-react'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

const pulseVariants = {
  animate: { scale: [1, 1.02, 1], transition: { duration: 2, repeat: Infinity } },
}

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  safe: {
    bg: 'bg-safe/5',
    border: 'border-safe/30',
    text: 'text-safe',
    glow: 'shadow-lg shadow-safe/20',
  },
  warn: {
    bg: 'bg-warn/5',
    border: 'border-warn/30',
    text: 'text-warn',
    glow: 'shadow-lg shadow-warn/20',
  },
  danger: {
    bg: 'bg-danger/5',
    border: 'border-danger/30',
    text: 'text-danger',
    glow: 'shadow-lg shadow-danger/20',
  },
}

interface MetricCardProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number | boolean
  unit: string
  status: string
  lastUpdate: string
  delay: number
}

function MetricCard({ icon: Icon, label, value, unit, status, lastUpdate, delay }: MetricCardProps) {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.safe

  return (
    <motion.div
      variants={cardVariants}
      transition={{ delay }}
      className={`glass-strong relative group overflow-hidden rounded-2xl p-6 border ${colors.border} ${colors.bg} ${colors.glow}`}
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-neon/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-lg bg-${status}/10`}>
            <Icon className={`w-6 h-6 ${colors.text}`} />
          </div>
          <motion.div
            animate={status !== 'safe' ? { rotate: [0, 5, -5, 0] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
            className={`text-xs font-semibold px-3 py-1 rounded-full ${colors.bg} border ${colors.border}`}
          >
            {status === 'safe' && '✓ SAFE'}
            {status === 'warn' && '⚠ WARN'}
            {status === 'danger' && '🚨 CRITICAL'}
          </motion.div>
        </div>

        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground mb-2">{label}</p>
          <div className="flex items-baseline gap-2">
            {typeof value === 'boolean' ? (
              <div className={`text-3xl font-bold ${colors.text}`}>
                {value ? '🟢 ON' : '🔴 OFF'}
              </div>
            ) : (
              <>
                <motion.div
                  animate={pulseVariants.animate}
                  className={`text-4xl font-bold ${colors.text}`}
                >
                  {typeof value === 'number' ? value.toFixed(1) : value}
                </motion.div>
                <span className={`text-lg font-semibold ${colors.text}/70`}>{unit}</span>
              </>
            )}
          </div>
        </div>

        <div className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border/30">
          Updated {lastUpdate}
        </div>
      </div>

      {/* Border animation */}
      <div className="absolute inset-0 rounded-2xl pointer-events-none">
        <div
          className={`absolute inset-0 rounded-2xl border ${colors.border} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
          style={{
            backgroundImage: `linear-gradient(90deg, transparent, ${status === 'danger' ? '#e11d48' : status === 'warn' ? '#f59e0b' : '#10b981'}, transparent)`,
            backgroundSize: '200% 100%',
          }}
        />
      </div>
    </motion.div>
  )
}

export function LiveDashboard() {
  const { current, isLoading, isConnected } = useSensorApi()
  const { thresholds } = useThresholds()
  const {
    notifications,
    config: alertConfig,
    setConfig: setAlertConfig,
    sending,
    sendWhatsApp,
  } = useAlerts(current, thresholds)
  useFanAlerts(current)
  const source = isConnected ? "firebase" : "offline"

  if (isLoading || !current) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }} className="text-center">
          <div className="w-12 h-12 border-2 border-neon/30 border-t-neon rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">{isLoading ? "Connecting to sensor..." : "No sensor data available"}</p>
        </motion.div>
      </div>
    )
  }

  const tempStatus = statusFor('temperature', current.temperature, thresholds)
  const humidStatus = statusFor('humidity', current.humidity, thresholds)
  const aqStatus = statusFor('mq135', current.mq135, thresholds)

  const now = new Date()
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Header */}
      <div className="relative z-10 border-b border-border/20 glass-strong backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-2">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-bold neon-text"
            >
              Fruit Storage Monitor
            </motion.h1>
            <div className="flex items-center gap-4">
              <Link
                href="/docs"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                Documentation
              </Link>
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full glass-strong border ${
                  source === 'firebase' ? 'border-safe/30' : 'border-danger/30'
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${source === 'firebase' ? 'bg-safe' : 'bg-danger'}`}
                />
                <span className="text-sm font-medium">
                  {source === 'firebase' ? 'SYSTEM ONLINE' : 'CONNECTION ERROR'}
                </span>
              </motion.div>
            </div>
          </div>
          <p className="text-muted-foreground text-sm">Real-time environmental monitoring • Last update: {timeStr}</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <MetricCard
            icon={Thermometer}
            label="Temperature"
            value={current.temperature}
            unit="°C"
            status={tempStatus}
            lastUpdate={timeStr}
            delay={0}
          />
          <MetricCard
            icon={Droplets}
            label="Humidity"
            value={current.humidity}
            unit="%"
            status={humidStatus}
            lastUpdate={timeStr}
            delay={0.1}
          />
          <MetricCard
            icon={Wind}
            label="Air Quality"
            value={current.mq135}
            unit="ppm"
            status={aqStatus}
            lastUpdate={timeStr}
            delay={0.2}
          />
          <MetricCard
            icon={Power}
            label="Fan Status"
            value={current.fanStatus}
            unit=""
            status="safe"
            lastUpdate={timeStr}
            delay={0.3}
          />
        </motion.div>

        {/* Settings & Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2"
          >
            <AlertSettings
              config={alertConfig}
              setConfig={setAlertConfig}
              sending={sending}
              onSendTest={() => sendWhatsApp(current, true)}
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="glass-strong rounded-2xl p-6 border border-border/30 h-full">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-neon" />
                Notifications
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No alerts yet</p>
                ) : (
                  notifications.slice(0, 5).map((n) => (
                    <div
                      key={n.id}
                      className={`text-xs p-2 rounded border-l-2 ${
                        n.tone === 'danger'
                          ? 'bg-danger/10 border-danger/50 text-danger'
                          : n.tone === 'warn'
                          ? 'bg-warn/10 border-warn/50 text-warn'
                          : n.tone === 'good'
                          ? 'bg-safe/10 border-safe/50 text-safe'
                          : 'bg-muted border-muted-foreground/30 text-muted-foreground'
                      }`}
                    >
                      <div className="font-semibold">{n.title}</div>
                      <div className="text-muted-foreground mt-0.5">{n.detail}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Floating Settings Button */}
      <SettingsPanel />
    </div>
  )
}
