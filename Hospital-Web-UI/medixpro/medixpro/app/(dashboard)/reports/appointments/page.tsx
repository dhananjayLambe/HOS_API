"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarDateRangePicker as DateRangePicker } from "@/components/date-range-picker"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  DownloadIcon,
  FileTextIcon,
  FilterIcon,
  RefreshCcwIcon,
  XCircleIcon,
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  AreaChart,
  Area,
} from "recharts"

export default function AppointmentReportsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Appointment Reports</h1>
        <p className="text-muted-foreground">Analyze appointment data, track trends, and generate detailed reports</p>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <DateRangePicker />
          <Select defaultValue="all-departments">
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-departments">All Departments</SelectItem>
              <SelectItem value="cardiology">Cardiology</SelectItem>
              <SelectItem value="neurology">Neurology</SelectItem>
              <SelectItem value="orthopedics">Orthopedics</SelectItem>
              <SelectItem value="pediatrics">Pediatrics</SelectItem>
              <SelectItem value="dermatology">Dermatology</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="all-doctors">
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Doctor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-doctors">All Doctors</SelectItem>
              <SelectItem value="dr-smith">Dr. Smith</SelectItem>
              <SelectItem value="dr-johnson">Dr. Johnson</SelectItem>
              <SelectItem value="dr-williams">Dr. Williams</SelectItem>
              <SelectItem value="dr-brown">Dr. Brown</SelectItem>
              <SelectItem value="dr-jones">Dr. Jones</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <RefreshCcwIcon className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <DownloadIcon className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm xl:text-lg font-medium">Total Appointments</CardTitle>
            <CalendarIcon className="size-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <h2 className="text-2xl lg:text-4xl mb-2 font-bold">1,248</h2>
            <p className="text-xs text-muted-foreground">+12.5% from last month</p>
            <div className="mt-4 h-1 w-full rounded-full bg-secondary">
              <div className="h-1 w-[75%] rounded-full bg-primary"></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm xl:text-lg font-medium">Completed</CardTitle>
            <CheckCircleIcon className="size-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <h2 className="text-2xl lg:text-4xl mb-2 font-bold">876</h2>
            <p className="text-xs text-muted-foreground">70.2% completion rate</p>
            <div className="mt-4 h-1 w-full rounded-full bg-secondary">
              <div className="h-1 w-[70%] rounded-full bg-green-500"></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm xl:text-lg font-medium">Canceled</CardTitle>
            <XCircleIcon className="size-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <h2 className="text-2xl lg:text-4xl mb-2 font-bold">187</h2>
            <p className="text-xs text-muted-foreground">15% cancellation rate</p>
            <div className="mt-4 h-1 w-full rounded-full bg-secondary">
              <div className="h-1 w-[15%] rounded-full bg-red-500"></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm xl:text-lg font-medium">No-Shows</CardTitle>
            <ClockIcon className="size-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <h2 className="text-2xl lg:text-4xl mb-2 font-bold">85</h2>
            <p className="text-xs text-muted-foreground">6.8% no-show rate</p>
            <div className="mt-4 h-1 w-full rounded-full bg-secondary">
              <div className="h-1 w-[7%] rounded-full bg-amber-500"></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="by-doctor">By Doctor</TabsTrigger>
          <TabsTrigger value="by-service">By Service</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Appointment Status Distribution</CardTitle>
                <CardDescription>Breakdown of appointments by their current status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusDistributionData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {statusDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [`${value} appointments`, name]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Appointments by Department</CardTitle>
                <CardDescription>Distribution of appointments across different departments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={departmentData}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 80,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="appointments" fill="#8884d8" name="Appointments" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle>Recent Appointments</CardTitle>
                  <CardDescription>Detailed view of the last 10 appointments</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Input placeholder="Search appointments..." className="h-8 w-[150px] lg:w-[250px]" />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 gap-1">
                        <FilterIcon className="h-3.5 w-3.5" />
                        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Filter</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>All</DropdownMenuItem>
                      <DropdownMenuItem>Completed</DropdownMenuItem>
                      <DropdownMenuItem>Scheduled</DropdownMenuItem>
                      <DropdownMenuItem>Canceled</DropdownMenuItem>
                      <DropdownMenuItem>No-Show</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table className="whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="whitespace-nowrap">
                  {appointmentData.map((appointment) => (
                    <TableRow key={appointment.id}>
                      <TableCell className="font-medium">{appointment.patient}</TableCell>
                      <TableCell>{appointment.doctor}</TableCell>
                      <TableCell>{appointment.dateTime}</TableCell>
                      <TableCell>{appointment.service}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            appointment.status === "Completed"
                              ? "border-green-500 bg-green-500/10 text-green-500"
                              : appointment.status === "Scheduled"
                                ? "border-blue-500 bg-blue-500/10 text-blue-500"
                                : appointment.status === "Canceled"
                                  ? "border-red-500 bg-red-500/10 text-red-500"
                                  : "border-amber-500 bg-amber-500/10 text-amber-500"
                          }
                        >
                          {appointment.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <FileTextIcon className="h-4 w-4" />
                          <span className="sr-only">View details</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Appointment Trends</CardTitle>
              <CardDescription>Monthly appointment volume over the past year</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={monthlyTrendsData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="total" stroke="#8884d8" name="Total Appointments" />
                    <Line type="monotone" dataKey="completed" stroke="#82ca9d" name="Completed" />
                    <Line type="monotone" dataKey="canceled" stroke="#ff7300" name="Canceled" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Weekly Distribution</CardTitle>
                <CardDescription>Appointment distribution by day of week</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={weeklyDistributionData}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="appointments" fill="#8884d8" name="Appointments" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Hourly Distribution</CardTitle>
                <CardDescription>Appointment distribution by time of day</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={hourlyDistributionData}
                      margin={{
                        top: 10,
                        right: 30,
                        left: 0,
                        bottom: 0,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="appointments"
                        stroke="#8884d8"
                        fill="#8884d8"
                        name="Appointments"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="by-doctor" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Appointments by Doctor</CardTitle>
              <CardDescription>Comparison of appointment volume and completion rates by doctor</CardDescription>
            </CardHeader>
            <CardContent>
              <Table className="whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-right">Total Appointments</TableHead>
                    <TableHead className="text-right">Completed</TableHead>
                    <TableHead className="text-right">Canceled</TableHead>
                    <TableHead className="text-right">No-Shows</TableHead>
                    <TableHead className="text-right">Completion Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="whitespace-nowrap">
                  {doctorStats.map((doctor) => (
                    <TableRow key={doctor.id}>
                      <TableCell className="font-medium">{doctor.name}</TableCell>
                      <TableCell>{doctor.department}</TableCell>
                      <TableCell className="text-right">{doctor.total}</TableCell>
                      <TableCell className="text-right">{doctor.completed}</TableCell>
                      <TableCell className="text-right">{doctor.canceled}</TableCell>
                      <TableCell className="text-right">{doctor.noShows}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span>{doctor.completionRate}%</span>
                          {doctor.trend === "up" ? (
                            <ArrowUpIcon className="h-4 w-4 text-green-500" />
                          ) : (
                            <ArrowDownIcon className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Doctor Performance Comparison</CardTitle>
              <CardDescription>Visual comparison of key metrics across doctors</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={doctorPerformanceData}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="completed" stackId="a" fill="#82ca9d" name="Completed" />
                    <Bar dataKey="canceled" stackId="a" fill="#ff7300" name="Canceled" />
                    <Bar dataKey="noShows" stackId="a" fill="#8884d8" name="No-Shows" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="by-service" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Appointments by Service Type</CardTitle>
              <CardDescription>Distribution and trends of different service types</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={serviceOverTimeData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="generalCheckup" stroke="#8884d8" name="General Checkup" />
                    <Line type="monotone" dataKey="cardiology" stroke="#82ca9d" name="Cardiology" />
                    <Line type="monotone" dataKey="dermatology" stroke="#ffc658" name="Dermatology" />
                    <Line type="monotone" dataKey="orthopedics" stroke="#ff7300" name="Orthopedics" />
                    <Line type="monotone" dataKey="pediatrics" stroke="#0088fe" name="Pediatrics" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Service Popularity</CardTitle>
              <CardDescription>Most requested services ranked by volume</CardDescription>
            </CardHeader>
            <CardContent>
              <Table className="whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-right">Appointments</TableHead>
                    <TableHead className="text-right">Avg. Duration</TableHead>
                    <TableHead className="text-right">Trend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="whitespace-nowrap">
                  {serviceStats.map((service) => (
                    <TableRow key={service.id}>
                      <TableCell className="font-medium">{service.name}</TableCell>
                      <TableCell>{service.department}</TableCell>
                      <TableCell className="text-right">{service.count}</TableCell>
                      <TableCell className="text-right">{service.avgDuration}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {service.trend === "up" ? (
                            <>
                              <span className="text-green-500">+{service.trendValue}%</span>
                              <ArrowUpIcon className="h-4 w-4 text-green-500" />
                            </>
                          ) : (
                            <>
                              <span className="text-red-500">-{service.trendValue}%</span>
                              <ArrowDownIcon className="h-4 w-4 text-red-500" />
                            </>
                          )}
                        </div>
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

// Chart colors
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"]

// Sample data for the charts
const statusDistributionData = [
  { name: "Completed", value: 876 },
  { name: "Scheduled", value: 100 },
  { name: "Canceled", value: 187 },
  { name: "No-Show", value: 85 },
]

const departmentData = [
  { name: "Cardiology", appointments: 245 },
  { name: "Neurology", appointments: 187 },
  { name: "Orthopedics", appointments: 201 },
  { name: "Pediatrics", appointments: 224 },
  { name: "Dermatology", appointments: 163 },
  { name: "General Medicine", appointments: 228 },
]

const monthlyTrendsData = [
  { month: "Jan", total: 120, completed: 95, canceled: 15, noShows: 10 },
  { month: "Feb", total: 135, completed: 110, canceled: 18, noShows: 7 },
  { month: "Mar", total: 150, completed: 125, canceled: 15, noShows: 10 },
  { month: "Apr", total: 145, completed: 115, canceled: 20, noShows: 10 },
  { month: "May", total: 160, completed: 130, canceled: 22, noShows: 8 },
  { month: "Jun", total: 175, completed: 145, canceled: 20, noShows: 10 },
  { month: "Jul", total: 190, completed: 155, canceled: 25, noShows: 10 },
  { month: "Aug", total: 180, completed: 150, canceled: 20, noShows: 10 },
  { month: "Sep", total: 195, completed: 160, canceled: 25, noShows: 10 },
  { month: "Oct", total: 210, completed: 175, canceled: 25, noShows: 10 },
  { month: "Nov", total: 225, completed: 185, canceled: 30, noShows: 10 },
  { month: "Dec", total: 240, completed: 200, canceled: 30, noShows: 10 },
]

const weeklyDistributionData = [
  { day: "Mon", appointments: 45 },
  { day: "Tue", appointments: 52 },
  { day: "Wed", appointments: 48 },
  { day: "Thu", appointments: 50 },
  { day: "Fri", appointments: 40 },
  { day: "Sat", appointments: 35 },
  { day: "Sun", appointments: 15 },
]

const hourlyDistributionData = [
  { hour: "8 AM", appointments: 15 },
  { hour: "9 AM", appointments: 25 },
  { hour: "10 AM", appointments: 30 },
  { hour: "11 AM", appointments: 28 },
  { hour: "12 PM", appointments: 20 },
  { hour: "1 PM", appointments: 18 },
  { hour: "2 PM", appointments: 25 },
  { hour: "3 PM", appointments: 30 },
  { hour: "4 PM", appointments: 25 },
  { hour: "5 PM", appointments: 15 },
]

const doctorPerformanceData = [
  { name: "Dr. Smith", completed: 198, canceled: 32, noShows: 15 },
  { name: "Dr. Johnson", completed: 156, canceled: 21, noShows: 10 },
  { name: "Dr. Williams", completed: 129, canceled: 24, noShows: 10 },
  { name: "Dr. Brown", completed: 172, canceled: 19, noShows: 10 },
  { name: "Dr. Jones", completed: 183, canceled: 29, noShows: 12 },
]

const serviceOverTimeData = [
  { month: "Jan", generalCheckup: 45, cardiology: 30, dermatology: 25, orthopedics: 20, pediatrics: 35 },
  { month: "Feb", generalCheckup: 50, cardiology: 35, dermatology: 28, orthopedics: 22, pediatrics: 38 },
  { month: "Mar", generalCheckup: 55, cardiology: 38, dermatology: 30, orthopedics: 25, pediatrics: 40 },
  { month: "Apr", generalCheckup: 52, cardiology: 36, dermatology: 29, orthopedics: 24, pediatrics: 39 },
  { month: "May", generalCheckup: 58, cardiology: 40, dermatology: 32, orthopedics: 27, pediatrics: 42 },
  { month: "Jun", generalCheckup: 62, cardiology: 42, dermatology: 34, orthopedics: 29, pediatrics: 45 },
]

// Sample data for the tables
const appointmentData = [
  {
    id: 1,
    patient: "Emma Thompson",
    doctor: "Dr. Smith",
    dateTime: "Today, 9:30 AM",
    service: "General Checkup",
    status: "Completed",
  },
  {
    id: 2,
    patient: "James Wilson",
    doctor: "Dr. Johnson",
    dateTime: "Today, 10:15 AM",
    service: "Cardiology Consultation",
    status: "Completed",
  },
  {
    id: 3,
    patient: "Sophia Martinez",
    doctor: "Dr. Williams",
    dateTime: "Today, 11:00 AM",
    service: "Dermatology Screening",
    status: "Canceled",
  },
  {
    id: 4,
    patient: "Liam Anderson",
    doctor: "Dr. Brown",
    dateTime: "Today, 1:30 PM",
    service: "Orthopedic Evaluation",
    status: "Scheduled",
  },
  {
    id: 5,
    patient: "Olivia Taylor",
    doctor: "Dr. Jones",
    dateTime: "Today, 2:45 PM",
    service: "Pediatric Checkup",
    status: "Scheduled",
  },
  {
    id: 6,
    patient: "Noah Garcia",
    doctor: "Dr. Smith",
    dateTime: "Today, 3:30 PM",
    service: "Neurology Consultation",
    status: "Scheduled",
  },
  {
    id: 7,
    patient: "Ava Rodriguez",
    doctor: "Dr. Johnson",
    dateTime: "Yesterday, 9:00 AM",
    service: "General Checkup",
    status: "Completed",
  },
  {
    id: 8,
    patient: "William Lee",
    doctor: "Dr. Williams",
    dateTime: "Yesterday, 10:30 AM",
    service: "Cardiology Consultation",
    status: "No-Show",
  },
  {
    id: 9,
    patient: "Isabella Hernandez",
    doctor: "Dr. Brown",
    dateTime: "Yesterday, 1:15 PM",
    service: "Dermatology Screening",
    status: "Completed",
  },
  {
    id: 10,
    patient: "Mason Lopez",
    doctor: "Dr. Jones",
    dateTime: "Yesterday, 3:00 PM",
    service: "Orthopedic Evaluation",
    status: "Canceled",
  },
]

const doctorStats = [
  {
    id: 1,
    name: "Dr. Smith",
    department: "General Medicine",
    total: 245,
    completed: 198,
    canceled: 32,
    noShows: 15,
    completionRate: 80.8,
    trend: "up",
  },
  {
    id: 2,
    name: "Dr. Johnson",
    department: "Cardiology",
    total: 187,
    completed: 156,
    canceled: 21,
    noShows: 10,
    completionRate: 83.4,
    trend: "up",
  },
  {
    id: 3,
    name: "Dr. Williams",
    department: "Dermatology",
    total: 163,
    completed: 129,
    canceled: 24,
    noShows: 10,
    completionRate: 79.1,
    trend: "down",
  },
  {
    id: 4,
    name: "Dr. Brown",
    department: "Orthopedics",
    total: 201,
    completed: 172,
    canceled: 19,
    noShows: 10,
    completionRate: 85.6,
    trend: "up",
  },
  {
    id: 5,
    name: "Dr. Jones",
    department: "Pediatrics",
    total: 224,
    completed: 183,
    canceled: 29,
    noShows: 12,
    completionRate: 81.7,
    trend: "down",
  },
]

const serviceStats = [
  {
    id: 1,
    name: "General Checkup",
    department: "General Medicine",
    count: 312,
    avgDuration: "30 min",
    trend: "up",
    trendValue: 8.5,
  },
  {
    id: 2,
    name: "Cardiology Consultation",
    department: "Cardiology",
    count: 187,
    avgDuration: "45 min",
    trend: "up",
    trendValue: 12.3,
  },
  {
    id: 3,
    name: "Dermatology Screening",
    department: "Dermatology",
    count: 156,
    avgDuration: "25 min",
    trend: "down",
    trendValue: 3.2,
  },
  {
    id: 4,
    name: "Orthopedic Evaluation",
    department: "Orthopedics",
    count: 143,
    avgDuration: "40 min",
    trend: "up",
    trendValue: 5.7,
  },
  {
    id: 5,
    name: "Pediatric Checkup",
    department: "Pediatrics",
    count: 201,
    avgDuration: "35 min",
    trend: "down",
    trendValue: 2.1,
  },
]
