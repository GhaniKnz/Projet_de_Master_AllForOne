import React from 'react'
import { Image, Smile, Send } from 'lucide-react'

type ChatComposerProps = {
  onSend: (text: string) => void
  ariaLabel?: string
}

export default function ChatComposer({ onSend, ariaLabel = 'Composer un message' }: ChatComposerProps) {
  const [text, setText] = React.useState('')

  const send = () => {
    const value = text.trim()
    if (!value) return
    onSend(value)
    setText('')
  }

  return (
    <div className="rounded-3xl border border-border/70 bg-surface px-3 py-2 shadow-soft">
      <label className="sr-only" htmlFor="chat-message">
        {ariaLabel}
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-2xl text-muted transition hover:text-primary focus-ring"
          aria-label="Ajouter une image"
        >
          <Image className="h-5 w-5" />
        </button>
        <textarea
          id="chat-message"
          value={text}
          onChange={(event) => setText(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              send()
            }
          }}
          placeholder="Message..."
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm text-txt placeholder:text-muted focus:outline-none"
        />
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-2xl text-muted transition hover:text-primary focus-ring"
          aria-label="Ajouter un emoji"
        >
          <Smile className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={send}
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-white shadow-soft transition hover:bg-primary/90 focus-ring disabled:cursor-not-allowed disabled:bg-muted disabled:text-white"
          aria-label="Envoyer le message"
          disabled={!text.trim()}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
