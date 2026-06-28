import { useEffect, useState } from "react"
import { default as useSWR } from "swr"

interface SensorData {
  temperature: number
  humidity: number
  mq135: number
  fanStatus: boolean
  marketDecision: string
  timestamp: string
  epoch: number
}

interface SensorResponse {
  ok: boolean
  data: SensorData | null
  message?: string
}

const fetcher = async (url: string): Promise<SensorResponse> => {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error("Failed to fetch sensor data")
  }
  return res.json()
}

export function useSensorApi() {
  const [isConnected, setIsConnected] = useState(false)
  const { data, error, isLoading } = useSWR(
    "/api/sensor/latest",
    fetcher,
    {
      refreshInterval: 5000, // Refresh every 5 seconds (matches ESP32 upload interval)
      revalidateOnFocus: true,
      shouldRetryOnError: true,
      errorRetryInterval: 3000,
    }
  )

  useEffect(() => {
    if (data?.ok && data?.data) {
      setIsConnected(true)
    } else if (error) {
      setIsConnected(false)
    }
  }, [data, error])

  return {
    current: data?.data || null,
    isLoading,
    isConnected,
    error: error?.message || null,
  }
}
