import { useState, useRef, useEffect } from "react"
import type { SimulationState, SliderInputs, ModelParams } from "../engine/types"

interface Props {
  history: SimulationState[]
  sliders: SliderInputs
  onSliderChange: (key: keyof SliderInputs, value: number) => void
  params: ModelParams
}

interface Message {
  role: "user" | "assistant" | "system-action"
  content: string
}

const SLIDER_LABELS: Record<keyof SliderInputs, string> = {
  aiCapability: "AI Capability",
  adoptionSpeed: "Adoption Speed",
  regulation: "Regulation",
  retraining: "Retraining Programs",
  transfers: "Social Transfers",
  laborProtection: "Labor Protections",
  corporateConcentration: "Corporate Concentration",
  energyCost: "Energy Cost Shock",
  supplyChainResilience: "Supply Chain Resilience",
}

const STARTER_CHIPS = [
  "What's happening right now?",
  "Why is unemployment high?",
  "How do I improve stability?",
  "Set AI capability to max",
  "Try full regulation",
]

function getStabilityLabel(v: number) {
  if (v >= 70) return "Stable"
  if (v >= 45) return "Strained"
  if (v >= 25) return "Unstable"
  return "Critical"
}

function buildSystemPrompt(history: SimulationState[], sliders: SliderInputs): string {
  const latest = history[history.length - 1]
  const recentEvents = [...latest.eventLog].slice(-3).join("\n")

  return `You are an AI economist assistant embedded in AI Economy Lab — a simulation of AI's impact on the US economy over 10 years (2025–2035).

CURRENT SIMULATION STATE (Year ${latest.year}):
- GDP Index: ${latest.gdpIndex.toFixed(1)} (100 = baseline 2025)
- Unemployment: ${(latest.unemploymentRate * 100).toFixed(1)}% (structural baseline ~8%)
- Food Price Index: ${latest.foodPriceIndex.toFixed(3)} (1.000 = no change from baseline)
- Inequality Index: ${latest.inequalityIndex.toFixed(2)} (1.00 = baseline)
- Stability Index: ${latest.stabilityIndex.toFixed(1)}/100 (${getStabilityLabel(latest.stabilityIndex)})

CURRENT SLIDER SETTINGS:
- AI Capability: ${sliders.aiCapability} (0=none, 1=maximum AI power)
- Adoption Speed: ${sliders.adoptionSpeed} (how fast firms deploy AI)
- Regulation: ${sliders.regulation} (0=none, 1=heavy government oversight)
- Retraining Programs: ${sliders.retraining} (worker transition investment)
- Social Transfers: ${sliders.transfers} (UBI-style payments to displaced workers)
- Labor Protections: ${sliders.laborProtection} (legal barriers to layoffs)
- Corporate Concentration: ${sliders.corporateConcentration} (market power of large firms)
- Energy Cost Shock: ${sliders.energyCost} (-0.5=cheap energy, +0.5=expensive)
- Supply Chain Resilience: ${sliders.supplyChainResilience} (logistics network robustness)

RECENT EVENTS:
${recentEvents}

INSTRUCTIONS:
1. Answer in plain, direct English. 2–4 sentences unless the user asks for detail.
2. Base all numbers on the state above — do not invent figures.
3. If the user asks to change one or more sliders, include this exact format for each change:
   SLIDER_CHANGE: {"key": "sliderName", "value": 0.8}
   Valid keys: aiCapability, adoptionSpeed, regulation, retraining, transfers, laborProtection, corporateConcentration, energyCost, supplyChainResilience
   Valid ranges: most 0–1, energyCost –0.5 to 0.5
4. Do NOT show the SLIDER_CHANGE lines in your visible response text — they are parsed automatically.
5. After slider changes, briefly explain what effect the change will have.`
}

function parseSliderChanges(text: string): { key: keyof SliderInputs; value: number }[] {
  const changes: { key: keyof SliderInputs; value: number }[] = []
  const regex = /SLIDER_CHANGE:\s*(\{[^}]+\})/g
  let match
  while ((match = regex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1])
      if (
        parsed.key &&
        typeof parsed.value === "number" &&
        Object.keys(SLIDER_LABELS).includes(parsed.key)
      ) {
        changes.push({ key: parsed.key as keyof SliderInputs, value: parsed.value })
      }
    } catch {
      // ignore malformed JSON
    }
  }
  return changes
}

