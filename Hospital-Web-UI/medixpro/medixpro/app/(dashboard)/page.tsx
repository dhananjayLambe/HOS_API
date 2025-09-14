"use client";
import { CalendarDateRangePicker } from "@/components/date-range-picker";
import { Overview } from "@/components/overview";
import { RecentAppointments } from "@/components/recent-appointments";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Ban, Calendar, CheckCircle2, ChevronRight, Clock, DollarSign, Download, Filter, UserRound, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
const unread = [
  {
    icon: <AlertCircle className="h-4 w-4 text-red-500" />,
    title: "Urgent: Low medication stock",
    message: "Amoxicillin stock is critically low. Please reorder.",
    time: "10 minutes ago",
  },
  {
    icon: <Calendar className="h-4 w-4 text-blue-500" />,
    title: "New appointment request",
    message: "Patient James Wilson requested an appointment for tomorrow.",
    time: "30 minutes ago",
  },
  {
    icon: <UserRound className="h-4 w-4 text-green-500" />,
    title: "New patient registration",
    message: "Emily Parker has registered as a new patient.",
    time: "1 hour ago",
  },
  {
    icon: <Clock className="h-4 w-4 text-orange-500" />,
    title: "Staff schedule update",
    message: "Dr. Rodriguez has requested time off next week.",
    time: "2 hours ago",
  },
  {
    icon: <DollarSign className="h-4 w-4 text-purple-500" />,
    title: "Payment received",
    message: "Insurance payment of $1,250 received for patient #12345.",
    time: "3 hours ago",
  },
];
const today = [
  {
    icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
    title: "Appointment confirmed",
    message: "Dr. Chen confirmed appointment with patient #23456.",
    time: "4 hours ago",
  },
  {
    icon: <Users className="h-4 w-4 text-blue-500" />,
    title: "Staff meeting reminder",
    message: "Weekly staff meeting today at 3:00 PM in Conference Room A.",
    time: "5 hours ago",
  },
  {
    icon: <Calendar className="h-4 w-4 text-purple-500" />,
    title: "Schedule change",
    message: "Your 2:00 PM appointment has been rescheduled to 3:30 PM.",
    time: "6 hours ago",
  },
  {
    icon: <DollarSign className="h-4 w-4 text-green-500" />,
    title: "Invoice paid",
    message: "Patient Maria Garcia has paid invoice #INV-2023-0456.",
    time: "8 hours ago",
  },
];
const earlier = [
  {
    icon: <Ban className="h-4 w-4 text-red-500" />,
    title: "Appointment cancelled",
    message: "Patient Thomas Brown cancelled his appointment for yesterday.",
    time: "Yesterday",
  },
  {
    icon: <AlertCircle className="h-4 w-4 text-orange-500" />,
    title: "System maintenance",
    message: "Scheduled system maintenance completed successfully.",
    time: "Yesterday",
  },
  {
    icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
    title: "Lab results ready",
    message: "Lab results for patient #34567 are now available.",
    time: "2 days ago",
  },
  {
    icon: <Users className="h-4 w-4 text-blue-500" />,
    title: "New staff onboarding",
    message: "Please welcome Dr. Lisa Wong to the Pediatrics department.",
    time: "3 days ago",
  },
];
const categories = [
  {
    category: "Appointments",
    description: "New, cancelled, and rescheduled appointments",
    enabled: true,
  },
  {
    category: "Patient Updates",
    description: "New registrations and patient status changes",
    enabled: true,
  },
  {
    category: "Staff Alerts",
    description: "Schedule changes and staff announcements",
    enabled: true,
  },
  { category: "Inventory Alerts", description: "Low stock and reorder notifications", enabled: true },
];
const deliveryMethods = [
  {
    method: "In-app Notifications",
    description: "Receive notifications within the dashboard",
    enabled: true,
  },
  { method: "Email Notifications", description: "Receive notifications via email", enabled: true },
  {
    method: "SMS Notifications",
    description: "Receive notifications via text message",
    enabled: false,
  },
  {
    method: "Push Notifications",
    description: "Receive notifications on your mobile device",
    enabled: false,
  },
];
const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
// Patient demographics data
const demographicsData = [
  { ageGroup: "0-17", male: 120, female: 140 },
  { ageGroup: "18-24", male: 150, female: 170 },
  { ageGroup: "25-34", male: 210, female: 280 },
  { ageGroup: "35-44", male: 190, female: 230 },
  { ageGroup: "45-54", male: 160, female: 180 },
  { ageGroup: "55-64", male: 140, female: 150 },
  { ageGroup: "65+", male: 110, female: 130 },
];

