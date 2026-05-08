"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarDateRangePicker as DateRangePicker } from "@/components/date-range-picker"
import { ArrowUpRightIcon, CalendarClockIcon, CheckCircle2Icon, CircleAlertIcon, Clock3Icon, TrendingUpIcon, UserCheck2Icon, UserRoundPlusIcon, UserRoundXIcon } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Skeleton } from "@/components/ui/skeleton"
import axiosClient from "@/lib/axiosClient"
import type { DateRange } from "react-day-picker"

type DateRangeOption = "today" | "yesterday" | "last-7-days" | "last-30-days" | "this-month" | "custom"
type AppointmentTypeFilter = "all" | "walk_in" | "scheduled" | "follow_up"
type StatusFilter = "all" | "booked" | "checked_in" | "completed" | "cancelled" | "no_show"
type MetricTrend = "up" | "down" | "stable"

type Metric = { count: number; change_percentage: number; trend: MetricTrend }
type ReportResponse = {
  summary: {
    total_appointments: Metric
    completed: Metric
    checked_in: Metric
    cancelled: Metric
    no_show: Metric
    walk_in_patients: Metric
    new_patients: Metric
    returning_patients: Metric
  }
  operational_summary: {
    peak_opd_hour: string
    best_attendance_day: string
    average_daily_footfall: number
    patient_retention_percentage: number
  }
  performance_insights: {
    performing_well: { title: string; value: string; trend: string }[]
    needs_attention: { title: string; value: string; trend: string }[]
  }
  status_distribution: { status: string; count: number; percentage: number }[]
  appointment_type_distribution: { type: string; count: number; percentage: number }[]
  daily_trends: { date: string; total: number; completed: number; cancelled: number; no_show: number }[]
  monthly_trends: { month: string; appointments: number }[]
  peak_hours: { slot: string; count: number }[]
  patient_split: { new_patients: number; returning_patients: number; retention_percentage: number }
  doctor_load: { doctor_id: string; doctor_name: string; total: number; completed: number; cancelled: number; no_show: number; average_per_day: number }[]
  recent_appointments: { patient_name: string; visit_type: string; appointment_type: string; appointment_time: string; status: string }[]
}

