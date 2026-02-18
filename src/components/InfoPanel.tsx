import { useState } from "react"

interface Props {
  title: string
  children: React.ReactNode
}

export function InfoPanel({ title, children }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className={`info-panel${open ? " info-panel-open" : ""}`}>
      <button className="info-panel-toggle" onClick={() => setOpen(o => !o)}>
        <span className="info-panel-icon">{open ? "✕" : "?"}</span>
        <span className="info-panel-label">{open ? `Close: ${title}` : `What is this?`}</span>
      </button>
      {open && (
        <div className="info-panel-body">
          <h4 className="info-panel-title">{title}</h4>
          <div className="info-panel-content">{children}</div>
        </div>
      )}
    </div>
  )
}
