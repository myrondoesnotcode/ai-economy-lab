import { useEffect, useRef } from "react"

interface Props {
  events: string[]
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
        {events.map((e, i) => (
          <div key={i} className={`event-entry ${e.startsWith("WARNING") ? "event-warning" : ""}`}>
            <span className="event-bullet">›</span>
            <span>{e}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