export default function AppointmentReportsPage() {
  const [dateRange, setDateRange] = useState<DateRangeOption>("last-7-days")
  const [doctorId, setDoctorId] = useState("all")
  const [appointmentType, setAppointmentType] = useState<AppointmentTypeFilter>("all")
  const [status, setStatus] = useState<StatusFilter>("all")
  const [activeTab, setActiveTab] = useState("overview")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ReportResponse | null>(null)
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(undefined)

  useEffect(() => {
    const query = new URLSearchParams()
    const { start, end } = resolveDateRange(dateRange, customDateRange)
    query.set("start_date", start)
    query.set("end_date", end)
    if (doctorId !== "all") query.set("doctor_id", doctorId)
    if (appointmentType !== "all") query.set("appointment_type", appointmentType)
    if (status !== "all") query.set("status", status)

    let cancelled = false
    async function load() {
      setIsLoading(true)
      setError(null)
      try {
        const response = await axiosClient.get<ReportResponse>("/reports/appointments/summary/", {
          params: Object.fromEntries(query.entries()),
        })
        if (!cancelled) setData(response.data)
      } catch (err) {
        if (!cancelled) {
          const message = parseApiError(err)
          setError(message)
          setData(null)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [dateRange, doctorId, appointmentType, status, customDateRange])

  const ui = useMemo(() => normalizeForUi(data), [data])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Appointment Reports</h1>
        <p className="text-muted-foreground">Analyze OPD appointments, patient flow, and operational trends</p>
      </div>

      <div className="grid gap-2 lg:grid-cols-[180px_180px_180px_180px_auto]">
        <Select value={dateRange} onValueChange={(value) => setDateRange(value as DateRangeOption)}>
          <SelectTrigger className="h-9 w-full"><SelectValue placeholder="Date Range" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="yesterday">Yesterday</SelectItem>
            <SelectItem value="last-7-days">Last 7 Days</SelectItem>
            <SelectItem value="last-30-days">Last 30 Days</SelectItem>
            <SelectItem value="this-month">This Month</SelectItem>
            <SelectItem value="custom">Custom Range</SelectItem>
          </SelectContent>
        </Select>
        <Select value={doctorId} onValueChange={setDoctorId}>
          <SelectTrigger className="h-9 w-full"><SelectValue placeholder="Doctor" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Doctors</SelectItem></SelectContent>
        </Select>
        <Select value={appointmentType} onValueChange={(value) => setAppointmentType(value as AppointmentTypeFilter)}>
          <SelectTrigger className="h-9 w-full"><SelectValue placeholder="Appointment Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="walk_in">Walk-In</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="follow_up">Follow-Up</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
          <SelectTrigger className="h-9 w-full"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="booked">Booked</SelectItem>
            <SelectItem value="checked_in">Checked-In</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="no_show">No-Show</SelectItem>
          </SelectContent>
        </Select>
        <div className="w-full lg:w-[250px]">{dateRange === "custom" ? <DateRangePicker value={customDateRange} onChange={setCustomDateRange} /> : <div className="flex h-9 items-center rounded-md border bg-background px-3 text-sm text-muted-foreground">Using preset date range</div>}</div>
      </div>

      {error ? <EmptyStateCard message={error} /> : null}

      {isLoading ? <KpiSkeletonGrid /> : ui.summary.length > 0 ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{ui.summary.map((metric) => <MetricCard key={metric.key} metric={metric} />)}</div> : <EmptyStateCard message="No appointment data available for the selected filters" />}

      <div className="grid gap-3 rounded-lg border bg-card p-3 md:grid-cols-2 xl:grid-cols-4">
        {ui.summaryStrip.map((item) => (
          <div key={item.label} className="rounded-md border bg-background px-3 py-2">
            <p className="text-[11px] text-muted-foreground">{item.label}</p>
            <p className="text-sm font-semibold">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-teal-200 bg-teal-50/70">
          <CardHeader className="pb-2"><div className="flex items-center gap-2"><TrendingUpIcon className="h-4 w-4 text-teal-700" /><CardTitle className="text-base">Performing Well</CardTitle></div><CardDescription className="text-teal-800">Healthy operational signals</CardDescription></CardHeader>
          <CardContent className="space-y-2">{ui.performanceInsights.performingWell.map((item) => <InsightRow key={item.text} tone="positive" text={item.text} value={item.value} />)}</CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/80">
          <CardHeader className="pb-2"><div className="flex items-center gap-2"><CircleAlertIcon className="h-4 w-4 text-amber-600" /><CardTitle className="text-base">Needs Attention</CardTitle></div><CardDescription className="text-amber-700">Operational areas requiring monitoring</CardDescription></CardHeader>
          <CardContent className="space-y-2">{ui.performanceInsights.needsAttention.map((item) => <InsightRow key={item.text} tone="attention" text={item.text} value={item.value} />)}</CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="trends">Trends</TabsTrigger><TabsTrigger value="patient-flow">Patient Flow</TabsTrigger><TabsTrigger value="doctor-load">Doctor Load</TabsTrigger></TabsList>
        <TabsContent value="overview" className="space-y-4">{isLoading ? <ChartSkeletonGrid /> : <OverviewTab ui={ui} />}</TabsContent>
        <TabsContent value="trends" className="space-y-4">{isLoading ? <ChartSkeletonGrid /> : <TrendsTab ui={ui} />}</TabsContent>
        <TabsContent value="patient-flow" className="space-y-4">{isLoading ? <ChartSkeletonGrid /> : <PatientFlowTab ui={ui} />}</TabsContent>
        <TabsContent value="doctor-load"><DoctorLoadTab ui={ui} isLoading={isLoading} /></TabsContent>
      </Tabs>

      <Card>
        <CardHeader><CardTitle>Recent Appointments</CardTitle><CardDescription>Operational snapshot of the latest patient visits</CardDescription></CardHeader>
        <CardContent>
          {isLoading ? <TableSkeleton /> : ui.recentAppointments.length === 0 ? <EmptyStateCard message="No recent appointments available for the selected filters" /> : (
            <div className="overflow-auto">
              <Table className="whitespace-nowrap">
                <TableHeader><TableRow><TableHead>Patient</TableHead><TableHead>Visit Type</TableHead><TableHead>Appointment Type</TableHead><TableHead>Time</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {ui.recentAppointments.map((item, index) => (
                    <TableRow key={`${item.patient}-${item.time}-${index}`}>
                      <TableCell className="font-medium">{item.patient}</TableCell>
                      <TableCell><Badge variant="secondary" className="font-medium">{item.visitType}</Badge></TableCell>
                      <TableCell>{item.appointmentType}</TableCell>
                      <TableCell>{item.time}</TableCell>
                      <TableCell><Badge variant="outline" className={statusBadgeClass(item.status)}>{item.status}</Badge></TableCell>
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

function MetricCard({ metric }: { metric: { key: string; title: string; value: string; note: string; trendDirection: "up" | "down" | "stable"; trendLabel: string } }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
        <CalendarClockIcon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{metric.value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{metric.note}</p>
        <div className="mt-2 flex items-center gap-1 text-xs">
          {metric.trendDirection === "up" ? <ArrowUpRightIcon className="h-3.5 w-3.5 text-teal-700" /> : metric.trendDirection === "down" ? <ArrowUpRightIcon className="h-3.5 w-3.5 rotate-90 text-amber-700" /> : <Clock3Icon className="h-3.5 w-3.5 text-slate-600" />}
          <span className={metric.trendDirection === "up" ? "text-teal-800" : metric.trendDirection === "down" ? "text-amber-800" : "text-slate-700"}>{metric.trendLabel}</span>
        </div>
      </CardContent>
    </Card>
  )
}

function OverviewTab({ ui }: { ui: ReturnType<typeof normalizeForUi> }) {
  if (!ui.hasOverviewData) return <EmptyStateCard message="No chart data available for the selected filters" />
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard title="Appointment Status Distribution" description="Completed, checked-in, cancelled and no-show ratios" heightClassName="h-[250px]">
        <PieChart><Pie data={ui.distributions.statusDistribution} dataKey="value" nameKey="name" innerRadius={50} outerRadius={78}>{ui.distributions.statusDistribution.map((e) => <Cell key={e.name} fill={e.color} />)}</Pie><Tooltip /><Legend /></PieChart>
      </ChartCard>
      <ChartCard title="Appointment Volume by Type" description="Walk-In, Scheduled and Follow-Up counts" heightClassName="h-[250px]">
        <BarChart layout="vertical" data={ui.distributions.appointmentTypeVolume} margin={{ left: 10, right: 10 }}><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis type="category" dataKey="name" width={90} /><Tooltip /><Bar dataKey="value" fill="#3f7f95" radius={[0, 6, 6, 0]} /></BarChart>
      </ChartCard>
      <ChartCard title="Walk-In vs Scheduled Ratio" description="Visit mix by appointment category" heightClassName="h-[250px]">
        <PieChart><Pie data={ui.patientFlow.visitMix} dataKey="value" nameKey="name" innerRadius={50} outerRadius={78}>{ui.patientFlow.visitMix.map((e) => <Cell key={e.name} fill={e.color} />)}</Pie><Tooltip /><Legend /></PieChart>
      </ChartCard>
      <Card><CardHeader><CardTitle>New vs Returning Patients</CardTitle><CardDescription>Patient split for selected period</CardDescription></CardHeader><CardContent className="grid gap-3 pt-2 sm:grid-cols-2"><Card className="border-dashed"><CardContent className="pt-4"><p className="text-xs text-muted-foreground">New Patients</p><p className="text-2xl font-semibold">{ui.patientFlow.patientSplit.new}</p></CardContent></Card><Card className="border-dashed"><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Returning Patients</p><p className="text-2xl font-semibold">{ui.patientFlow.patientSplit.returning}</p></CardContent></Card></CardContent></Card>
    </div>
  )
}

function TrendsTab({ ui }: { ui: ReturnType<typeof normalizeForUi> }) {
  if (!ui.hasTrendsData) return <EmptyStateCard message="No trend data available for the selected filters" />
  return (
    <div className="grid gap-4">
      <ChartCard title="Daily Appointment Trend" description="7-day OPD movement across key statuses" heightClassName="h-[260px]">
        <LineChart data={ui.trends.daily} margin={{ left: 5, right: 5 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" /><YAxis /><Tooltip /><Legend /><Line type="monotone" dataKey="total" stroke="#1d4e89" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="completed" stroke="#0f766e" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="cancelled" stroke="#b45309" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="noShow" stroke="#a16207" strokeWidth={2} dot={false} /></LineChart>
      </ChartCard>
      <ChartCard title="Monthly Appointment Trend" description="Last 6 months appointment growth" heightClassName="h-[220px]">
        <BarChart data={ui.trends.monthly} margin={{ left: 5, right: 5 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Bar dataKey="appointments" fill="#3f7f95" radius={[6, 6, 0, 0]} /></BarChart>
      </ChartCard>
    </div>
  )
}

function PatientFlowTab({ ui }: { ui: ReturnType<typeof normalizeForUi> }) {
  if (!ui.hasPatientFlowData) return <EmptyStateCard message="No patient flow data available for the selected filters" />
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <div className="rounded-lg border bg-card p-3 text-sm text-muted-foreground lg:col-span-2">
        OPD rush is highest during <span className="font-semibold text-foreground">{ui.summaryStrip[0]?.value || "N/A"}</span>; returning patient share remains at <span className="font-semibold text-foreground">{ui.summaryStrip[3]?.value || "0%"}</span>.
      </div>
      <ChartCard title="Peak Hours Analysis" description="Most crowded OPD slots for staffing decisions" heightClassName="h-[240px]">
        <BarChart layout="vertical" data={ui.patientFlow.peakHours} margin={{ left: 25, right: 10 }}><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis type="category" dataKey="slot" width={90} /><Tooltip /><Bar dataKey="patients" fill="#2f7a74" radius={[0, 6, 6, 0]} /></BarChart>
      </ChartCard>
      <ChartCard title="Visit Mix" description="Walk-In, Scheduled, Follow-Up ratio" heightClassName="h-[240px]">
        <PieChart><Pie data={ui.patientFlow.visitMix} dataKey="value" nameKey="name" innerRadius={48} outerRadius={76}>{ui.patientFlow.visitMix.map((e) => <Cell key={e.name} fill={e.color} />)}</Pie><Tooltip /><Legend /></PieChart>
      </ChartCard>
      <Card className="lg:col-span-2"><CardHeader><CardTitle>Patient Split</CardTitle><CardDescription>Retention pattern for OPD continuity planning</CardDescription></CardHeader><CardContent className="grid gap-3 pt-2 sm:grid-cols-2"><Card className="border-dashed"><CardContent className="pt-4"><p className="text-xs text-muted-foreground">New</p><p className="text-3xl font-bold">{ui.patientFlow.patientSplit.new}</p></CardContent></Card><Card className="border-dashed"><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Returning</p><p className="text-3xl font-bold">{ui.patientFlow.patientSplit.returning}</p></CardContent></Card></CardContent></Card>
    </div>
  )
}

function DoctorLoadTab({ ui, isLoading }: { ui: ReturnType<typeof normalizeForUi>; isLoading: boolean }) {
  return (
    <Card>
      <CardHeader><CardTitle>Doctor Performance</CardTitle><CardDescription>Future-ready doctor workload structure</CardDescription></CardHeader>
      <CardContent>
        {isLoading ? <TableSkeleton /> : ui.doctorLoad.length === 0 ? <EmptyStateCard message="No doctor load data available for the selected filters" /> : (
          <div className="space-y-3">
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">{ui.doctorSummary}</div>
            <div className="overflow-auto">
              <Table className="whitespace-nowrap">
                <TableHeader><TableRow><TableHead>Doctor</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Completed</TableHead><TableHead className="text-right">Cancelled</TableHead><TableHead className="text-right">No-Show</TableHead><TableHead className="text-right">Avg/Day</TableHead></TableRow></TableHeader>
                <TableBody>{ui.doctorLoad.map((row) => <TableRow key={row.doctor}><TableCell className="font-medium">{row.doctor}</TableCell><TableCell className="text-right">{row.total}</TableCell><TableCell className="text-right">{row.completed}</TableCell><TableCell className="text-right">{row.cancelled}</TableCell><TableCell className="text-right">{row.noShow}</TableCell><TableCell className="text-right">{row.avgPerDay}</TableCell></TableRow>)}</TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ChartCard({ title, description, children, heightClassName = "h-[320px]" }: { title: string; description: string; children: React.ReactElement; heightClassName?: string }) {
  return <Card><CardHeader><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent><div className={`${heightClassName} w-full`}><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div></CardContent></Card>
}

function InsightRow({ text, value, tone }: { text: string; value?: string; tone: "positive" | "attention" }) {
  return <div className="flex items-start gap-2 rounded-md border bg-background/80 px-2.5 py-2"><span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${tone === "positive" ? "bg-teal-600" : "bg-amber-600"}`} /><div className="flex-1 text-sm leading-5 text-foreground">{text}</div>{value ? <span className={`text-xs font-semibold ${tone === "positive" ? "text-teal-800" : "text-amber-800"}`}>{value}</span> : null}</div>
}

function EmptyStateCard({ message }: { message: string }) {
  return <Card><CardContent className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-center"><div className="rounded-full bg-muted p-3"><CalendarClockIcon className="h-6 w-6 text-muted-foreground" /></div><p className="text-sm text-muted-foreground">{message}</p></CardContent></Card>
}

function KpiSkeletonGrid() {
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Card key={i}><CardHeader><Skeleton className="h-4 w-24" /></CardHeader><CardContent className="space-y-2"><Skeleton className="h-8 w-16" /><Skeleton className="h-3 w-36" /></CardContent></Card>)}</div>
}
function ChartSkeletonGrid() {
  return <div className="grid gap-4 lg:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Card key={i}><CardHeader className="space-y-2"><Skeleton className="h-5 w-40" /><Skeleton className="h-3 w-56" /></CardHeader><CardContent><Skeleton className="h-[300px] w-full" /></CardContent></Card>)}</div>
}
function TableSkeleton() {
  return <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
}

function statusBadgeClass(status: string) {
  if (status === "Completed") return "border-teal-500/50 bg-teal-500/10 text-teal-800"
  if (status === "Checked-In") return "border-sky-500/50 bg-sky-500/10 text-sky-800"
  if (status === "Cancelled") return "border-orange-500/50 bg-orange-500/10 text-orange-800"
  if (status === "No-Show") return "border-amber-500/50 bg-amber-500/10 text-amber-800"
  return "border-slate-400/60 bg-slate-500/10 text-slate-700"
}

function resolveDateRange(option: DateRangeOption, customRange?: DateRange) {
  const now = new Date()
  const format = (d: Date) => d.toISOString().slice(0, 10)
  if (option === "today") return { start: format(now), end: format(now) }
  if (option === "yesterday") {
    const y = new Date(now)
    y.setDate(now.getDate() - 1)
    return { start: format(y), end: format(y) }
  }
  if (option === "last-30-days") {
    const s = new Date(now)
    s.setDate(now.getDate() - 29)
    return { start: format(s), end: format(now) }
  }
  if (option === "this-month") {
    const s = new Date(now.getFullYear(), now.getMonth(), 1)
    return { start: format(s), end: format(now) }
  }
  if (option === "custom") {
    const startDate = customRange?.from ?? now
    const endDate = customRange?.to ?? customRange?.from ?? now
    return { start: format(startDate), end: format(endDate) }
  }
  const s = new Date(now)
  s.setDate(now.getDate() - 6)
  return { start: format(s), end: format(now) }
}

function normalizeForUi(data: ReportResponse | null) {
  if (!data) {
    return {
      summary: [],
      summaryStrip: [],
      performanceInsights: { performingWell: [], needsAttention: [] },
      distributions: { statusDistribution: [], appointmentTypeVolume: [] },
      trends: { daily: [], monthly: [] },
      patientFlow: { peakHours: [], visitMix: [], patientSplit: { new: 0, returning: 0 } },
      hasOverviewData: false,
      hasTrendsData: false,
      hasPatientFlowData: false,
      doctorLoad: [] as { doctor: string; total: number; completed: number; cancelled: number; noShow: number; avgPerDay: number }[],
      doctorSummary: "",
      recentAppointments: [] as { patient: string; visitType: string; appointmentType: string; time: string; status: string }[],
    }
  }

  const metric = (title: string, item: Metric, note: string, key: string) => ({
    key,
    title,
    value: item.count.toLocaleString(),
    note,
    trendDirection: item.trend,
    trendLabel: `${item.trend === "up" ? "Up" : item.trend === "down" ? "Down" : "Stable"} ${Math.abs(item.change_percentage)}%`,
  })

  const doctor = data.doctor_load[0]
  const statusDistribution = (data.status_distribution ?? []).map((x) => ({ name: prettifyLabel(x.status), value: x.percentage, color: statusColor(x.status) }))
  const appointmentTypeDistribution = (data.appointment_type_distribution ?? []).map((x) => ({ name: prettifyLabel(x.type), value: x.count }))
  const dailyTrends = (data.daily_trends ?? []).map((x) => ({ day: shortDay(x.date), total: x.total, completed: x.completed, cancelled: x.cancelled, noShow: x.no_show }))
  const monthlyTrends = (data.monthly_trends ?? []).map((x) => ({ month: x.month, appointments: x.appointments }))
  const peakHours = (data.peak_hours ?? []).map((x) => ({ slot: x.slot, patients: x.count }))
  const visitMix = (data.appointment_type_distribution ?? []).map((x) => ({ name: prettifyLabel(x.type), value: x.percentage, color: typeColor(x.type) }))

  return {
    summary: [
      metric("Total Appointments", data.summary.total_appointments, "Compared to previous period", "total"),
      metric("Completed Consultations", data.summary.completed, "Completion trend", "completed"),
      metric("Checked-In Patients", data.summary.checked_in, "Current OPD throughput", "checkedin"),
      metric("No-Shows", data.summary.no_show, "Missed appointments", "noshow"),
      metric("Cancelled Appointments", data.summary.cancelled, "Cancellation trend", "cancelled"),
      metric("Walk-In Patients", data.summary.walk_in_patients, "Walk-in volume", "walkin"),
      metric("New Patients", data.summary.new_patients, "First-time visitors", "new"),
      metric("Returning Patients", data.summary.returning_patients, "Repeat visits", "returning"),
    ],
    summaryStrip: [
      { label: "Peak OPD Hour", value: data.operational_summary.peak_opd_hour || "N/A" },
      { label: "Best Attendance Day", value: data.operational_summary.best_attendance_day || "N/A" },
      { label: "Average Daily Footfall", value: `${data.operational_summary.average_daily_footfall || 0} Patients` },
      { label: "Patient Retention", value: `${data.operational_summary.patient_retention_percentage || 0}%` },
    ],
    performanceInsights: {
      performingWell: (data.performance_insights?.performing_well ?? []).map((i) => ({ text: i.title, value: i.value })),
      needsAttention: (data.performance_insights?.needs_attention ?? []).map((i) => ({ text: i.title, value: i.value })),
    },
    distributions: {
      statusDistribution,
      appointmentTypeVolume: appointmentTypeDistribution,
    },
    trends: {
      daily: dailyTrends,
      monthly: monthlyTrends,
    },
    patientFlow: {
      peakHours,
      visitMix,
      patientSplit: { new: data.patient_split?.new_patients ?? 0, returning: data.patient_split?.returning_patients ?? 0 },
    },
    hasOverviewData: statusDistribution.length > 0 || appointmentTypeDistribution.length > 0 || visitMix.length > 0,
    hasTrendsData: dailyTrends.some((x) => x.total > 0) || monthlyTrends.some((x) => x.appointments > 0),
    hasPatientFlowData: peakHours.length > 0 || visitMix.length > 0 || (data.patient_split?.new_patients ?? 0) > 0 || (data.patient_split?.returning_patients ?? 0) > 0,
    doctorLoad: (data.doctor_load ?? []).map((x) => ({ doctor: x.doctor_name, total: x.total, completed: x.completed, cancelled: x.cancelled, noShow: x.no_show, avgPerDay: x.average_per_day })),
    doctorSummary: doctor ? `${doctor.doctor_name} handled ${doctor.total.toLocaleString()} appointments during the selected period with an average OPD load of ${doctor.average_per_day} patients/day.` : "No doctor load summary available.",
    recentAppointments: (data.recent_appointments ?? []).map((x) => ({ patient: x.patient_name, visitType: prettifyLabel(x.visit_type), appointmentType: prettifyLabel(x.appointment_type), time: x.appointment_time || "--", status: prettifyLabel(x.status) })),
  }
}

function prettifyLabel(value: string) {
  return value.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join("-").replace("Checked-In", "Checked-In")
}
function shortDay(value: string) {
  if (!value) return ""
  const [year, month, day] = value.split("-").map(Number)
  const date = new Date(year, (month || 1) - 1, day || 1)
  return date.toLocaleDateString(undefined, { weekday: "short" })
}
function statusColor(status: string) {
  if (status === "completed") return "#0f766e"
  if (status === "checked_in") return "#1d4e89"
  if (status === "cancelled") return "#b45309"
  if (status === "no_show") return "#a16207"
  return "#64748b"
}
function typeColor(type: string) {
  if (type === "walk_in") return "#2f7a74"
  if (type === "scheduled") return "#3f7f95"
  return "#64748b"
}

function parseApiError(err: unknown): string {
  if (!err || typeof err !== "object" || !("response" in err)) {
    return err instanceof Error ? err.message : "Failed to load report"
  }
  const response = (err as { response?: { data?: unknown } }).response
  const data = response?.data
  if (!data) return "Failed to load report"
  if (typeof data === "string") return data
  if (typeof data === "object") {
    const payload = data as Record<string, unknown>
    if (typeof payload.detail === "string") return payload.detail
    if (typeof payload.error === "string") return payload.error
    for (const [field, value] of Object.entries(payload)) {
      if (Array.isArray(value) && value.length > 0) {
        return `${field}: ${String(value[0])}`
      }
    }
  }
  return "Failed to load report"
}
