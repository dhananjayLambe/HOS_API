import { Check, CheckCheck } from "lucide-react"

interface Message {
  id: string
  sender: string
  content: string
  timestamp: string
  status?: "sent" | "delivered" | "read"
}

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] md:max-w-[70%] rounded-lg p-3 ${
          isOwn ? "bg-primary text-primary-foreground" : "bg-muted"
        }`}
      >
        {!isOwn && <p className="font-medium text-sm mb-1">{message.sender}</p>}
        <p className="text-sm">{message.content}</p>
        <div
          className={`flex items-center gap-1 mt-1 text-xs ${isOwn ? "text-primary-foreground/70" : "text-muted-foreground"}`}
        >
          <span>{message.timestamp}</span>
          {isOwn && message.status && (
            <span className="ml-1">
              {message.status === "sent" && <Check className="h-3 w-3" />}
              {message.status === "delivered" && <CheckCheck className="h-3 w-3" />}
              {message.status === "read" && <CheckCheck className="h-3 w-3 text-blue-400" />}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
