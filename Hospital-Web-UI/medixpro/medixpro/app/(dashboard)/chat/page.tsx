"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { Search, Plus, Phone, Video, Info, Paperclip, Send, Smile, MoreVertical, ChartBar, MessageCircleIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

// Mock data for conversations
const conversations = [
  {
    id: "1",
    name: "Dr. James Wilson",
    avatar: "/thoughtful-gaze.png",
    lastMessage: "I'll check the patient's records",
    timestamp: "10:42 AM",
    unread: 2,
    online: true,
    role: "Cardiologist",
  },
  {
    id: "2",
    name: "Nurse Emily Chen",
    avatar: "/contemplative-artist.png",
    lastMessage: "The lab results are ready",
    timestamp: "9:30 AM",
    unread: 0,
    online: true,
    role: "Head Nurse",
  },
  {
    id: "3",
    name: "Cardiology Department",
    avatar: "",
    lastMessage: "Meeting scheduled for tomorrow",
    timestamp: "Yesterday",
    unread: 0,
    online: false,
    isGroup: true,
    members: 8,
  },
  {
    id: "4",
    name: "Dr. Sarah Johnson",
    avatar: "/medical-professional-profile.png",
    lastMessage: "Please update the patient status",
    timestamp: "Yesterday",
    unread: 0,
    online: false,
    role: "Neurologist",
  },
  {
    id: "5",
    name: "Emergency Response Team",
    avatar: "",
    lastMessage: "New protocol document shared",
    timestamp: "Monday",
    unread: 0,
    online: false,
    isGroup: true,
    members: 12,
  },
  {
    id: "6",
    name: "John Smith (Patient)",
    avatar: "/abstract-jr.png",
    lastMessage: "When should I take the medication?",
    timestamp: "Monday",
    unread: 0,
    online: false,
    role: "Patient",
  },
  {
    id: "7",
    name: "Dr. Michael Brown",
    avatar: "/thoughtful-artist.png",
    lastMessage: "I've updated the prescription",
    timestamp: "Last week",
    unread: 0,
    online: false,
    role: "Pediatrician",
  },
  {
    id: "8",
    name: "Admin Staff",
    avatar: "",
    lastMessage: "New insurance forms available",
    timestamp: "Last week",
    unread: 0,
    online: false,
    isGroup: true,
    members: 5,
  },
]

// Mock data for messages in the current conversation
const messages = [
  {
    id: "m1",
    sender: "Dr. James Wilson",
    content: "Hello Dr. Johnson, I need to consult with you about a patient with unusual cardiac symptoms.",
    timestamp: "10:30 AM",
    isSender: false,
  },
  {
    id: "m2",
    sender: "You",
    content: "Of course, Dr. Wilson. What are the symptoms you're seeing?",
    timestamp: "10:32 AM",
    isSender: true,
    status: "read",
  },
  {
    id: "m3",
    sender: "Dr. James Wilson",
    content:
      "The patient has intermittent chest pain, but their ECG shows normal sinus rhythm. However, there's an elevation in troponin levels.",
    timestamp: "10:35 AM",
    isSender: false,
  },
  {
    id: "m4",
    sender: "You",
    content:
      "That's interesting. Have you checked for pericarditis? Sometimes it can present with normal ECG but elevated troponin.",
    timestamp: "10:38 AM",
    isSender: true,
    status: "read",
  },
  {
    id: "m5",
    sender: "Dr. James Wilson",
    content: "I hadn't considered that. I'll order an echocardiogram to check for pericardial effusion.",
    timestamp: "10:40 AM",
    isSender: false,
  },
  {
    id: "m6",
    sender: "Dr. James Wilson",
    content: "I'll check the patient's records for any history of autoimmune disorders as well.",
    timestamp: "10:42 AM",
    isSender: false,
  },
]