// Appointment types data
const appointmentTypesData = [
  { name: "Check-up", value: 35 },
  { name: "Consultation", value: 25 },
  { name: "Follow-up", value: 20 },
  { name: "Procedure", value: 10 },
  { name: "Emergency", value: 5 },
  { name: "Other", value: 5 },
];

// Revenue by department data
const revenueDepartmentsData = [
  { name: "Cardiology", revenue: 12500 },
  { name: "Orthopedics", revenue: 10800 },
  { name: "Pediatrics", revenue: 8500 },
  { name: "Neurology", revenue: 7200 },
  { name: "Dermatology", revenue: 6300 },
  { name: "Oncology", revenue: 5900 },
];
export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-5 overflow-x-hidden">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">Dashboard</h2>
          <p className="text-muted-foreground">Welcome back, Dr. Johnson! Here's what's happening today.</p>
        </div>
        <div className="flex items-center flex-wrap gap-2">
          <CalendarDateRangePicker />
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Revenue */}
        <Card className="border bg-white dark:bg-background shadow-sm hover:shadow-md transition">
          <CardHeader className="flex flex-col items-start gap-1">
            <DollarSign className="h-6 w-6 text-green-600" />
            <CardTitle className="text-base font-semibold text-foreground">Total Revenue</CardTitle>
            <p className="text-muted-foreground text-sm">
              <span className="text-green-600">+20.1%</span> from last month
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 mt-2 !pt-0">
            <h3 className="text-4xl font-bold">$45,231.89</h3>
          </CardContent>
        </Card>

        {/* Card 2: Appointments */}
        <Card className="border bg-white dark:bg-background shadow-sm hover:shadow-md transition">
          <CardHeader className="flex flex-col items-start gap-1">
            <Calendar className="h-6 w-6 text-blue-500" />
            <CardTitle className="text-base font-semibold text-foreground">Appointments</CardTitle>
            <p className="text-muted-foreground text-sm">
              <span className="text-blue-600">+10.1%</span> from last month
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 mt-2 !pt-0">
            <h3 className="text-4xl font-bold">+2,350</h3>
          </CardContent>
        </Card>

        {/* Card 3: Patients */}
        <Card className="border bg-white dark:bg-background shadow-sm hover:shadow-md transition">
          <CardHeader className="flex flex-col items-start gap-1">
            <UserRound className="h-6 w-6 text-amber-500" />
            <CardTitle className="text-base font-semibold text-foreground">Patients</CardTitle>
            <p className="text-muted-foreground text-sm">
              <span className="text-amber-600">+19%</span> from last month
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 mt-2 !pt-0">
            <h3 className="text-4xl font-bold">+12,234</h3>
          </CardContent>
        </Card>

        {/* Card 4: Staff */}
        <Card className="border bg-white dark:bg-background shadow-sm hover:shadow-md transition">
          <CardHeader className="flex flex-col items-start gap-1">
            <Users className="h-6 w-6 text-purple-500" />
            <CardTitle className="text-base font-semibold text-foreground">Staff</CardTitle>
            <p className="text-muted-foreground text-sm">
              <span className="text-purple-600">+4</span> new this month
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 mt-2 !pt-0">
            <h3 className="text-4xl font-bold">+573</h3>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="max-md:space-y-4 md:grid md:gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="lg:col-span-4">
              <CardHeader>
                <CardTitle>Overview</CardTitle>
                <CardDescription>Patient visits and revenue for the current period.</CardDescription>
              </CardHeader>
              <CardContent>
                <Overview />
              </CardContent>
            </Card>
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Recent Appointments</CardTitle>
                <CardDescription>You have {12} appointments today.</CardDescription>
              </CardHeader>
              <CardContent>
                <RecentAppointments />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-xl font-semibold">Detailed Analytics</h2>
              <p className="text-sm text-muted-foreground">Insights and trends from your clinic data</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Patient Demographics</CardTitle>
                <CardDescription>Age and gender distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={demographicsData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="ageGroup" />
                      <YAxis />
                      <Tooltip
                        formatter={(value, name) => {
                          return [value, name === "male" ? "Male" : "Female"];
                        }}
                      />
                      <Legend />
                      <Bar dataKey="male" fill="#2563eb" name="Male" />
                      <Bar dataKey="female" fill="#ec4899" name="Female" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Appointment Types</CardTitle>
                <CardDescription>Distribution by service category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={appointmentTypesData} cx="50%" cy="50%" labelLine={false} outerRadius={80} fill="#8884d8" dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {appointmentTypesData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [value, name]} />
                      {/* <Legend /> */}
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Sources</CardTitle>
                <CardDescription>Breakdown by department</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={revenueDepartmentsData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} />
                      <Tooltip formatter={(value) => [`$${value}`, "Revenue"]} />
                      <Bar dataKey="revenue" fill="#10b981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Patient Satisfaction</CardTitle>
                <CardDescription>Based on feedback surveys</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="space-y-1 w-full flex justify-between mb-2">
                      <p className="text-sm font-medium">Overall Experience</p>
                      <span className="text-sm font-medium">87%</span>
                    </div>
                    <Progress value={87} className="h-2 [&>*]:bg-green-500" />
                  </div>
                  <div>
                    <div className="space-y-1 w-full flex justify-between mb-2">
                      <p className="text-sm font-medium">Wait Times</p>
                      <span className="text-sm font-medium">72%</span>
                    </div>
                    <Progress value={72} className="h-2 [&>*]:bg-green-500" />
                  </div>
                  <div>
                    <div className="space-y-1 w-full flex justify-between mb-2">
                      <p className="text-sm font-medium">Staff Friendliness</p>
                      <span className="text-sm font-medium">94%</span>
                    </div>
                    <Progress value={94} className="h-2 [&>*]:bg-green-500" />
                  </div>
                  <div>
                    <div className="space-y-1 w-full flex justify-between mb-2">
                      <p className="text-sm font-medium">Treatment Effectiveness</p>
                      <span className="text-sm font-medium">89%</span>
                    </div>
                    <Progress value={89} className="h-2 [&>*]:bg-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Staff Performance</CardTitle>
                <CardDescription>Top performing staff members</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { name: "Dr. Sarah Chen", role: "Cardiologist", patients: 42, rating: 4.9 },
                    { name: "Dr. Michael Rodriguez", role: "Pediatrician", patients: 38, rating: 4.8 },
                    { name: "Dr. Emily Johnson", role: "Neurologist", patients: 35, rating: 4.7 },
                    { name: "Nurse Robert Kim", role: "Head Nurse", patients: 56, rating: 4.9 },
                  ].map((staff, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {staff.name
                              .split(" ")
                              .map((n, i, arr) => (i === 1 ? n[0] : ""))
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{staff.name}</p>
                          <p className="text-xs text-muted-foreground">{staff.role}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{staff.patients} patients</p>
                        <p className="text-xs text-muted-foreground">Rating: {staff.rating}/5</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-xl font-semibold mb-2">Available Reports</h2>
              <p className="text-sm text-muted-foreground">Access and generate detailed reports</p>
            </div>
            <Button>
              <Download className="mr-2 h-4 w-4" />
              Generate New Report
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Financial Reports</CardTitle>
                <CardDescription>Revenue, expenses, and billing</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {[
                    { name: "Monthly Revenue Summary", updated: "Today" },
                    { name: "Quarterly Financial Analysis", updated: "Last week" },
                    { name: "Insurance Claims Report", updated: "2 days ago" },
                    { name: "Outstanding Payments", updated: "Yesterday" },
                  ].map((report, i) => (
                    <li key={i} className="flex items-center justify-between py-1 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{report.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Updated: {report.updated}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
                <Button variant="link" href="/reports/appointments" className="mt-2 px-0">
                  View all financial reports
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Patient Reports</CardTitle>
                <CardDescription>Demographics and visit analytics</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {[
                    { name: "New Patient Registrations", updated: "Today" },
                    { name: "Patient Demographics", updated: "3 days ago" },
                    { name: "Visit Frequency Analysis", updated: "Last week" },
                    { name: "Treatment Outcomes", updated: "Yesterday" },
                  ].map((report, i) => (
                    <li key={i} className="flex items-center justify-between py-1 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <UserRound className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{report.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Updated: {report.updated}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
                <Button variant="link" href="/reports/patients" className="mt-2 px-0">
                  View all patient reports
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Operational Reports</CardTitle>
                <CardDescription>Staff, inventory, and efficiency</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {[
                    { name: "Staff Performance Metrics", updated: "Yesterday" },
                    { name: "Inventory Status", updated: "Today" },
                    { name: "Room Utilization", updated: "2 days ago" },
                    { name: "Wait Time Analysis", updated: "Last week" },
                  ].map((report, i) => (
                    <li key={i} className="flex items-center justify-between py-1 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{report.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Updated: {report.updated}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
                <Button variant="link" href="/reports/inventory" className="mt-2 px-0">
                  View all operational reports
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Report Activity</CardTitle>
              <CardDescription>Reports generated or viewed recently</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { user: "Dr. Johnson", report: "Monthly Revenue Summary", time: "2 hours ago", action: "Generated" },
                  {
                    user: "Admin Sarah",
                    report: "Staff Performance Metrics",
                    time: "Yesterday, 4:30 PM",
                    action: "Viewed",
                  },
                  {
                    user: "Dr. Rodriguez",
                    report: "Patient Demographics",
                    time: "Yesterday, 2:15 PM",
                    action: "Generated",
                  },
                  { user: "Nurse Kim", report: "Inventory Status", time: "2 days ago", action: "Viewed" },
                  { user: "Dr. Chen", report: "Treatment Outcomes", time: "3 days ago", action: "Generated" },
                ].map((activity, i) => (
                  <div key={i} className="flex items-center justify-between flex-wrap gap-2 border-b pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{activity.user.split(" ")[1]?.[0] || activity.user[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium mb-1 line-clamp-2">
                          {activity.user} {activity.action.toLowerCase()} <span className="font-semibold">{activity.report}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">{activity.time}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-xl font-semibold mb-2">Notifications</h2>
              <p className="text-sm text-muted-foreground">Stay updated with important alerts and messages</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                Mark All as Read
              </Button>
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle>Unread</CardTitle>
                  <Badge>12</Badge>
                </div>
              </CardHeader>
              <CardContent className="max-h-[400px] overflow-auto">
                <div className="space-y-4">
                  {unread.map((notification, i) => (
                    <div key={i} className="flex gap-3 border-b pb-3 last:border-0 last:pb-0">
                      <div className="mt-0.5">{notification.icon}</div>
                      <div>
                        <p className="text-sm font-medium mb-1 line-clamp-1">{notification.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{notification.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">{notification.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle>Today</CardTitle>
                  <Badge variant="outline">8</Badge>
                </div>
              </CardHeader>
              <CardContent className="max-h-[400px] overflow-auto">
                <div className="space-y-4">
                  {today.map((notification, i) => (
                    <div key={i} className="flex gap-3 border-b pb-3 last:border-0 last:pb-0">
                      <div className="mt-0.5">{notification.icon}</div>
                      <div>
                        <p className="text-sm font-medium mb-1">{notification.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{notification.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">{notification.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle>Earlier</CardTitle>
                  <Badge variant="outline">15</Badge>
                </div>
              </CardHeader>
              <CardContent className="max-h-[400px] overflow-auto">
                <div className="space-y-4">
                  {earlier.map((notification, i) => (
                    <div key={i} className="flex gap-3 border-b pb-3 last:border-0 last:pb-0">
                      <div className="mt-0.5">{notification.icon}</div>
                      <div>
                        <p className="text-sm font-medium mb-1">{notification.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{notification.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">{notification.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Manage how you receive notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Notification Categories</h3>
                  {categories.map((setting, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium mb-1">{setting.category}</p>
                        <p className="text-xs text-muted-foreground">{setting.description}</p>
                      </div>
                      <Switch defaultChecked={setting.enabled} />
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Delivery Methods</h3>
                  {deliveryMethods.map((setting, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium mb-1">{setting.method}</p>
                        <p className="text-xs text-muted-foreground">{setting.description}</p>
                      </div>
                      <Switch defaultChecked={setting.enabled} />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