function stripSliderCommands(text: string): string {
  return text.replace(/SLIDER_CHANGE:\s*\{[^}]+\}\n?/g, "").trim()
}

export function Chatbot({ history, sliders, onSliderChange }: Props) {
  const apiKey = import.meta.env.VITE_GROK_API_KEY as string | undefined
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return
    const userMsg: Message = { role: "user", content: text.trim() }
    setMessages(prev => [...prev, userMsg])
    setInput("")
    setLoading(true)

    // Build conversation for API
    const conversationHistory = [...messages, userMsg]
      .filter(m => m.role !== "system-action")
      .map(m => ({ role: m.role === "system-action" ? "assistant" : m.role, content: m.content }))

    try {
      const response = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "grok-3-mini",
          messages: [
            { role: "system", content: buildSystemPrompt(history, sliders) },
            ...conversationHistory,
          ],
          max_tokens: 400,
          temperature: 0.4,
        }),
      })

      if (!response.ok) {
        const err = await response.text()
        throw new Error(`API error ${response.status}: ${err}`)
      }

      const data = await response.json()
      const raw: string = data.choices?.[0]?.message?.content ?? "No response."

      // Parse and fire slider changes
      const changes = parseSliderChanges(raw)
      const visible = stripSliderCommands(raw)

      setMessages(prev => [...prev, { role: "assistant", content: visible }])

      if (changes.length > 0) {
        changes.forEach(c => {
          const clamped = Math.max(
            c.key === "energyCost" ? -0.5 : 0,
            Math.min(c.key === "energyCost" ? 0.5 : 1, c.value)
          )
          onSliderChange(c.key, clamped)
        })
        const confirmLines = changes
          .map(c => `✓ ${SLIDER_LABELS[c.key]} → ${c.value.toFixed(2)}`)
          .join("  ·  ")
        setMessages(prev => [...prev, { role: "system-action", content: confirmLines }])
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: `⚠ Error: ${msg}` },
      ])
    } finally {
      setLoading(false)
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  // No API key — show setup screen
  if (!apiKey || apiKey === "your_key_here") {
    return (
      <div className="chatbot">
        <div className="chatbot-header">
          <span className="chatbot-title">🤖 AI Economist</span>
        </div>
        <div className="chatbot-setup">
          <p><strong>Add your Grok API key to enable the chatbot.</strong></p>
          <ol>
            <li>Get a free key at <a href="https://console.x.ai" target="_blank" rel="noreferrer">console.x.ai</a></li>
            <li>Create a file called <code>.env.local</code> in the project root</li>
            <li>Add: <code>VITE_GROK_API_KEY=your_key_here</code></li>
            <li>Restart the dev server (<code>npm run dev</code>)</li>
          </ol>
          <p className="chatbot-setup-note">The chatbot reads the current simulation state and can answer questions and change sliders for you.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="chatbot">
      <div className="chatbot-header">
        <span className="chatbot-title">🤖 AI Economist</span>
        <span className="chatbot-subtitle">Ask about the simulation or say "set regulation to max"</span>
      </div>

      {/* Starter chips — only show when no messages yet */}
      {messages.length === 0 && (
        <div className="chatbot-chips">
          {STARTER_CHIPS.map(chip => (
            <button
              key={chip}
              className="chatbot-chip"
              onClick={() => sendMessage(chip)}
              disabled={loading}
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Message list */}
      {messages.length > 0 && (
        <div className="chatbot-messages">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={
                msg.role === "user"
                  ? "chatbot-msg chatbot-msg-user"
                  : msg.role === "system-action"
                  ? "chatbot-msg chatbot-msg-action"
                  : "chatbot-msg chatbot-msg-bot"
              }
            >
              {msg.content}
            </div>
          ))}
          {loading && (
            <div className="chatbot-msg chatbot-msg-bot chatbot-msg-thinking">
              Thinking<span className="chatbot-dots">...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input row */}
      <div className="chatbot-input-row">
        <textarea
          ref={textareaRef}
          className="chatbot-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question or give a command…"
          rows={1}
          disabled={loading}
        />
        <button
          className="chatbot-send"
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
        >
          {loading ? "…" : "Send"}
        </button>
      </div>
    </div>
  )
}
