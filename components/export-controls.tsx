"use client"

import { Download, FileText } from "lucide-react"
import { type SensorReading, healthScore, predictFreshness } from "@/lib/analytics"

export function ExportControls({ history }: { history: SensorReading[] }) {
  const exportCSV = () => {
    const header = "timestamp,datetime,temperature,humidity,mq135,health_score,spoilage_probability\n"
    const rows = history
      .map((r) => {
        const f = predictFreshness(r)
        return [
          r.timestamp,
          new Date(r.timestamp).toISOString(),
          r.temperature,
          r.humidity,
          r.mq135,
          healthScore(r),
          f.spoilageProbability,
        ].join(",")
      })
      .join("\n")
    downloadBlob(header + rows, "fruit-storage-data.csv", "text/csv")
  }

  const exportReport = () => {
    // Open a print-friendly report window (user can "Save as PDF").
    const latest = history[history.length - 1]
    const f = latest ? predictFreshness(latest) : null
    const win = window.open("", "_blank")
    if (!win) return
    win.document.write(`<!doctype html><html><head><title>Storage Report</title>
      <style>
        body{font-family:ui-sans-serif,system-ui,sans-serif;padding:40px;color:#111}
        h1{margin:0 0 4px}small{color:#666}
        .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:24px 0}
        .card{border:1px solid #ddd;border-radius:12px;padding:16px}
        .k{font-size:12px;color:#666;text-transform:uppercase;letter-spacing:.05em}
        .v{font-size:28px;font-weight:700;margin-top:4px}
        table{width:100%;border-collapse:collapse;font-size:12px;margin-top:16px}
        th,td{border:1px solid #eee;padding:6px 8px;text-align:left}
      </style></head><body>
      <h1>Smart Fruit Storage Report</h1>
      <small>Generated ${new Date().toLocaleString()}</small>
      ${
        latest
          ? `<div class="grid">
              <div class="card"><div class="k">Temperature</div><div class="v">${latest.temperature.toFixed(1)}°C</div></div>
              <div class="card"><div class="k">Humidity</div><div class="v">${latest.humidity.toFixed(0)}%</div></div>
              <div class="card"><div class="k">MQ135</div><div class="v">${Math.round(latest.mq135)} ppm</div></div>
              <div class="card"><div class="k">Health Score</div><div class="v">${healthScore(latest)}/100</div></div>
              <div class="card"><div class="k">Ripeness</div><div class="v" style="font-size:18px">${f?.stage}</div></div>
              <div class="card"><div class="k">Shelf Life</div><div class="v">${f?.shelfLifeDays} days</div></div>
            </div>`
          : ""
      }
      <h3>Recent Readings (last 30)</h3>
      <table><tr><th>Time</th><th>Temp</th><th>Humidity</th><th>MQ135</th><th>Health</th></tr>
      ${history
        .slice(-30)
        .reverse()
        .map(
          (r) =>
            `<tr><td>${new Date(r.timestamp).toLocaleString()}</td><td>${r.temperature.toFixed(
              1,
            )}</td><td>${r.humidity.toFixed(0)}</td><td>${Math.round(r.mq135)}</td><td>${healthScore(r)}</td></tr>`,
        )
        .join("")}
      </table>
      <script>window.onload=()=>window.print()</script>
      </body></html>`)
    win.document.close()
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={exportCSV}
        className="flex items-center gap-2 rounded-xl border border-border bg-card/60 px-3.5 py-2 text-sm font-medium transition-colors hover:bg-accent"
      >
        <Download className="size-4" /> Export CSV
      </button>
      <button
        onClick={exportReport}
        className="flex items-center gap-2 rounded-xl border border-border bg-card/60 px-3.5 py-2 text-sm font-medium transition-colors hover:bg-accent"
      >
        <FileText className="size-4" /> PDF Report
      </button>
    </div>
  )
}

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
