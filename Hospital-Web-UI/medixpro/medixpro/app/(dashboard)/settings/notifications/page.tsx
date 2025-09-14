"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  ArrowLeft,
  Bell,
  Mail,
  MessageSquare,
  Calendar,
  Clock,
  Save,
  Plus,
  Edit,
  Trash,
  Download,
  Upload,
  RefreshCcw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Send,
  Copy,
  Eye,
  MoreHorizontal,
} from "lucide-react"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

export default function NotificationsPage() {
  // Mock data for notification templates
  const emailTemplates = [
    {
      id: 1,
      name: "Appointment Confirmation",
      subject: "Your appointment has been confirmed",
      type: "Email",
      lastUpdated: "2023-11-15",
      status: "Active",
    },
    {
      id: 2,
      name: "Appointment Reminder",
      subject: "Reminder: Your appointment is tomorrow",
      type: "Email",
      lastUpdated: "2023-10-22",
      status: "Active",
    },
    {
      id: 3,
      name: "Prescription Ready",
      subject: "Your prescription is ready for pickup",
      type: "Email",
      lastUpdated: "2023-09-30",
      status: "Active",
    },
    {
      id: 4,
      name: "Lab Results Available",
      subject: "Your lab results are now available",
      type: "Email",
      lastUpdated: "2023-10-05",
      status: "Active",
    },
    {
      id: 5,
      name: "Payment Receipt",
      subject: "Receipt for your recent payment",
      type: "Email",
      lastUpdated: "2023-11-02",
      status: "Active",
    },
    {
      id: 6,
      name: "Password Reset",
      subject: "Reset your password",
      type: "Email",
      lastUpdated: "2023-10-18",
      status: "Active",
    },
  ]

  const smsTemplates = [
    {
      id: 1,
      name: "Appointment Reminder",
      content:
        "Reminder: You have an appointment at MedixPro Clinic tomorrow at {time}. Reply Y to confirm or call {phone} to reschedule.",
      type: "SMS",
      lastUpdated: "2023-11-15",
      status: "Active",
    },
    {
      id: 2,
      name: "Prescription Ready",
      content: "Your prescription is ready for pickup at MedixPro Pharmacy. We're open until {closing_time} today.",
      type: "SMS",
      lastUpdated: "2023-10-22",
      status: "Active",
    },
    {
      id: 3,
      name: "Appointment Confirmation",
      content: "Your appointment with Dr. {doctor_name} has been confirmed for {date} at {time}.",
      type: "SMS",
      lastUpdated: "2023-09-30",
      status: "Active",
    },
    {
      id: 4,
      name: "Payment Reminder",
      content:
        "Reminder: Your payment of ${amount} is due on {due_date}. Please visit our website or call {phone} for assistance.",
      type: "SMS",
      lastUpdated: "2023-10-05",
      status: "Inactive",
    },
  ]

  const scheduledNotifications = [
    {
      id: 1,
      name: "Weekly Appointment Reminders",
      type: "Email",
      schedule: "Every Monday at 9:00 AM",
      lastRun: "2023-11-20",
      nextRun: "2023-11-27",
      status: "Active",
    },
    {
      id: 2,
      name: "Daily Prescription Notifications",
      type: "SMS",
      schedule: "Daily at 10:00 AM",
      lastRun: "2023-11-21",
      nextRun: "2023-11-22",
      status: "Active",
    },
    {
      id: 3,
      name: "Monthly Payment Reminders",
      type: "Email",
      schedule: "1st of every month",
      lastRun: "2023-11-01",
      nextRun: "2023-12-01",
      status: "Active",
    },
    {
      id: 4,
      name: "Quarterly Newsletter",
      type: "Email",
      schedule: "First day of each quarter",
      lastRun: "2023-10-01",
      nextRun: "2024-01-01",
      status: "Inactive",
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="outline" size="icon" asChild className="h-8 w-8">
          <Link href="/settings">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Notification Settings</h1>
          <p className="text-sm text-muted-foreground">Configure email, SMS, and in-app notifications</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-background">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm xl:text-lg font-medium">Email Templates</CardTitle>
            <Mail className="size-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <h2 className="text-2xl xl:text-4xl mb-2 font-bold">{emailTemplates.length}</h2>
            <p className="text-xs text-muted-foreground">
              {emailTemplates.filter((t) => t.status === "Active").length} active templates
            </p>
          </CardContent>
        </Card>
        <Card className="bg-background">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm xl:text-lg font-medium">SMS Templates</CardTitle>
            <MessageSquare className="size-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <h2 className="text-2xl xl:text-4xl mb-2 font-bold">{smsTemplates.length}</h2>
            <p className="text-xs text-muted-foreground">
              {smsTemplates.filter((t) => t.status === "Active").length} active templates
            </p>
          </CardContent>
        </Card>
        <Card className="bg-background">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm xl:text-lg font-medium">Scheduled Notifications</CardTitle>
            <Calendar className="size-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <h2 className="text-2xl xl:text-4xl mb-2 font-bold">{scheduledNotifications.length}</h2>
            <p className="text-xs text-muted-foreground">
              Next:{" "}
              {
                scheduledNotifications.sort((a, b) => new Date(a.nextRun).getTime() - new Date(b.nextRun).getTime())[0]
                  ?.nextRun
              }
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="settings" className="w-full">
        <TabsList>
          <TabsTrigger value="settings">General Settings</TabsTrigger>
          <TabsTrigger value="email">Email Templates</TabsTrigger>
          <TabsTrigger value="sms">SMS Templates</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled Notifications</TabsTrigger>
        </TabsList>

        {/* General Settings Tab */}
        <TabsContent value="settings" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="mr-2 h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>Configure when and how notifications are sent</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Email Notifications</h3>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="email-appointments">Appointment Reminders</Label>
                      <p className="text-xs text-muted-foreground">Send email reminders for upcoming appointments</p>
                    </div>
                    <Switch id="email-appointments" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="email-prescriptions">Prescription Notifications</Label>
                      <p className="text-xs text-muted-foreground">Send emails when prescriptions are ready</p>
                    </div>
                    <Switch id="email-prescriptions" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="email-lab">Lab Results</Label>
                      <p className="text-xs text-muted-foreground">Send emails when lab results are available</p>
                    </div>
                    <Switch id="email-lab" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="email-billing">Billing & Payments</Label>
                      <p className="text-xs text-muted-foreground">Send emails for invoices and payment receipts</p>
                    </div>
                    <Switch id="email-billing" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="email-newsletter">Newsletter & Updates</Label>
                      <p className="text-xs text-muted-foreground">Send periodic newsletters and clinic updates</p>
                    </div>
                    <Switch id="email-newsletter" />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">SMS Notifications</h3>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="sms-appointments">Appointment Reminders</Label>
                      <p className="text-xs text-muted-foreground">Send SMS reminders for upcoming appointments</p>
                    </div>
                    <Switch id="sms-appointments" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="sms-prescriptions">Prescription Notifications</Label>
                      <p className="text-xs text-muted-foreground">Send SMS when prescriptions are ready</p>
                    </div>
                    <Switch id="sms-prescriptions" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="sms-billing">Payment Reminders</Label>
                      <p className="text-xs text-muted-foreground">Send SMS for payment due dates</p>
                    </div>
                    <Switch id="sms-billing" />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">In-App Notifications</h3>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="app-appointments">Appointment Updates</Label>
                      <p className="text-xs text-muted-foreground">Show notifications for appointment changes</p>
                    </div>
                    <Switch id="app-appointments" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="app-messages">New Messages</Label>
                      <p className="text-xs text-muted-foreground">Show notifications for new messages</p>
                    </div>
                    <Switch id="app-messages" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="app-system">System Alerts</Label>
                      <p className="text-xs text-muted-foreground">
                        Show notifications for system updates and maintenance
                      </p>
                    </div>
                    <Switch id="app-system" defaultChecked />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Notification Timing</h3>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="appointment-reminder-time">Appointment Reminder Time</Label>
                    <Select defaultValue="24h">
                      <SelectTrigger id="appointment-reminder-time">
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1h">1 hour before</SelectItem>
                        <SelectItem value="3h">3 hours before</SelectItem>
                        <SelectItem value="12h">12 hours before</SelectItem>
                        <SelectItem value="24h">24 hours before</SelectItem>
                        <SelectItem value="48h">48 hours before</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quiet-hours">Quiet Hours</Label>
                    <div className="flex items-center gap-2">
                      <Select defaultValue="22">
                        <SelectTrigger id="quiet-hours-start" className="w-full">
                          <SelectValue placeholder="Start time" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }).map((_, i) => (
                            <SelectItem key={i} value={i.toString()}>
                              {i === 0 ? "12 AM" : i < 12 ? `${i} AM` : i === 12 ? "12 PM" : `${i - 12} PM`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span>to</span>
                      <Select defaultValue="7">
                        <SelectTrigger id="quiet-hours-end" className="w-full">
                          <SelectValue placeholder="End time" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }).map((_, i) => (
                            <SelectItem key={i} value={i.toString()}>
                              {i === 0 ? "12 AM" : i < 12 ? `${i} AM` : i === 12 ? "12 PM" : `${i - 12} PM`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      SMS notifications will not be sent during quiet hours
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex sm:justify-end gap-2 flex-wrap">
                <Button variant="outline">Reset to Defaults</Button>
                <Button>
                  <Save className="mr-2 h-4 w-4" />
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Mail className="mr-2 h-5 w-5" />
                Email Configuration
              </CardTitle>
              <CardDescription>Configure email delivery settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="sender-name">Sender Name</Label>
                    <Input id="sender-name" defaultValue="MedixPro Clinic" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sender-email">Sender Email</Label>
                    <Input id="sender-email" defaultValue="notifications@medixpro-clinic.com" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reply-to">Reply-To Email</Label>
                  <Input id="reply-to" defaultValue="support@medixpro-clinic.com" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtp-provider">SMTP Provider</Label>
                  <Select defaultValue="sendgrid">
                    <SelectTrigger id="smtp-provider">
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sendgrid">SendGrid</SelectItem>
                      <SelectItem value="mailchimp">Mailchimp</SelectItem>
                      <SelectItem value="aws">Amazon SES</SelectItem>
                      <SelectItem value="custom">Custom SMTP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="api-key">API Key</Label>
                  <div className="flex items-center gap-2">
                    <Input id="api-key" type="password" value="••••••••••••••••••••••••••••••" readOnly />
                    <Button variant="outline" size="sm">
                      Show
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Email Testing</h3>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="test-email">Test Email Address</Label>
                    <Input id="test-email" placeholder="Enter email address" />
                  </div>
                  <div className="flex items-end">
                    <Button>
                      <Send className="mr-2 h-4 w-4" />
                      Send Test Email
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline">Cancel</Button>
                <Button>Save Configuration</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="mr-2 h-5 w-5" />
                SMS Configuration
              </CardTitle>
              <CardDescription>Configure SMS delivery settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sms-provider">SMS Provider</Label>
                  <Select defaultValue="twilio">
                    <SelectTrigger id="sms-provider">
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="twilio">Twilio</SelectItem>
                      <SelectItem value="nexmo">Nexmo</SelectItem>
                      <SelectItem value="aws">Amazon SNS</SelectItem>
                      <SelectItem value="custom">Custom Provider</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="account-sid">Account SID</Label>
                    <Input id="account-sid" type="password" value="••••••••••••••••••••••••••••••" readOnly />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="auth-token">Auth Token</Label>
                    <Input id="auth-token" type="password" value="••••••••••••••••••••••••••••••" readOnly />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sender-number">Sender Phone Number</Label>
                  <Input id="sender-number" defaultValue="+1 (555) 123-4567" />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">SMS Testing</h3>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="test-number">Test Phone Number</Label>
                    <Input id="test-number" placeholder="Enter phone number" />
                  </div>
                  <div className="flex items-end">
                    <Button >
                      <Send className="mr-2 h-4 w-4" />
                      Send Test SMS
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline">Cancel</Button>
                <Button>Save Configuration</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Templates Tab */}
        <TabsContent value="email" className="mt-4 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Input type="search" placeholder="Search templates..." className="w-[300px]" />
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Template
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-background">
                  <DialogHeader>
                    <DialogTitle>Create Email Template</DialogTitle>
                    <DialogDescription>Create a new email notification template</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="template-name">Template Name</Label>
                      <Input id="template-name" placeholder="Enter template name" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="template-subject">Email Subject</Label>
                      <Input id="template-subject" placeholder="Enter email subject" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="template-content">Email Content</Label>
                      <Textarea id="template-content" placeholder="Enter email content" className="min-h-[200px]" />
                      <p className="text-xs text-muted-foreground">
                        Use {"{variable}"} syntax for dynamic content. Available variables: {"{patient_name}"},{" "}
                        {"{doctor_name}"}, {"{appointment_date}"}, {"{appointment_time}"}, {"{clinic_name}"},{" "}
                        {"{clinic_address}"}, {"{clinic_phone}"}
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline">Cancel</Button>
                    <Button>Create Template</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Import
              </Button>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>

          <Card className="bg-background">
            <CardContent className="p-0">
              <Table className="whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead>Template Name</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead className="hidden md:table-cell">Last Updated</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="whitespace-nowrap">
                  {emailTemplates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">{template.name}</TableCell>
                      <TableCell>{template.subject}</TableCell>
                      <TableCell className="hidden md:table-cell">{template.lastUpdated}</TableCell>
                      <TableCell>
                        <Badge variant={template.status === "Active" ? "default" : "secondary"}>
                          {template.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-background">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" />
                              Preview
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Template
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Copy className="mr-2 h-4 w-4" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Send className="mr-2 h-4 w-4" />
                              Send Test
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              {template.status === "Active" ? (
                                <>
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              <Trash className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SMS Templates Tab */}
        <TabsContent value="sms" className="mt-4 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Input type="search" placeholder="Search templates..." className="w-[300px]" />
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Template
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-background">
                  <DialogHeader>
                    <DialogTitle>Create SMS Template</DialogTitle>
                    <DialogDescription>Create a new SMS notification template</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="sms-template-name">Template Name</Label>
                      <Input id="sms-template-name" placeholder="Enter template name" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="sms-template-content">SMS Content</Label>
                      <Textarea id="sms-template-content" placeholder="Enter SMS content" className="min-h-[100px]" />
                      <div className="flex justify-between">
                        <p className="text-xs text-muted-foreground">Use {"{variable}"} syntax for dynamic content</p>
                        <p className="text-xs">
                          <span className="text-muted-foreground">Character count:</span> 0/160
                        </p>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline">Cancel</Button>
                    <Button>Create Template</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Import
              </Button>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>

          <Card className="bg-background">
            <CardContent className="p-0">
              <Table className="whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead>Template Name</TableHead>
                    <TableHead>Content</TableHead>
                    <TableHead className="hidden md:table-cell">Last Updated</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="whitespace-nowrap">
                  {smsTemplates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">{template.name}</TableCell>
                      <TableCell className="max-w-xs truncate">{template.content}</TableCell>
                      <TableCell className="hidden md:table-cell">{template.lastUpdated}</TableCell>
                      <TableCell>
                        <Badge variant={template.status === "Active" ? "default" : "secondary"}>
                          {template.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-background">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" />
                              Preview
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Template
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Copy className="mr-2 h-4 w-4" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Send className="mr-2 h-4 w-4" />
                              Send Test
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              {template.status === "Active" ? (
                                <>
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              <Trash className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scheduled Notifications Tab */}
        <TabsContent value="scheduled" className="mt-4 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Input type="search" placeholder="Search scheduled notifications..." className="w-[300px]" />
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Schedule Notification
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-background">
                  <DialogHeader>
                    <DialogTitle>Schedule Notification</DialogTitle>
                    <DialogDescription>Create a new scheduled notification</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="schedule-name">Name</Label>
                      <Input id="schedule-name" placeholder="Enter schedule name" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="notification-type">Notification Type</Label>
                      <Select>
                        <SelectTrigger id="notification-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="sms">SMS</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="template">Template</Label>
                      <Select>
                        <SelectTrigger id="template">
                          <SelectValue placeholder="Select template" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="appointment">Appointment Reminder</SelectItem>
                          <SelectItem value="prescription">Prescription Ready</SelectItem>
                          <SelectItem value="payment">Payment Reminder</SelectItem>
                          <SelectItem value="newsletter">Monthly Newsletter</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="schedule-type">Schedule Type</Label>
                      <Select defaultValue="daily">
                        <SelectTrigger id="schedule-type">
                          <SelectValue placeholder="Select schedule type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="once">One-time</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="schedule-time">Time</Label>
                        <Select defaultValue="9">
                          <SelectTrigger id="schedule-time">
                            <SelectValue placeholder="Select time" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }).map((_, i) => (
                              <SelectItem key={i} value={i.toString()}>
                                {i === 0
                                  ? "12:00 AM"
                                  : i < 12
                                    ? `${i}:00 AM`
                                    : i === 12
                                      ? "12:00 PM"
                                      : `${i - 12}:00 PM`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="schedule-day">Day</Label>
                        <Select defaultValue="1">
                          <SelectTrigger id="schedule-day">
                            <SelectValue placeholder="Select day" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Monday</SelectItem>
                            <SelectItem value="2">Tuesday</SelectItem>
                            <SelectItem value="3">Wednesday</SelectItem>
                            <SelectItem value="4">Thursday</SelectItem>
                            <SelectItem value="5">Friday</SelectItem>
                            <SelectItem value="6">Saturday</SelectItem>
                            <SelectItem value="0">Sunday</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="active-schedule" defaultChecked />
                      <Label htmlFor="active-schedule">Active</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline">Cancel</Button>
                    <Button>Schedule</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button variant="outline">
                <RefreshCcw className="mr-2 h-4 w-4" />
                Run Now
              </Button>
            </div>
          </div>

          <Card className="bg-background">
            <CardContent className="p-0">
              <Table className="whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead className="hidden md:table-cell">Last Run</TableHead>
                    <TableHead className="hidden md:table-cell">Next Run</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="whitespace-nowrap">
                  {scheduledNotifications.map((notification) => (
                    <TableRow key={notification.id}>
                      <TableCell className="font-medium">{notification.name}</TableCell>
                      <TableCell>{notification.type}</TableCell>
                      <TableCell>{notification.schedule}</TableCell>
                      <TableCell className="hidden md:table-cell">{notification.lastRun}</TableCell>
                      <TableCell className="hidden md:table-cell">{notification.nextRun}</TableCell>
                      <TableCell>
                        <Badge variant={notification.status === "Active" ? "default" : "secondary"}>
                          {notification.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-background">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Schedule
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Clock className="mr-2 h-4 w-4" />
                              Run Now
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <AlertCircle className="mr-2 h-4 w-4" />
                              View Logs
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              {notification.status === "Active" ? (
                                <>
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Pause Schedule
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Resume Schedule
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              <Trash className="mr-2 h-4 w-4" />
                              Delete Schedule
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
