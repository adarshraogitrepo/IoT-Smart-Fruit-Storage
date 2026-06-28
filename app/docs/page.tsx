'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, Download, ExternalLink, Loader2 } from 'lucide-react'

type DocType = 'SETUP_GUIDE' | 'IMPLEMENTATION_COMPLETE'

export default function DocsPage() {
  const [selectedDoc, setSelectedDoc] = useState<DocType>('SETUP_GUIDE')
  const [content, setContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDoc(selectedDoc)
  }, [selectedDoc])

  const fetchDoc = async (doc: DocType) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/docs?file=${doc}`)
      const data = await response.json()

      if (data.ok) {
        setContent(data.content)
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('Failed to load documentation')
    } finally {
      setLoading(false)
    }
  }

  const docs: Array<{ id: DocType; title: string; description: string }> = [
    {
      id: 'SETUP_GUIDE',
      title: 'Setup Guide',
      description: 'Step-by-step instructions for Firebase, Twilio, and ESP32 configuration',
    },
    {
      id: 'IMPLEMENTATION_COMPLETE',
      title: 'Implementation Reference',
      description: 'Complete implementation details with testing checklist',
    },
  ]

  const handleDownloadESP32 = async () => {
    try {
      const response = await fetch('/ESP32_SmartFruitStorage_Updated.ino')
      const text = await response.text()
      const blob = new Blob([text], { type: 'text/plain' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'ESP32_SmartFruitStorage_Updated.ino'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Failed to download ESP32 code')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ChevronLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Documentation & Setup</h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-4">
          {/* Sidebar Navigation */}
          <div className="space-y-2">
            <h2 className="mb-4 font-semibold text-foreground">Documents</h2>
            {docs.map((doc) => (
              <button
                key={doc.id}
                onClick={() => setSelectedDoc(doc.id)}
                className={`w-full rounded-lg border px-4 py-3 text-left transition-colors ${
                  selectedDoc === doc.id
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-foreground hover:bg-muted'
                }`}
              >
                <div className="font-medium">{doc.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">{doc.description}</div>
              </button>
            ))}

            <div className="border-t border-border pt-4">
              <h3 className="mb-3 font-semibold text-foreground">Downloads</h3>
              <Button
                onClick={handleDownloadESP32}
                variant="outline"
                size="sm"
                className="w-full gap-2"
              >
                <Download className="h-4 w-4" />
                ESP32 Code
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Card className="min-h-96 overflow-hidden">
              {loading && (
                <div className="flex h-96 items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading documentation...
                </div>
              )}

              {error && (
                <div className="p-6">
                  <div className="rounded-lg bg-destructive/10 p-4 text-destructive">{error}</div>
                </div>
              )}

              {!loading && !error && (
                <div className="prose prose-sm dark:prose-invert max-w-none p-6">
                  {content.split('\n').map((line, idx) => {
                    if (line.startsWith('# ')) {
                      return (
                        <h1 key={idx} className="mb-4 text-2xl font-bold">
                          {line.replace('# ', '')}
                        </h1>
                      )
                    }
                    if (line.startsWith('## ')) {
                      return (
                        <h2 key={idx} className="mb-3 mt-6 text-xl font-semibold">
                          {line.replace('## ', '')}
                        </h2>
                      )
                    }
                    if (line.startsWith('### ')) {
                      return (
                        <h3 key={idx} className="mb-2 mt-4 text-lg font-semibold">
                          {line.replace('### ', '')}
                        </h3>
                      )
                    }
                    if (line.startsWith('- ')) {
                      return (
                        <li key={idx} className="ml-6 list-disc">
                          {line.replace('- ', '')}
                        </li>
                      )
                    }
                    if (line.startsWith('```')) {
                      return null
                    }
                    if (line.trim() === '') {
                      return <div key={idx} className="my-2" />
                    }
                    return (
                      <p key={idx} className="mb-2 text-foreground">
                        {line}
                      </p>
                    )
                  })}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
