"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarDateRangePicker as DateRangePicker } from "@/components/date-range-picker"
import { ArrowUpRightIcon, CalendarClockIcon, CheckCircle2Icon, Clock3Icon, CircleAlertIcon, TrendingUpIcon, UserCheck2Icon, UserRoundPlusIcon, UserRoundXIcon } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts"
import { Skeleton } from "@/components/ui/skeleton"

export default function AppointmentReportsPage() {
  const [dateRange, setDateRange] = useState<DateRangeOption>("last-7-days")
  const [doctor, setDoctor] = useState("dr-dhananjay-lambe")
  const [appointmentType, setAppointmentType] = useState<AppointmentTypeFilter>("all")
  const [status, setStatus] = useState<StatusFilter>("all")
  const [activeTab, setActiveTab] = useState("overview")
  const isLoading = false

  const filteredAppointments = useMemo(() => {
    return appointmentReportData.recentAppointments.filter((item) => {
      const doctorMatch = doctor === "dr-dhananjay-lambe" ? item.doctor === "Dr. Dhananjay Lambe" : true
      const typeMatch = appointmentType === "all" ? true : item.appointmentType.toLowerCase() === appointmentType
      const statusMatch = status === "all" ? true : normalizeStatus(item.status) === status
      return doctorMatch && typeMatch && statusMatch
    })
  }, [doctor, appointmentType, status])

  const hasFilteredData = filteredAppointments.length > 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Appointment Reports</h1>
        <p className="text-muted-foreground">Analyze OPD appointments, patient flow, and operational trends</p>
      </div>

      <div className="grid gap-2 lg:grid-cols-[180px_180px_180px_180px_auto]">
        <Select value={dateRange} onValueChange={(value) => setDateRange(value as DateRangeOption)}>
          <SelectTrigger className="h-9 w-full">
            <SelectValue placeholder="Date Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="yesterday">Yesterday</SelectItem>
            <SelectItem value="last-7-days">Last 7 Days</SelectItem>
            <SelectItem value="last-30-days">Last 30 Days</SelectItem>
            <SelectItem value="this-month">This Month</SelectItem>
            <SelectItem value="custom">Custom Range</SelectItem>
          </SelectContent>
        </Select>
        <Select value={doctor} onValueChange={setDoctor}>
          <SelectTrigger className="h-9 w-full">
            <SelectValue placeholder="Doctor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dr-dhananjay-lambe">Dr. Dhananjay Lambe</SelectItem>
          </SelectContent>
        </Select>
        <Select value={appointmentType} onValueChange={(value) => setAppointmentType(value as AppointmentTypeFilter)}>
          <SelectTrigger className="h-9 w-full">
            <SelectValue placeholder="Appointment Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="walk-in">Walk-In</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="follow-up">Follow-Up</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
          <SelectTrigger className="h-9 w-full">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="booked">Booked</SelectItem>
            <SelectItem value="checked-in">Checked-In</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="no-show">No-Show</SelectItem>
          </SelectContent>
        </Select>
        <div className="w-full lg:w-[250px]">
          {dateRange === "custom" ? <DateRangePicker /> : <div className="h-9 rounded-md border bg-background px-3 text-sm text-muted-foreground flex items-center">Using preset date range</div>}
        </div>
      </div>

      {isLoading ? (
        <KpiSkeletonGrid />
      ) : hasFilteredData ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {appointmentReportData.summary.map((metric) => (
            <Card key={metric.key}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
                {metric.icon === "calendar" && <CalendarClockIcon className="h-5 w-5 text-muted-foreground" />}
                {metric.icon === "check" && <CheckCircle2Icon className="h-5 w-5 text-muted-foreground" />}
                {metric.icon === "checkedin" && <UserCheck2Icon className="h-5 w-5 text-muted-foreground" />}
                {metric.icon === "noshow" && <Clock3Icon className="h-5 w-5 text-muted-foreground" />}
                {metric.icon === "cancelled" && <UserRoundXIcon className="h-5 w-5 text-muted-foreground" />}
                {metric.icon === "walkin" && <CalendarClockIcon className="h-5 w-5 text-muted-foreground" />}
                {metric.icon === "new" && <UserRoundPlusIcon className="h-5 w-5 text-muted-foreground" />}
                {metric.icon === "returning" && <UserCheck2Icon className="h-5 w-5 text-muted-foreground" />}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
                <p className="mt-1 text-xs text-muted-foreground">{metric.note}</p>
                <div className="mt-2 flex items-center gap-1 text-xs">
                  {metric.trendDirection === "up" ? <ArrowUpRightIcon className="h-3.5 w-3.5 text-teal-700" /> : <ArrowUpRightIcon className="h-3.5 w-3.5 rotate-90 text-amber-700" />}
                  <span className={metric.trendDirection === "up" ? "text-teal-800" : "text-amber-800"}>{metric.trendLabel}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyStateCard message="No appointment data available for the selected filters" />
      )}

      <div className="grid gap-3 rounded-lg border bg-card p-3 md:grid-cols-2 xl:grid-cols-4">
        {appointmentReportData.summaryStrip.map((item) => (
          <div key={item.label} className="rounded-md border bg-background px-3 py-2">
            <p className="text-[11px] text-muted-foreground">{item.label}</p>
            <p className="text-sm font-semibold">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-teal-200 bg-teal-50/70">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUpIcon className="h-4 w-4 text-teal-700" />
              <CardTitle className="text-base">Performing Well</CardTitle>
            </div>
            <CardDescription className="text-teal-800">Healthy operational signals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {appointmentReportData.performanceInsights.performingWell.map((item) => (
              <InsightRow key={item.text} tone="positive" text={item.text} value={item.value} badge={item.badge} />
            ))}
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/80">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CircleAlertIcon className="h-4 w-4 text-amber-600" />
              <CardTitle className="text-base">Needs Attention</CardTitle>
            </div>
            <CardDescription className="text-amber-700">Operational areas requiring monitoring</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {appointmentReportData.performanceInsights.needsAttention.map((item) => (
              <InsightRow key={item.text} tone="attention" text={item.text} value={item.value} badge={item.badge} />
            ))}
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="patient-flow">Patient Flow</TabsTrigger>
          <TabsTrigger value="doctor-load">Doctor Load</TabsTrigger>
        </TabsList>
        {activeTab === "overview" && (
          <TabsContent value="overview" className="space-y-4">
            {isLoading ? (
              <ChartSkeletonGrid />
            ) : hasFilteredData ? (
              <div className="grid gap-4 lg:grid-cols-2">
                <ChartCard title="Appointment Status Distribution" description="Completed, checked-in, cancelled and no-show ratios" heightClassName="h-[250px]">
                  <PieChart>
                    <Pie data={appointmentReportData.distributions.statusDistribution} dataKey="value" nameKey="name" innerRadius={50} outerRadius={78}>
                      {appointmentReportData.distributions.statusDistribution.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ChartCard>
                <ChartCard title="Appointment Volume by Type" description="Walk-In, Scheduled and Follow-Up counts" heightClassName="h-[250px]">
                  <BarChart layout="vertical" data={appointmentReportData.distributions.appointmentTypeVolume} margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={90} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3f7f95" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ChartCard>
                <ChartCard title="Walk-In vs Scheduled Ratio" description="Visit mix by appointment category" heightClassName="h-[250px]">
                  <PieChart>
                    <Pie data={appointmentReportData.patientFlow.visitMix} dataKey="value" nameKey="name" innerRadius={50} outerRadius={78}>
                      {appointmentReportData.patientFlow.visitMix.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ChartCard>
                <Card>
                  <CardHeader>
                    <CardTitle>New vs Returning Patients</CardTitle>
                    <CardDescription>Patient split for selected period</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 pt-2 sm:grid-cols-2">
                    <Card className="border-dashed">
                      <CardContent className="pt-4">
                        <p className="text-xs text-muted-foreground">New Patients</p>
                        <p className="text-2xl font-semibold">{appointmentReportData.patientFlow.patientSplit.new}</p>
                      </CardContent>
                    </Card>
                    <Card className="border-dashed">
                      <CardContent className="pt-4">
                        <p className="text-xs text-muted-foreground">Returning Patients</p>
                        <p className="text-2xl font-semibold">{appointmentReportData.patientFlow.patientSplit.returning}</p>
                      </CardContent>
                    </Card>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <EmptyStateCard message="No chart data available for the selected filters" />
            )}
          </TabsContent>
        )}

        {activeTab === "trends" && (
          <TabsContent value="trends" className="space-y-4">
            {isLoading ? (
              <ChartSkeletonGrid />
            ) : hasFilteredData ? (
              <div className="grid gap-4">
                <ChartCard title="Daily Appointment Trend" description="7-day OPD movement across key statuses" heightClassName="h-[260px]">
                  <LineChart data={appointmentReportData.trends.daily} margin={{ left: 5, right: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="total" stroke="#1d4e89" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="completed" stroke="#0f766e" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="cancelled" stroke="#b45309" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="noShow" stroke="#a16207" strokeWidth={2} dot={false} />
                  </LineChart>
                </ChartCard>
                <ChartCard title="Monthly Appointment Trend" description="Last 6 months appointment growth" heightClassName="h-[220px]">
                  <BarChart data={appointmentReportData.trends.monthly} margin={{ left: 5, right: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="appointments" fill="#3f7f95" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ChartCard>
              </div>
            ) : (
              <EmptyStateCard message="No trend data available for the selected filters" />
            )}
          </TabsContent>
        )}

        {activeTab === "patient-flow" && (
          <TabsContent value="patient-flow" className="space-y-4">
            {isLoading ? (
              <ChartSkeletonGrid />
            ) : hasFilteredData ? (
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-lg border bg-card p-3 text-sm text-muted-foreground lg:col-span-2">
                  OPD rush is highest during <span className="font-semibold text-foreground">10 AM - 11 AM</span>; returning patient share remains at{" "}
                  <span className="font-semibold text-foreground">78%</span> with walk-ins stable in morning sessions.
                </div>
                <ChartCard title="Peak Hours Analysis" description="Most crowded OPD slots for staffing decisions" heightClassName="h-[240px]">
                  <BarChart layout="vertical" data={appointmentReportData.patientFlow.peakHours} margin={{ left: 25, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="slot" width={90} />
                    <Tooltip />
                    <Bar dataKey="patients" fill="#2f7a74" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ChartCard>
                <ChartCard title="Visit Mix" description="Walk-In, Scheduled, Follow-Up ratio" heightClassName="h-[240px]">
                  <PieChart>
                    <Pie data={appointmentReportData.patientFlow.visitMix} dataKey="value" nameKey="name" innerRadius={48} outerRadius={76}>
                      {appointmentReportData.patientFlow.visitMix.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ChartCard>
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Patient Split</CardTitle>
                    <CardDescription>Retention pattern for OPD continuity planning</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 pt-2 sm:grid-cols-2">
                    <Card className="border-dashed">
                      <CardContent className="pt-4">
                        <p className="text-xs text-muted-foreground">New</p>
                        <p className="text-3xl font-bold">{appointmentReportData.patientFlow.patientSplit.new}</p>
                      </CardContent>
                    </Card>
                    <Card className="border-dashed">
                      <CardContent className="pt-4">
                        <p className="text-xs text-muted-foreground">Returning</p>
                        <p className="text-3xl font-bold">{appointmentReportData.patientFlow.patientSplit.returning}</p>
                      </CardContent>
                    </Card>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <EmptyStateCard message="No patient flow data available for the selected filters" />
            )}
          </TabsContent>
        )}

        {activeTab === "doctor-load" && (
          <TabsContent value="doctor-load">
            <Card>
              <CardHeader>
                <CardTitle>Doctor Performance</CardTitle>
                <CardDescription>Future-ready doctor workload structure</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <TableSkeleton />
                ) : appointmentReportData.doctorLoad.length === 0 ? (
                  <EmptyStateCard message="No doctor load data available for the selected filters" />
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                      Dr. Dhananjay Lambe handled 1,248 appointments during the selected period with an average OPD load of 41 patients/day.
                    </div>
                    <div className="overflow-auto">
                    <Table className="whitespace-nowrap">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Doctor</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-right">Completed</TableHead>
                          <TableHead className="text-right">Cancelled</TableHead>
                          <TableHead className="text-right">No-Show</TableHead>
                          <TableHead className="text-right">Avg/Day</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {appointmentReportData.doctorLoad.map((row) => (
                          <TableRow key={row.doctor}>
                            <TableCell className="font-medium">{row.doctor}</TableCell>
                            <TableCell className="text-right">{row.total}</TableCell>
                            <TableCell className="text-right">{row.completed}</TableCell>
                            <TableCell className="text-right">{row.cancelled}</TableCell>
                            <TableCell className="text-right">{row.noShow}</TableCell>
                            <TableCell className="text-right">{row.avgPerDay}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Recent Appointments</CardTitle>
          <CardDescription>Operational snapshot of the latest patient visits</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton />
          ) : filteredAppointments.length === 0 ? (
            <EmptyStateCard message="No recent appointments available for the selected filters" />
          ) : (
            <div className="overflow-auto">
              <Table className="whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Visit Type</TableHead>
                    <TableHead>Appointment Type</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAppointments.map((item) => (
                    <TableRow key={item.patient + item.time}>
                      <TableCell className="font-medium">{item.patient}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-medium">
                          {item.visitType}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.appointmentType}</TableCell>
                      <TableCell>{item.time}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusBadgeClass(item.status)}>
                          {item.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ChartCard({
  title,
  description,
  children,
  heightClassName = "h-[320px]",
}: {
  title: string
  description: string
  children: React.ReactElement
  heightClassName?: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className={`${heightClassName} w-full`}>
          <ResponsiveContainer width="100%" height="100%">
            {children}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

function InsightRow({
  text,
  value,
  badge,
  tone,
}: {
  text: string
  value?: string
  badge?: string
  tone: "positive" | "attention"
}) {
  return (
    <div className="flex items-start gap-2 rounded-md border bg-background/80 px-2.5 py-2">
      <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${tone === "positive" ? "bg-teal-600" : "bg-amber-600"}`} />
      <div className="flex-1 text-sm leading-5 text-foreground">{text}</div>
      {badge ? (
        <Badge variant="secondary" className={tone === "positive" ? "text-teal-800" : "text-amber-800"}>
          {badge}
        </Badge>
      ) : null}
      {value ? <span className={`text-xs font-semibold ${tone === "positive" ? "text-teal-800" : "text-amber-800"}`}>{value}</span> : null}
    </div>
  )
}

function EmptyStateCard({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-center">
        <div className="rounded-full bg-muted p-3">
          <CalendarClockIcon className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  )
}

function KpiSkeletonGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <Card key={index}>
          <CardHeader>
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-36" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ChartSkeletonGrid() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index}>
          <CardHeader className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-56" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, index) => (
        <Skeleton key={index} className="h-10 w-full" />
      ))}
    </div>
  )
}

function normalizeStatus(status: string): StatusFilter {
  return status.toLowerCase().replace(" ", "-") as StatusFilter
}

function statusBadgeClass(status: string) {
  if (status === "Completed") return "border-teal-500/50 bg-teal-500/10 text-teal-800"
  if (status === "Checked-In") return "border-sky-500/50 bg-sky-500/10 text-sky-800"
  if (status === "Cancelled") return "border-orange-500/50 bg-orange-500/10 text-orange-800"
  if (status === "No-Show") return "border-amber-500/50 bg-amber-500/10 text-amber-800"
  return "border-slate-400/60 bg-slate-500/10 text-slate-700"
}

type DateRangeOption = "today" | "yesterday" | "last-7-days" | "last-30-days" | "this-month" | "custom"
type AppointmentTypeFilter = "all" | "walk-in" | "scheduled" | "follow-up"
type StatusFilter = "all" | "booked" | "checked-in" | "completed" | "cancelled" | "no-show"

const appointmentReportData = {
  summary: [
    { key: "total", title: "Total Appointments", value: "1,248", note: "+12.5% compared to previous month", icon: "calendar", trendDirection: "up", trendLabel: "Up 6% vs previous week" },
    { key: "completed", title: "Completed Consultations", value: "876", note: "70.2% completion rate", icon: "check", trendDirection: "up", trendLabel: "Up 8% compared to previous week" },
    { key: "checkedin", title: "Checked-In Patients", value: "142", note: "Currently processed through OPD", icon: "checkedin", trendDirection: "up", trendLabel: "Steady check-in throughput" },
    { key: "noshow", title: "No-Shows", value: "85", note: "6.8% missed appointments", icon: "noshow", trendDirection: "down", trendLabel: "Down 2% improvement this week" },
    { key: "cancelled", title: "Cancelled Appointments", value: "187", note: "15% cancellation rate", icon: "cancelled", trendDirection: "down", trendLabel: "Slightly above clinic average" },
    { key: "walkin", title: "Walk-In Patients", value: "432", note: "34% of total appointments", icon: "walkin", trendDirection: "up", trendLabel: "Morning flow remains consistent" },
    { key: "new", title: "New Patients", value: "286", note: "22% first-time visitors", icon: "new", trendDirection: "up", trendLabel: "Up 4% vs previous period" },
    { key: "returning", title: "Returning Patients", value: "962", note: "78% repeat patients", icon: "returning", trendDirection: "up", trendLabel: "Retention remains strong" },
  ],
  summaryStrip: [
    { label: "Peak OPD Hour", value: "10 AM - 11 AM" },
    { label: "Best Attendance Day", value: "Monday" },
    { label: "Average Daily Footfall", value: "41 Patients" },
    { label: "Patient Retention", value: "78%" },
  ],
  performanceInsights: {
    performingWell: [
      { text: "Returning patient ratio remains strong at 78%", value: "78%", badge: "+8%" },
      { text: "Appointment completion rate improved compared to last week", badge: "Stable" },
      { text: "Walk-in patient flow remains consistent during morning OPD hours" },
      { text: "Average daily patient count increased compared to previous period", value: "41/day" },
    ],
    needsAttention: [
      { text: "Cancellation rate is slightly above operational average", value: "15%" },
      { text: "No-show appointments are higher during evening slots", value: "6.8%" },
      { text: "Peak load between 10 AM - 11 AM may require additional support staff", badge: "Peak slot" },
      { text: "Follow-up visit percentage decreased compared to last month", value: "-3%" },
    ],
  },
  distributions: {
    statusDistribution: [
      { name: "Completed", value: 70, color: "#0f766e" },
      { name: "Checked-In", value: 8, color: "#1d4e89" },
      { name: "Cancelled", value: 15, color: "#b45309" },
      { name: "No-Show", value: 7, color: "#a16207" },
    ],
    appointmentTypeVolume: [
      { name: "Walk-In", value: 432 },
      { name: "Scheduled", value: 610 },
      { name: "Follow-Up", value: 206 },
    ],
  },
  trends: {
    daily: [
      { day: "Mon", total: 168, completed: 121, cancelled: 25, noShow: 10 },
      { day: "Tue", total: 182, completed: 131, cancelled: 27, noShow: 12 },
      { day: "Wed", total: 174, completed: 124, cancelled: 26, noShow: 11 },
      { day: "Thu", total: 191, completed: 138, cancelled: 29, noShow: 9 },
      { day: "Fri", total: 205, completed: 149, cancelled: 31, noShow: 11 },
      { day: "Sat", total: 166, completed: 118, cancelled: 24, noShow: 10 },
      { day: "Sun", total: 162, completed: 115, cancelled: 25, noShow: 9 },
    ],
    monthly: [
      { month: "Jan", appointments: 1030 },
      { month: "Feb", appointments: 1088 },
      { month: "Mar", appointments: 1126 },
      { month: "Apr", appointments: 1172 },
      { month: "May", appointments: 1218 },
      { month: "Jun", appointments: 1248 },
    ],
  },
  patientFlow: {
    peakHours: [
      { slot: "9 AM - 10 AM", patients: 24 },
      { slot: "10 AM - 11 AM", patients: 31 },
      { slot: "11 AM - 12 PM", patients: 18 },
      { slot: "12 PM - 1 PM", patients: 14 },
      { slot: "5 PM - 6 PM", patients: 27 },
    ],
    visitMix: [
      { name: "Walk-In", value: 34, color: "#2f7a74" },
      { name: "Scheduled", value: 49, color: "#3f7f95" },
      { name: "Follow-Up", value: 17, color: "#64748b" },
    ],
    patientSplit: {
      new: 286,
      returning: 962,
    },
  },
  doctorLoad: [
    {
      doctor: "Dr. Dhananjay Lambe",
      total: 1248,
      completed: 876,
      cancelled: 187,
      noShow: 85,
      avgPerDay: 41,
    },
  ],
  recentAppointments: [
    { patient: "Rahul Patil", visitType: "New", appointmentType: "Walk-In", time: "9:30 AM", status: "Completed", doctor: "Dr. Dhananjay Lambe" },
    { patient: "Sneha Joshi", visitType: "Follow-Up", appointmentType: "Scheduled", time: "10:00 AM", status: "Checked-In", doctor: "Dr. Dhananjay Lambe" },
    { patient: "Amit Kulkarni", visitType: "Returning", appointmentType: "Walk-In", time: "10:30 AM", status: "Completed", doctor: "Dr. Dhananjay Lambe" },
    { patient: "Priya Shah", visitType: "New", appointmentType: "Scheduled", time: "11:00 AM", status: "Cancelled", doctor: "Dr. Dhananjay Lambe" },
    { patient: "Neha Desai", visitType: "Returning", appointmentType: "Follow-Up", time: "11:30 AM", status: "No-Show", doctor: "Dr. Dhananjay Lambe" },
  ],
}