export default function ChatPage() {
  const [activeConversation, setActiveConversation] = useState(conversations[0])
  const [messageInput, setMessageInput] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const filteredConversations = conversations.filter((conv) =>
    conv.name.toLowerCase().includes(searchInput.toLowerCase()),
  )

  const handleSendMessage = () => {
    if (messageInput.trim()) {
      // In a real app, you would send this message to your backend
      console.log("Sending message:", messageInput)
      setMessageInput("")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setIsSidebarOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-3">
      <Button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden"> <MessageCircleIcon className="h-4 w-4" /> Open Chat</Button>
      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar with conversations */}
        <div className={cn("w-full sm:w-80 xxl:w-96 border-r duration-300 bg-background max-md:absolute max-md:left-0 max-md:top-0 max-md:h-full max-md:z-50", isSidebarOpen ? "translate-x-0" : "max-md:-translate-x-full")}>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Messages</h2>
              <Button variant="ghost" size="icon">
                <Plus className="h-5 w-5" />
                <span className="sr-only">New conversation</span>
              </Button>
            </div>
            <div className="relative mt-2">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations"
                className="pl-8"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
          </div>
          <Tabs defaultValue="all" className="px-4">
            <TabsList className="w-full">
              <TabsTrigger value="all" className="flex-1">
                All
              </TabsTrigger>
              <TabsTrigger value="unread" className="flex-1">
                Unread
              </TabsTrigger>
              <TabsTrigger value="groups" className="flex-1">
                Groups
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="h-[calc(100vh-12rem)] overflow-y-auto">
            <div className="p-2">
              {filteredConversations.map((conversation) => (
                <button
                  key={conversation.id}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-accent",
                    activeConversation.id === conversation.id && "bg-accent",
                  )}
                  onClick={() => setActiveConversation(conversation)}
                >
                  <div className="relative">
                    {conversation.isGroup ? (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                        {conversation.name
                          .split(" ")
                          .map((word) => word[0])
                          .join("")
                          .slice(0, 2)}
                      </div>
                    ) : (
                      <Avatar>
                        <AvatarImage src={conversation.avatar || "/user-2.png"} alt={conversation.name} />
                        <AvatarFallback>
                          {conversation.name
                            .split(" ")
                            .map((word) => word[0])
                            .join("")
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    {conversation.online && (
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-green-500" />
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{conversation.name}</span>
                      <span className="text-xs text-muted-foreground">{conversation.timestamp}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="truncate text-sm text-muted-foreground">{conversation.lastMessage}</p>
                      {conversation.unread > 0 && (
                        <Badge variant="default" className="ml-auto">
                          {conversation.unread}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main chat area */}
        <div className="flex flex-1 flex-col">
          {/* Chat header */}
          <div className="flex h-16 items-center justify-between border-b px-2 lg:px-4">
            <div className="flex items-center gap-3">
              {activeConversation.isGroup ? (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  {activeConversation.name
                    .split(" ")
                    .map((word) => word[0])
                    .join("")
                    .slice(0, 2)}
                </div>
              ) : (
                <Avatar>
                  <AvatarImage src={activeConversation.avatar || "/user-2.png"} alt={activeConversation.name} />
                  <AvatarFallback>
                    {activeConversation.name
                      .split(" ")
                      .map((word) => word[0])
                      .join("")
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="py-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-sm lg:text-base">{activeConversation.name}</h3>
                  {activeConversation.online && <span className="text-xs text-green-500">Online</span>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {activeConversation.isGroup ? `${activeConversation.members} members` : activeConversation.role}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="max-md:hidden">
                      <Phone className="h-5 w-5" />
                      <span className="sr-only">Voice call</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Voice call</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="max-md:hidden">
                      <Video className="h-5 w-5" />
                      <span className="sr-only">Video call</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Video call</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="max-md:hidden">
                      <Info className="h-5 w-5" />
                      <span className="sr-only">Conversation info</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Conversation info</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="max-md:hidden">
                      <MoreVertical className="h-5 w-5" />
                      <span className="sr-only">More options</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>More options</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {/* Messages */}
          <div className="grow overflow-y-auto md:p-4 max-md:py-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={cn("flex", message.isSender ? "justify-end" : "justify-start")}>
                  <div className="flex items-end gap-2">
                    {!message.isSender && (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={activeConversation.avatar || "/user-2.png"} alt={message.sender} />
                        <AvatarFallback>
                          {message.sender
                            .split(" ")
                            .map((word) => word[0])
                            .join("")
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={cn(
                        "max-w-md rounded-lg px-4 py-2",
                        message.isSender ? "bg-primary text-primary-foreground" : "bg-muted",
                      )}
                    >
                      <p className="text-sm lg:text-base">{message.content}</p>
                      <div
                        className={cn(
                          "mt-1 flex items-center justify-end gap-1 text-xs",
                          message.isSender ? "text-primary-foreground/70" : "text-muted-foreground",
                        )}
                      >
                        {message.timestamp}
                        {message.isSender && message.status === "read" && (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-3 w-3"
                          >
                            <path d="M18 6 7 17l-5-5" />
                            <path d="m22 10-7.5 7.5L13 16" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Message input */}
          <div className="border-t md:p-4 max-md:pt-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="shrink-0">
                <Paperclip className="h-5 w-5" />
                <span className="sr-only">Attach file</span>
              </Button>
              <div className="relative flex-1">
                <Input
                  placeholder="Type a message..."
                  className="min-h-10 pr-10"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <Button variant="ghost" size="icon" className="absolute bottom-0 right-0 top-0">
                  <Smile className="h-5 w-5" />
                  <span className="sr-only">Emoji</span>
                </Button>
              </div>
              <Button className="shrink-0" size="icon" onClick={handleSendMessage} disabled={!messageInput.trim()}>
                <Send className="h-5 w-5" />
                <span className="sr-only">Send</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
