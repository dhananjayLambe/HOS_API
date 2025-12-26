"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle2, AlertCircle, Key, Smartphone, FileDown, Shield, Bell, UserPlus } from "lucide-react"

export function RecentActivityPanel() {
  const activities = [
    {
      icon: Key,
      title: "Password changed",
      description: "Changed from web browser (Chrome)",
      timestamp: "March 15, 2024 10:30 AM",
      type: "success",
    },
    {
      icon: Smartphone,
      title: "Login from new device",
      description: "MacBook Pro - New York, USA",
      timestamp: "March 14, 2024 3:45 PM",
      type: "warning",
    },
    {
      icon: CheckCircle2,
      title: "Profile updated",
      description: "Updated contact information",
      timestamp: "March 13, 2024 2:15 PM",
      type: "success",
    },
    {
      icon: Shield,
      title: "Security settings modified",
      description: "Enabled 2FA authentication",
      timestamp: "March 12, 2024 11:20 AM",
      type: "success",
    },
    {
      icon: FileDown,
      title: "Document downloaded",
      description: "Downloaded annual report",
      timestamp: "March 11, 2024 9:15 AM",
      type: "info",
    },
    {
      icon: AlertCircle,
      title: "Failed login attempt",
      description: "Invalid credentials from unknown IP",
      timestamp: "March 10, 2024 8:20 PM",
      type: "error",
    },
    {
      icon: Key,
      title: "Account recovery initiated",
      description: "Password reset requested",
      timestamp: "March 9, 2024 4:15 PM",
      type: "warning",
    },
    {
      icon: UserPlus,
      title: "New device registered",
      description: "iPhone 13 - New York, USA",
      timestamp: "March 8, 2024 1:30 PM",
      type: "info",
    },
    {
      icon: Bell,
      title: "Security alert",
      description: "Suspicious activity detected",
      timestamp: "March 7, 2024 10:45 AM",
      type: "error",
    },
  ]

  const getIconColor = (type: string) => {
    switch (type) {
      case "success":
        return "text-green-600 bg-green-50"
      case "warning":
        return "text-yellow-600 bg-yellow-50"
      case "error":
        return "text-red-600 bg-red-50"
      default:
        return "text-blue-600 bg-blue-50"
    }
  }

  return (
    <div className="rounded-lg border bg-white">
      <Tabs defaultValue="activity" className="w-full">
        <div className="border-b px-6">
          <TabsList className="h-auto w-full justify-start gap-6 rounded-none border-0 bg-transparent p-0">
            <TabsTrigger
              value="activity"
              className="rounded-none border-b-2 border-transparent px-0 pb-3 pt-4 data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              Activity
            </TabsTrigger>
            <TabsTrigger
              value="security"
              className="rounded-none border-b-2 border-transparent px-0 pb-3 pt-4 data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              Security
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="rounded-none border-b-2 border-transparent px-0 pb-3 pt-4 data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              Notifications
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="activity" className="mt-0">
          <div className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">Recent Activity</h3>
              <button className="text-sm text-primary hover:underline">View All</button>
            </div>

            <div className="space-y-4">
              {activities.map((activity, index) => {
                const Icon = activity.icon
                return (
                  <div key={index} className="flex gap-3">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${getIconColor(activity.type)}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">{activity.title}</p>
                      <p className="text-xs text-gray-600">{activity.description}</p>
                      <p className="text-xs text-gray-400">{activity.timestamp}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="security" className="mt-0">
          <div className="p-6">
            <div className="mb-4">
              <h3 className="font-semibold">Security Events</h3>
            </div>
            <div className="space-y-4">
              {activities
                .filter((a) => a.type === "error" || a.type === "warning" || a.title.toLowerCase().includes("security"))
                .map((activity, index) => {
                  const Icon = activity.icon
                  return (
                    <div key={index} className="flex gap-3">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${getIconColor(activity.type)}`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">{activity.title}</p>
                        <p className="text-xs text-gray-600">{activity.description}</p>
                        <p className="text-xs text-gray-400">{activity.timestamp}</p>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="mt-0">
          <div className="p-6">
            <div className="mb-4">
              <h3 className="font-semibold">Notifications</h3>
            </div>
            <div className="space-y-4 text-center text-sm text-gray-500">
              <Bell className="mx-auto h-12 w-12 text-gray-300" />
              <p>No new notifications</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
