"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Settings } from "lucide-react"

interface SimpleHeaderProps {
  name: string
  specialization: string
  profilePhoto?: string
  isVerified: boolean
}

export function SimpleHeader({ name, specialization, profilePhoto, isVerified }: SimpleHeaderProps) {
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
    : "DR"

  return (
    <header className="border-b border-border bg-card">
      <div className="flex items-center justify-between p-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-primary/20">
            <AvatarImage src={profilePhoto || "/placeholder.svg"} alt={name} />
            <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">{initials}</AvatarFallback>
          </Avatar>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">Dr. {name}</h1>
              {isVerified && (
                <Badge variant="default" className="gap-1 bg-success text-success-foreground">
                  <CheckCircle2 className="h-3 w-3" />
                  Verified
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{specialization}</p>
          </div>
        </div>

        <Button variant="outline" size="sm">
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </Button>
      </div>
    </header>
  )
}
