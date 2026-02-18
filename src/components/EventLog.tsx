import { useEffect, useRef } from "react"

interface Props {
  events: string[]
}

function isWarning(e: string) {
  return e.includes("⚠") || e.includes("WARNING") || e.includes("CRITICAL") || e.includes("Crisis")
}

function parseEntry(e: string): { year: string; headline: string; body: string } {
  // Format: "2026 — Headline: body text..."  or  "2026 — ⚠ CRITICAL: body..."
  const match = e.match(/^(\d{4})\s*[—–-]\s*(.+?):\s*(.+)$/s)
  if (match) {
    return { year: match[1], headline: match[2].trim(), body: match[3].trim() }
  }
  // Fallback for init message "2025: text"
  const fallback = e.match(/^(\d{4}):\s*(.+)$/)
  if (fallback) {
    return { year: fallback[1], headline: "", body: fallback[2].trim() }
  }
  return { year: "", headline: "", body: e }
}

export function EventLog({ events }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [events])

  return (
    <div className="event-log">
      <h3 className="event-log-title">Event Log</h3>
      <div className="event-log-body">
        {events.map((e, i) => {
          const warn = isWarning(e)
          const { year, headline, body } = parseEntry(e)
          return (
            <div key={i} className={`event-entry${warn ? " event-warning" : ""}`}>
              <span className="event-bullet">›</span>
              <div className="event-content">
                <div className="event-header">
                  {year && <span className="event-year">{year}</span>}
                  {headline && (
                    <span className={`event-headline${warn ? " event-headline-warn" : ""}`}>
                      {headline}
                    </span>
                  )}
                </div>
                <p className="event-body">{body}</p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
