"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarDateRangePicker as DateRangePicker } from "@/components/date-range-picker"
import { ActivityIcon, ArrowUpRightIcon, CalendarClockIcon, CheckCircle2Icon, CircleAlertIcon, Clock3Icon, Repeat2Icon, SparklesIcon, TrendingUpIcon, UserCheck2Icon, UserRoundPlusIcon, UserRoundXIcon } from "lucide-react"
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
      <div className="relative overflow-hidden rounded-xl border border-teal-200/60 bg-gradient-to-br from-teal-50/90 via-background to-sky-50/40 px-5 py-5 shadow-sm lg:px-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-teal-400/10 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-sky-400/10 blur-2xl" aria-hidden />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-200/80 bg-teal-50/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-teal-800">
              <ActivityIcon className="h-3.5 w-3.5" aria-hidden />
              OPD insights
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground lg:text-3xl">Appointment Reports</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Analyze appointments, patient flow, and operational trends at a glance — colour-coded KPIs highlight volume, outcomes, and retention.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-2 rounded-xl border border-border/80 bg-muted/20 p-3 shadow-sm lg:grid-cols-[180px_180px_180px_180px_auto]">
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

      {isLoading ? (
        <KpiSkeletonGrid />
      ) : ui.summary.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{ui.summary.map((metric) => <MetricCard key={metric.key} metric={metric} />)}</div>
      ) : (
        <EmptyStateCard message="No appointment data available for the selected filters" />
      )}

      <div className="grid gap-3 rounded-xl border border-border/70 bg-card/50 p-3 md:grid-cols-2 xl:grid-cols-4">
        {ui.summaryStrip.map((item, idx) => (
          <div
            key={item.label}
            className={`rounded-lg border bg-background px-3 py-2.5 shadow-sm ${summaryStripAccentClass(idx)}`}
          >
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{item.label}</p>
            <p className="mt-0.5 text-sm font-semibold text-foreground">{item.value}</p>
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
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-xl border border-border/70 bg-muted/30 p-1 md:w-auto md:flex-nowrap">
          <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-teal-600 data-[state=active]:text-white">
            Overview
          </TabsTrigger>
          <TabsTrigger value="trends" className="rounded-lg data-[state=active]:bg-sky-600 data-[state=active]:text-white">
            Trends
          </TabsTrigger>
          <TabsTrigger value="patient-flow" className="rounded-lg data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            Patient Flow
          </TabsTrigger>
          <TabsTrigger value="doctor-load" className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
            Doctor Load
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">{isLoading ? <ChartSkeletonGrid /> : <OverviewTab ui={ui} />}</TabsContent>
        <TabsContent value="trends" className="space-y-4">{isLoading ? <ChartSkeletonGrid /> : <TrendsTab ui={ui} />}</TabsContent>
        <TabsContent value="patient-flow" className="space-y-4">{isLoading ? <ChartSkeletonGrid /> : <PatientFlowTab ui={ui} />}</TabsContent>
        <TabsContent value="doctor-load"><DoctorLoadTab ui={ui} isLoading={isLoading} /></TabsContent>
      </Tabs>

      <Card className="overflow-hidden border-teal-200/50 shadow-sm">
        <CardHeader className="border-b border-teal-100/80 bg-gradient-to-r from-teal-50/50 to-transparent pb-4">
          <CardTitle className="text-lg">Recent Appointments</CardTitle>
          <CardDescription>Operational snapshot of the latest patient visits</CardDescription>
        </CardHeader>
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
  const theme = kpiTheme(metric.key)
  const Icon = kpiIcon(metric.key)
  return (
    <Card className={`relative overflow-hidden border shadow-sm transition-shadow hover:shadow-md ${theme.card}`}>
      <div className={`pointer-events-none absolute inset-y-0 left-0 w-1 ${theme.accentBar}`} aria-hidden />
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 pt-5">
        <CardTitle className="pr-2 text-sm font-semibold leading-snug text-foreground/90">{metric.title}</CardTitle>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${theme.iconWrap}`}>
          <Icon className={`h-4 w-4 ${theme.icon}`} aria-hidden />
        </span>
      </CardHeader>
      <CardContent className="pb-5">
        <div className={`text-3xl font-bold tracking-tight tabular-nums ${theme.value}`}>{metric.value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{metric.note}</p>
        <div
          className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium ${metric.trendDirection === "up" ? theme.trendPillUp : metric.trendDirection === "down" ? theme.trendPillDown : theme.trendPillStable}`}
        >
          {metric.trendDirection === "up" ? (
            <ArrowUpRightIcon className="h-3.5 w-3.5" aria-hidden />
          ) : metric.trendDirection === "down" ? (
            <ArrowUpRightIcon className="h-3.5 w-3.5 rotate-90" aria-hidden />
          ) : (
            <Clock3Icon className="h-3.5 w-3.5" aria-hidden />
          )}
          <span>{metric.trendLabel}</span>
        </div>
      </CardContent>
    </Card>
  )
}

function kpiIcon(key: string) {
  switch (key) {
    case "total":
      return CalendarClockIcon
    case "completed":
      return CheckCircle2Icon
    case "checkedin":
      return UserCheck2Icon
    case "noshow":
      return UserRoundXIcon
    case "cancelled":
      return CircleAlertIcon
    case "walkin":
      return UserRoundPlusIcon
    case "new":
      return SparklesIcon
    case "returning":
      return Repeat2Icon
    default:
      return CalendarClockIcon
  }
}

function kpiTheme(key: string) {
  const themes: Record<
    string,
    {
      card: string
      accentBar: string
      iconWrap: string
      icon: string
      value: string
      trendPillUp: string
      trendPillDown: string
      trendPillStable: string
    }
  > = {
    total: {
      card: "border-sky-200/70 bg-gradient-to-br from-sky-50/90 via-card to-card",
      accentBar: "bg-sky-500",
      iconWrap: "bg-sky-100 text-sky-700 ring-1 ring-sky-200/80",
      icon: "text-sky-800",
      value: "text-sky-950",
      trendPillUp: "bg-sky-100 text-sky-900 ring-1 ring-sky-200/70",
      trendPillDown: "bg-rose-50 text-rose-900 ring-1 ring-rose-200/70",
      trendPillStable: "bg-slate-100 text-slate-800 ring-1 ring-slate-200/80",
    },
    completed: {
      card: "border-emerald-200/70 bg-gradient-to-br from-emerald-50/90 via-card to-card",
      accentBar: "bg-emerald-500",
      iconWrap: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200/80",
      icon: "text-emerald-800",
      value: "text-emerald-950",
      trendPillUp: "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200/70",
      trendPillDown: "bg-amber-50 text-amber-900 ring-1 ring-amber-200/70",
      trendPillStable: "bg-slate-100 text-slate-800 ring-1 ring-slate-200/80",
    },
    checkedin: {
      card: "border-cyan-200/70 bg-gradient-to-br from-cyan-50/85 via-card to-card",
      accentBar: "bg-cyan-500",
      iconWrap: "bg-cyan-100 text-cyan-700 ring-1 ring-cyan-200/80",
      icon: "text-cyan-900",
      value: "text-cyan-950",
      trendPillUp: "bg-cyan-100 text-cyan-900 ring-1 ring-cyan-200/70",
      trendPillDown: "bg-orange-50 text-orange-900 ring-1 ring-orange-200/70",
      trendPillStable: "bg-slate-100 text-slate-800 ring-1 ring-slate-200/80",
    },
    noshow: {
      card: "border-amber-200/70 bg-gradient-to-br from-amber-50/85 via-card to-card",
      accentBar: "bg-amber-500",
      iconWrap: "bg-amber-100 text-amber-700 ring-1 ring-amber-200/80",
      icon: "text-amber-900",
      value: "text-amber-950",
      trendPillUp: "bg-amber-100 text-amber-950 ring-1 ring-amber-200/70",
      trendPillDown: "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/70",
      trendPillStable: "bg-slate-100 text-slate-800 ring-1 ring-slate-200/80",
    },
    cancelled: {
      card: "border-orange-200/70 bg-gradient-to-br from-orange-50/80 via-card to-card",
      accentBar: "bg-orange-500",
      iconWrap: "bg-orange-100 text-orange-700 ring-1 ring-orange-200/80",
      icon: "text-orange-900",
      value: "text-orange-950",
      trendPillUp: "bg-orange-100 text-orange-950 ring-1 ring-orange-200/70",
      trendPillDown: "bg-teal-50 text-teal-900 ring-1 ring-teal-200/70",
      trendPillStable: "bg-slate-100 text-slate-800 ring-1 ring-slate-200/80",
    },
    walkin: {
      card: "border-teal-200/70 bg-gradient-to-br from-teal-50/85 via-card to-card",
      accentBar: "bg-teal-500",
      iconWrap: "bg-teal-100 text-teal-700 ring-1 ring-teal-200/80",
      icon: "text-teal-900",
      value: "text-teal-950",
      trendPillUp: "bg-teal-100 text-teal-950 ring-1 ring-teal-200/70",
      trendPillDown: "bg-slate-100 text-slate-900 ring-1 ring-slate-200/70",
      trendPillStable: "bg-slate-100 text-slate-800 ring-1 ring-slate-200/80",
    },
    new: {
      card: "border-indigo-200/70 bg-gradient-to-br from-indigo-50/85 via-card to-card",
      accentBar: "bg-indigo-500",
      iconWrap: "bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200/80",
      icon: "text-indigo-900",
      value: "text-indigo-950",
      trendPillUp: "bg-indigo-100 text-indigo-950 ring-1 ring-indigo-200/70",
      trendPillDown: "bg-slate-100 text-slate-900 ring-1 ring-slate-200/70",
      trendPillStable: "bg-slate-100 text-slate-800 ring-1 ring-slate-200/80",
    },
    returning: {
      card: "border-violet-200/70 bg-gradient-to-br from-violet-50/80 via-card to-card",
      accentBar: "bg-violet-500",
      iconWrap: "bg-violet-100 text-violet-700 ring-1 ring-violet-200/80",
      icon: "text-violet-900",
      value: "text-violet-950",
      trendPillUp: "bg-violet-100 text-violet-950 ring-1 ring-violet-200/70",
      trendPillDown: "bg-slate-100 text-slate-900 ring-1 ring-slate-200/70",
      trendPillStable: "bg-slate-100 text-slate-800 ring-1 ring-slate-200/80",
    },
  }
  return themes[key] ?? themes.total
}

function summaryStripAccentClass(index: number) {
  const accents = [
    "border-l-4 border-l-teal-500 bg-teal-50/30",
    "border-l-4 border-l-sky-500 bg-sky-50/25",
    "border-l-4 border-l-emerald-500 bg-emerald-50/25",
    "border-l-4 border-l-violet-500 bg-violet-50/25",
  ]
  return accents[index % accents.length]
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
      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">New vs Returning Patients</CardTitle>
          <CardDescription>Patient split for selected period</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 pt-2 sm:grid-cols-2">
          <Card className="border-indigo-200/70 bg-gradient-to-br from-indigo-50/70 to-card shadow-sm">
            <CardContent className="pt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-indigo-700/90">New Patients</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-indigo-950">{ui.patientFlow.patientSplit.new}</p>
            </CardContent>
          </Card>
          <Card className="border-violet-200/70 bg-gradient-to-br from-violet-50/70 to-card shadow-sm">
            <CardContent className="pt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-violet-700/90">Returning Patients</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-violet-950">{ui.patientFlow.patientSplit.returning}</p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
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
      <div className="rounded-xl border border-emerald-200/60 bg-gradient-to-r from-emerald-50/60 via-card to-sky-50/40 p-4 text-sm text-muted-foreground shadow-sm lg:col-span-2">
        OPD rush is highest during <span className="font-semibold text-foreground">{ui.summaryStrip[0]?.value || "N/A"}</span>; returning patient share remains at <span className="font-semibold text-foreground">{ui.summaryStrip[3]?.value || "0%"}</span>.
      </div>
      <ChartCard title="Peak Hours Analysis" description="Most crowded OPD slots for staffing decisions" heightClassName="h-[240px]">
        <BarChart layout="vertical" data={ui.patientFlow.peakHours} margin={{ left: 25, right: 10 }}><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis type="category" dataKey="slot" width={90} /><Tooltip /><Bar dataKey="patients" fill="#2f7a74" radius={[0, 6, 6, 0]} /></BarChart>
      </ChartCard>
      <ChartCard title="Visit Mix" description="Walk-In, Scheduled, Follow-Up ratio" heightClassName="h-[240px]">
        <PieChart><Pie data={ui.patientFlow.visitMix} dataKey="value" nameKey="name" innerRadius={48} outerRadius={76}>{ui.patientFlow.visitMix.map((e) => <Cell key={e.name} fill={e.color} />)}</Pie><Tooltip /><Legend /></PieChart>
      </ChartCard>
      <Card className="lg:col-span-2 border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Patient Split</CardTitle>
          <CardDescription>Retention pattern for OPD continuity planning</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 pt-2 sm:grid-cols-2">
          <Card className="border-indigo-200/70 bg-gradient-to-br from-indigo-50/70 to-card shadow-sm">
            <CardContent className="pt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-indigo-700/90">New</p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-indigo-950">{ui.patientFlow.patientSplit.new}</p>
            </CardContent>
          </Card>
          <Card className="border-violet-200/70 bg-gradient-to-br from-violet-50/70 to-card shadow-sm">
            <CardContent className="pt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-violet-700/90">Returning</p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-violet-950">{ui.patientFlow.patientSplit.returning}</p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  )
}

function DoctorLoadTab({ ui, isLoading }: { ui: ReturnType<typeof normalizeForUi>; isLoading: boolean }) {
  return (
    <Card className="overflow-hidden border-indigo-200/50 shadow-sm">
      <CardHeader className="border-b border-indigo-100/70 bg-gradient-to-r from-indigo-50/40 to-transparent">
        <CardTitle className="text-lg">Doctor Performance</CardTitle>
        <CardDescription>Future-ready doctor workload structure</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? <TableSkeleton /> : ui.doctorLoad.length === 0 ? <EmptyStateCard message="No doctor load data available for the selected filters" /> : (
          <div className="space-y-3">
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">{ui.doctorSummary}</div>
            <div className="overflow-auto">
              <Table className="whitespace-nowrap">
                <TableHeader><TableRow><TableHead>Doctor</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Completed</TableHead><TableHead className="text-right">Cancelled</TableHead><TableHead className="text-right">No-Show</TableHead><TableHead className="text-right">Avg/Day</TableHead></TableRow></TableHeader>
                <TableBody>
                  {ui.doctorLoad.map((row) => (
                    <TableRow key={row.doctor}>
                      <TableCell className="font-medium">{row.doctor}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.total}</TableCell>
                      <TableCell className="text-right tabular-nums text-emerald-800">{row.completed}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.cancelled}</TableCell>
                      <TableCell className="text-right tabular-nums text-amber-800">{row.noShow}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.avgPerDay}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ChartCard({ title, description, children, heightClassName = "h-[320px]" }: { title: string; description: string; children: React.ReactElement; heightClassName?: string }) {
  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
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
  if (status === "Booked") return "border-blue-500/50 bg-blue-500/10 text-blue-900"
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

function snakeToCamel(key: string): string {
  return key.replace(/_([a-z])/g, (_, ch: string) => ch.toUpperCase())
}

/** Django uses snake_case; some gateways/clients may expose camelCase — read both. */
function pickKey<T>(obj: unknown, snakeKey: string): T | undefined {
  if (!obj || typeof obj !== "object") return undefined
  const r = obj as Record<string, unknown>
  return (r[snakeKey] ?? r[snakeToCamel(snakeKey)]) as T | undefined
}

function safeMetric(item: Metric | undefined | null): Metric {
  if (!item || typeof item !== "object") {
    return { count: 0, change_percentage: 0, trend: "stable" }
  }
  const count = typeof item.count === "number" && !Number.isNaN(item.count) ? item.count : 0
  const changePercentage =
    typeof item.change_percentage === "number" && !Number.isNaN(item.change_percentage) ? item.change_percentage : 0
  const trend: MetricTrend =
    item.trend === "up" || item.trend === "down" || item.trend === "stable" ? item.trend : "stable"
  return { count, change_percentage: changePercentage, trend }
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

  const s = data.summary
  const metricFromApi = (snakeKey: string) => safeMetric(pickKey<Metric>(s, snakeKey))
  // Do not default patient_retention_percentage to 0 — merged keys would shadow camelCase-only APIs
  // (pickKey would read 0 first and never fall through to patientRetentionPercentage).
  const opDefaults = {
    peak_opd_hour: "",
    best_attendance_day: "",
    average_daily_footfall: 0,
  }
  const opRaw = pickKey<Record<string, unknown>>(data, "operational_summary")
  const opBag = { ...opDefaults, ...(opRaw ?? {}) } as Record<string, unknown>
  const psRaw = pickKey<Record<string, unknown>>(data, "patient_split")
  let splitNew = Number(pickKey<number>(psRaw, "new_patients") ?? 0)
  let splitReturning = Number(pickKey<number>(psRaw, "returning_patients") ?? 0)
  const splitDenom = splitNew + splitReturning
  // Align strip with KPI cards when patient_split keys were camel-only or missing
  if (splitDenom === 0 && s) {
    splitNew = metricFromApi("new_patients").count
    splitReturning = metricFromApi("returning_patients").count
  }
  const splitDenomResolved = splitNew + splitReturning
  const retentionFromSplit =
    splitDenomResolved > 0 ? Math.round((splitReturning / splitDenomResolved) * 10000) / 100 : null
  const retentionFromApi = pickKey<number>(opBag, "patient_retention_percentage")
  const retentionLabel =
    splitDenomResolved === 0
      ? "N/A"
      : `${retentionFromSplit ?? (typeof retentionFromApi === "number" && !Number.isNaN(retentionFromApi) ? retentionFromApi : 0)}%`

  const doctorRows = (pickKey<ReportResponse["doctor_load"]>(data, "doctor_load") ?? data.doctor_load ?? []) as ReportResponse["doctor_load"]
  const doctor = doctorRows[0]
  const statusRows = (pickKey<ReportResponse["status_distribution"]>(data, "status_distribution") ?? data.status_distribution ?? []) as ReportResponse["status_distribution"]
  const typeRows = (pickKey<ReportResponse["appointment_type_distribution"]>(data, "appointment_type_distribution") ??
    data.appointment_type_distribution ??
    []) as ReportResponse["appointment_type_distribution"]
  const dailyRows = (pickKey<ReportResponse["daily_trends"]>(data, "daily_trends") ?? data.daily_trends ?? []) as ReportResponse["daily_trends"]

  const statusDistribution = statusRows.map((x) => ({ name: prettifyLabel(x.status), value: x.percentage, color: statusColor(x.status) }))
  const appointmentTypeDistribution = typeRows.map((x) => ({ name: prettifyLabel(x.type), value: x.count }))
  const dailyTrends = dailyRows.map((x) => {
    const row = x as unknown as Record<string, unknown>
    const dateVal = row.date
    const dateStr = typeof dateVal === "string" ? dateVal : dateVal instanceof Date ? dateVal.toISOString().slice(0, 10) : ""
    return {
      day: shortDay(dateStr),
      total: Number(row.total ?? 0),
      completed: Number(row.completed ?? 0),
      cancelled: Number(row.cancelled ?? 0),
      noShow: Number(pickKey<number>(row, "no_show") ?? 0),
    }
  })
  const monthlyTrends = ((pickKey<ReportResponse["monthly_trends"]>(data, "monthly_trends") ?? data.monthly_trends ?? []) as ReportResponse["monthly_trends"]).map((x) => ({
    month: x.month,
    appointments: x.appointments,
  }))
  const peakHours = ((pickKey<ReportResponse["peak_hours"]>(data, "peak_hours") ?? data.peak_hours ?? []) as ReportResponse["peak_hours"]).map((x) => ({
    slot: x.slot,
    patients: x.count,
  }))
  const visitMix = typeRows.map((x) => ({ name: prettifyLabel(x.type), value: x.percentage, color: typeColor(x.type) }))

  return {
    summary: [
      metric("Total Appointments", metricFromApi("total_appointments"), "Compared to previous period", "total"),
      metric("Completed Consultations", metricFromApi("completed"), "Completion trend", "completed"),
      metric("Checked-In Patients", metricFromApi("checked_in"), "Current OPD throughput", "checkedin"),
      metric("No-Shows", metricFromApi("no_show"), "Missed appointments", "noshow"),
      metric("Cancelled Appointments", metricFromApi("cancelled"), "Cancellation trend", "cancelled"),
      metric("Walk-In Patients", metricFromApi("walk_in_patients"), "Walk-in volume", "walkin"),
      metric("New Patients", metricFromApi("new_patients"), "First-time visitors", "new"),
      metric("Returning Patients", metricFromApi("returning_patients"), "Repeat visits", "returning"),
    ],
    summaryStrip: [
      { label: "Peak OPD Hour", value: formatOperationalLabel(pickKey(opBag, "peak_opd_hour")) },
      { label: "Best Attendance Day", value: formatOperationalLabel(pickKey(opBag, "best_attendance_day")) },
      { label: "Average Daily Footfall", value: `${Number(pickKey<number>(opBag, "average_daily_footfall") ?? 0)} Patients` },
      { label: "Patient Retention", value: retentionLabel },
    ],
    performanceInsights: (() => {
      const perf = pickKey<ReportResponse["performance_insights"]>(data, "performance_insights") ?? data.performance_insights
      return {
        performingWell: (perf?.performing_well ?? []).map((i) => ({ text: i.title, value: i.value })),
        needsAttention: (perf?.needs_attention ?? []).map((i) => ({ text: i.title, value: i.value })),
      }
    })(),
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
      patientSplit: { new: splitNew, returning: splitReturning },
    },
    hasOverviewData: statusDistribution.length > 0 || appointmentTypeDistribution.length > 0 || visitMix.length > 0,
    hasTrendsData: dailyTrends.some((x) => x.total > 0) || monthlyTrends.some((x) => x.appointments > 0),
    hasPatientFlowData: peakHours.length > 0 || visitMix.length > 0 || splitNew > 0 || splitReturning > 0,
    doctorLoad: doctorRows.map((x) => {
      const r = x as unknown as Record<string, unknown>
      return {
        doctor: String(pickKey<string>(r, "doctor_name") ?? ""),
        total: Number(r.total ?? 0),
        completed: Number(r.completed ?? 0),
        cancelled: Number(r.cancelled ?? 0),
        noShow: Number(pickKey<number>(r, "no_show") ?? 0),
        avgPerDay: Number(pickKey<number>(r, "average_per_day") ?? 0),
      }
    }),
    doctorSummary: doctor
      ? `${String(pickKey<string>(doctor as unknown as Record<string, unknown>, "doctor_name") ?? "")} handled ${Number((doctor as unknown as Record<string, unknown>).total ?? 0).toLocaleString()} appointments during the selected period with an average OPD load of ${Number(pickKey<number>(doctor as unknown as Record<string, unknown>, "average_per_day") ?? 0)} patients/day.`
      : "No doctor load summary available.",
    recentAppointments: (
      (pickKey<ReportResponse["recent_appointments"]>(data, "recent_appointments") ?? data.recent_appointments ?? []) as ReportResponse["recent_appointments"]
    ).map((x) => ({
      patient: String(pickKey<string>(x as unknown as Record<string, unknown>, "patient_name") ?? ""),
      visitType: prettifyLabel(String(pickKey<string>(x as unknown as Record<string, unknown>, "visit_type") ?? "")),
      appointmentType: prettifyLabel(String(pickKey<string>(x as unknown as Record<string, unknown>, "appointment_type") ?? "")),
      time: String(pickKey<string>(x as unknown as Record<string, unknown>, "appointment_time") ?? "") || "--",
      status: prettifyLabel(String(pickKey<string>(x as unknown as Record<string, unknown>, "status") ?? "")),
    })),
  }
}

function formatOperationalLabel(value: unknown): string {
  if (value === null || value === undefined) return "N/A"
  const t = String(value).trim()
  return t.length > 0 ? t : "N/A"
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
  if (status === "booked") return "#475569"
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
