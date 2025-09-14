"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

interface Conversation {
  id: string
  name: string
  avatar: string
  lastMessage: string
  timestamp: string
  unread: number
  online?: boolean
  isGroup?: boolean
}

interface ConversationItemProps {
  conversation: Conversation
  isActive: boolean
  onClick: () => void
}

export function ConversationItem({ conversation, isActive, onClick }: ConversationItemProps) {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer mb-1 ${
        isActive ? "bg-muted" : "hover:bg-muted/50"
      }`}
      onClick={onClick}
    >
      <div className="relative">
        <Avatar>
          <AvatarImage src={conversation.avatar || "/user-2.png"} alt={conversation.name} />
          <AvatarFallback>{conversation.name.charAt(0)}</AvatarFallback>
        </Avatar>
        {conversation.online && !conversation.isGroup && (
          <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-sm truncate">{conversation.name}</h4>
          <span className="text-xs text-muted-foreground whitespace-nowrap">{conversation.timestamp}</span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <p className="text-sm text-muted-foreground truncate">{conversation.lastMessage}</p>
          {conversation.unread > 0 && (
            <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full">
              {conversation.unread}
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
}
