"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { CheckCircle2, Upload, Eye } from "lucide-react"

interface ProfileHeaderProps {
  name: string
  specialization: string
  profilePhoto?: string
  profileProgress: number
  isVerified: boolean
  badges: string[]
}

export function ProfileHeader({
  name,
  specialization,
  profilePhoto,
  profileProgress,
  isVerified,
  badges,
}: ProfileHeaderProps) {
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
    : "DR"

  return (
    <div className="border-b border-border bg-card">
      <div className="container mx-auto px-6 py-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-6">
            <Avatar className="h-24 w-24 border-2 border-primary/20">
              <AvatarImage src={profilePhoto || "/placeholder.svg"} alt={name} />
              <AvatarFallback className="bg-primary/10 text-2xl font-semibold text-primary">{initials}</AvatarFallback>
            </Avatar>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Dr. {name}</h1>
                {isVerified && (
                  <Badge variant="default" className="gap-1 bg-success text-success-foreground">
                    <CheckCircle2 className="h-3 w-3" />
                    Verified
                  </Badge>
                )}
              </div>

              <p className="text-lg text-muted-foreground">{specialization}</p>

              <div className="flex flex-wrap gap-2 mt-2">
                {badges.map((badge, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {badge}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" size="sm">
              <Eye className="mr-2 h-4 w-4" />
              View Public Profile
            </Button>
            <Button size="sm">
              <Upload className="mr-2 h-4 w-4" />
              Update Photo
            </Button>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">Profile Completion</span>
            <span className="text-muted-foreground">{profileProgress}%</span>
          </div>
          <Progress value={profileProgress} className="h-2" />
        </div>
      </div>
    </div>
  )
}
