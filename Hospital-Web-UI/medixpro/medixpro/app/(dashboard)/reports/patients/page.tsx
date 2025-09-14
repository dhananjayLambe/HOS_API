"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePicker } from "@/components/date-range-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowDownIcon, ArrowUpIcon, DownloadIcon, FilterIcon, RefreshCwIcon, SearchIcon, UserIcon, UsersIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

// Sample data for charts
const visitTypesData = [
  { name: "Follow-up", value: 45 },
  { name: "New Patient", value: 25 },
  { name: "Consultation", value: 20 },
  { name: "Emergency", value: 10 },
];

const visitOutcomesData = [
  { name: "Resolved", value: 40 },
  { name: "Follow-up Required", value: 35 },
  { name: "Referred to Specialist", value: 15 },
  { name: "Hospitalized", value: 10 },
];

const ageDistributionData = [
  { name: "0-18", value: 15 },
  { name: "19-35", value: 25 },
  { name: "36-50", value: 30 },
  { name: "51-65", value: 20 },
  { name: "65+", value: 10 },
];

const genderDistributionData = [
  { name: "Female", value: 52 },
  { name: "Male", value: 47 },
  { name: "Other", value: 1 },
];

const monthlyVisitTrendsData = [
  { name: "Jan", visits: 320, newPatients: 45 },
  { name: "Feb", visits: 340, newPatients: 50 },
  { name: "Mar", visits: 360, newPatients: 55 },
  { name: "Apr", visits: 400, newPatients: 60 },
  { name: "May", visits: 420, newPatients: 65 },
  { name: "Jun", visits: 450, newPatients: 70 },
  { name: "Jul", visits: 480, newPatients: 75 },
  { name: "Aug", visits: 460, newPatients: 70 },
  { name: "Sep", visits: 440, newPatients: 65 },
  { name: "Oct", visits: 420, newPatients: 60 },
  { name: "Nov", visits: 400, newPatients: 55 },
  { name: "Dec", visits: 380, newPatients: 50 },
];

const visitsByDayData = [
  { name: "Monday", visits: 180 },
  { name: "Tuesday", visits: 200 },
  { name: "Wednesday", visits: 210 },
  { name: "Thursday", visits: 190 },
  { name: "Friday", visits: 170 },
  { name: "Saturday", visits: 120 },
  { name: "Sunday", visits: 80 },
];

const topConditionsData = [
  { name: "Hypertension", value: 25 },
  { name: "Diabetes", value: 18 },
  { name: "Respiratory Infections", value: 15 },
  { name: "Arthritis", value: 12 },
  { name: "Anxiety/Depression", value: 10 },
  { name: "Other", value: 20 },
];

const conditionTrendsData = [
  { name: "Jan", hypertension: 120, diabetes: 80, respiratory: 60 },
  { name: "Feb", hypertension: 125, diabetes: 85, respiratory: 55 },
  { name: "Mar", hypertension: 130, diabetes: 90, respiratory: 65 },
  { name: "Apr", hypertension: 135, diabetes: 95, respiratory: 75 },
  { name: "May", hypertension: 140, diabetes: 100, respiratory: 85 },
  { name: "Jun", hypertension: 145, diabetes: 105, respiratory: 95 },
];

// Colors for charts
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

export default function PatientVisitReportPage() {
  const [date, setDate] = useState<{ from: Date; to?: Date }>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Patient Visit Report</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm">
              <DownloadIcon className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button variant="outline" size="sm">
              <RefreshCwIcon className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground">Track patient visits, demographics, and health trends</p>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <DateRangePicker />
          <Select defaultValue="all">
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              <SelectItem value="cardiology">Cardiology</SelectItem>
              <SelectItem value="neurology">Neurology</SelectItem>
              <SelectItem value="pediatrics">Pediatrics</SelectItem>
              <SelectItem value="orthopedics">Orthopedics</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="all">
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Doctor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Doctors</SelectItem>
              <SelectItem value="dr-smith">Dr. Smith</SelectItem>
              <SelectItem value="dr-johnson">Dr. Johnson</SelectItem>
              <SelectItem value="dr-williams">Dr. Williams</SelectItem>
              <SelectItem value="dr-brown">Dr. Brown</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="relative w-full md:w-[320px]">
          <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input type="search" placeholder="Search patients..." className="w-full pl-8" />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
            <UsersIcon className="size-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <h2 className="text-2xl xl:text-4xl mb-2 font-bold">3,842</h2>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-500">+12.5%</span> from previous period
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">New Patients</CardTitle>
            <UserIcon className="size-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <h2 className="text-2xl xl:text-4xl mb-2 font-bold">428</h2>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-500">+8.2%</span> from previous period
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg. Visit Duration</CardTitle>
            <Badge variant="outline" className="px-1.5 py-0.5 text-xs">
              32 min
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">32 min</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-red-500">-2.5 min</span> from previous period
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">No-Show Rate</CardTitle>
            <Badge variant="outline" className="px-1.5 py-0.5 text-xs">
              6.8%
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">6.8%</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-500">-0.5%</span> from previous period
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="demographics">Demographics</TabsTrigger>
          <TabsTrigger value="trends">Visit Trends</TabsTrigger>
          <TabsTrigger value="conditions">Conditions</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-6">
          <div className="md:grid max-md:space-y-6 gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Visit Types</CardTitle>
                <CardDescription>Distribution of patient visits by type</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <ChartContainer
                  config={{
                    followUp: {
                      label: "Follow-up",
                      color: "hsl(var(--chart-1))",
                    },
                    newPatient: {
                      label: "New Patient",
                      color: "hsl(var(--chart-2))",
                    },
                    consultation: {
                      label: "Consultation",
                      color: "hsl(var(--chart-3))",
                    },
                    emergency: {
                      label: "Emergency",
                      color: "hsl(var(--chart-4))",
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={visitTypesData} cx="50%" cy="50%" labelLine={false} outerRadius={80} fill="#8884d8" dataKey="value" label={false}>
                        {visitTypesData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>            
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Visit Outcomes</CardTitle>
                <CardDescription>Outcomes of patient visits</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <ChartContainer
                  config={{
                    resolved: {
                      label: "Resolved",
                      color: "hsl(var(--chart-1))",
                    },
                    followUp: {
                      label: "Follow-up Required",
                      color: "hsl(var(--chart-2))",
                    },
                    referred: {
                      label: "Referred to Specialist",
                      color: "hsl(var(--chart-3))",
                    },
                    hospitalized: {
                      label: "Hospitalized",
                      color: "hsl(var(--chart-4))",
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={visitOutcomesData} cx="50%" cy="50%" labelLine={false} outerRadius={80} fill="#8884d8" dataKey="value" label={false}>
                        {visitOutcomesData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />                     
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle>Recent Patient Visits</CardTitle>
                  <CardDescription>Latest patient visits and their details</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <FilterIcon className="mr-2 h-4 w-4" />
                  Filter
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table className="whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Visit Date</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Visit Type</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="whitespace-nowrap">
                  <TableRow>
                    <TableCell className="font-medium">Sarah Johnson</TableCell>
                    <TableCell>Apr 18, 2023</TableCell>
                    <TableCell>Cardiology</TableCell>
                    <TableCell>Dr. Smith</TableCell>
                    <TableCell>Follow-up</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-500 text-white">
                        Completed
                      </Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Michael Brown</TableCell>
                    <TableCell>Apr 18, 2023</TableCell>
                    <TableCell>Orthopedics</TableCell>
                    <TableCell>Dr. Williams</TableCell>
                    <TableCell>New Patient</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-500 text-white">
                        Completed
                      </Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Emily Davis</TableCell>
                    <TableCell>Apr 17, 2023</TableCell>
                    <TableCell>Pediatrics</TableCell>
                    <TableCell>Dr. Johnson</TableCell>
                    <TableCell>Follow-up</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-500 text-white">
                        Completed
                      </Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">James Wilson</TableCell>
                    <TableCell>Apr 17, 2023</TableCell>
                    <TableCell>Neurology</TableCell>
                    <TableCell>Dr. Brown</TableCell>
                    <TableCell>Consultation</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-500 text-white">
                        Completed
                      </Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Olivia Martinez</TableCell>
                    <TableCell>Apr 16, 2023</TableCell>
                    <TableCell>Cardiology</TableCell>
                    <TableCell>Dr. Smith</TableCell>
                    <TableCell>New Patient</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-500 text-white">
                        Completed
                      </Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="demographics" className="space-y-6">
          <div className="md:grid max-md:space-y-6 gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Age Distribution</CardTitle>
                <CardDescription>Patient visits by age group</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    value: {
                      label: "Patients",
                      color: "hsl(var(--chart-1))",
                    },
                  }}
                  className="h-[250px] w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ageDistributionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />
                      <Bar dataKey="value" fill="#8884d8" name="Patients" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Gender Distribution</CardTitle>
                <CardDescription>Patient visits by gender</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    female: {
                      label: "Female",
                      color: "hsl(var(--chart-1))",
                    },
                    male: {
                      label: "Male",
                      color: "hsl(var(--chart-2))",
                    },
                    other: {
                      label: "Other",
                      color: "hsl(var(--chart-3))",
                    },
                  }}
                  className="h-[300px] w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart width={400} height={300}>
                      <Pie
                        data={genderDistributionData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius="80%"
                        fill="#8884d8"
                        dataKey="value"
                        label={false}
                      >
                        {genderDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      {/* <ChartTooltip content={<ChartTooltipContent />} /> */}
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle>Geographic Distribution</CardTitle>
                  <CardDescription>Patient visits by location</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <DownloadIcon className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table className="whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead>Location</TableHead>
                    <TableHead>Patients</TableHead>
                    <TableHead>% of Total</TableHead>
                    <TableHead>Avg. Visits</TableHead>
                    <TableHead>Change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="whitespace-nowrap">
                  <TableRow>
                    <TableCell className="font-medium">Downtown</TableCell>
                    <TableCell>1,245</TableCell>
                    <TableCell>32.4%</TableCell>
                    <TableCell>2.8</TableCell>
                    <TableCell className="text-green-500">
                      <div className="flex items-center">
                        <ArrowUpIcon className="mr-1 h-4 w-4" />
                        4.2%
                      </div>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">North Side</TableCell>
                    <TableCell>986</TableCell>
                    <TableCell>25.7%</TableCell>
                    <TableCell>2.4</TableCell>
                    <TableCell className="text-green-500">
                      <div className="flex items-center">
                        <ArrowUpIcon className="mr-1 h-4 w-4" />
                        3.1%
                      </div>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">West End</TableCell>
                    <TableCell>745</TableCell>
                    <TableCell>19.4%</TableCell>
                    <TableCell>2.1</TableCell>
                    <TableCell className="text-red-500">
                      <div className="flex items-center">
                        <ArrowDownIcon className="mr-1 h-4 w-4" />
                        1.8%
                      </div>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">East Side</TableCell>
                    <TableCell>542</TableCell>
                    <TableCell>14.1%</TableCell>
                    <TableCell>1.9</TableCell>
                    <TableCell className="text-green-500">
                      <div className="flex items-center">
                        <ArrowUpIcon className="mr-1 h-4 w-4" />
                        2.5%
                      </div>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">South County</TableCell>
                    <TableCell>324</TableCell>
                    <TableCell>8.4%</TableCell>
                    <TableCell>1.6</TableCell>
                    <TableCell className="text-red-500">
                      <div className="flex items-center">
                        <ArrowDownIcon className="mr-1 h-4 w-4" />
                        0.7%
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="trends" className="space-y-6">
          <div className="md:grid max-md:space-y-6 gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Visit Trends</CardTitle>
                <CardDescription>Patient visits over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    visits: {
                      label: "Total Visits",
                      color: "hsl(var(--chart-1))",
                    },
                    newPatients: {
                      label: "New Patients",
                      color: "hsl(var(--chart-2))",
                    },
                  }}
                  className="h-[300px] w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={monthlyVisitTrendsData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12 }}
                        interval="preserveStartEnd"
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line
                        type="monotone"
                        dataKey="visits"
                        stroke="hsl(var(--chart-1))"
                        name="Total Visits"
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="newPatients"
                        stroke="hsl(var(--chart-2))"
                        name="New Patients"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Visit Distribution by Day</CardTitle>
                <CardDescription>Patient visits by day of week</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    visits: {
                      label: "Visits",
                      color: "hsl(var(--chart-1))",
                    },
                  }}
                  className="h-[300px] w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={visitsByDayData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name"
                        tick={{ fontSize: 12 }}
                        interval="preserveStartEnd"
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar 
                        dataKey="visits" 
                        fill="hsl(var(--chart-1))" 
                        name="Visits"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Visit Frequency</CardTitle>
                  <CardDescription>Patient visit frequency analysis</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <FilterIcon className="mr-2 h-4 w-4" />
                  Filter
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table className="whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead>Visit Frequency</TableHead>
                    <TableHead>Patients</TableHead>
                    <TableHead>% of Total</TableHead>
                    <TableHead>Avg. Duration</TableHead>
                    <TableHead>Change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="whitespace-nowrap">
                  <TableRow>
                    <TableCell className="font-medium">First-time</TableCell>
                    <TableCell>428</TableCell>
                    <TableCell>11.1%</TableCell>
                    <TableCell>42 min</TableCell>
                    <TableCell className="text-green-500">
                      <div className="flex items-center">
                        <ArrowUpIcon className="mr-1 h-4 w-4" />
                        8.2%
                      </div>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">2-5 visits</TableCell>
                    <TableCell>1,245</TableCell>
                    <TableCell>32.4%</TableCell>
                    <TableCell>34 min</TableCell>
                    <TableCell className="text-green-500">
                      <div className="flex items-center">
                        <ArrowUpIcon className="mr-1 h-4 w-4" />
                        5.4%
                      </div>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">6-10 visits</TableCell>
                    <TableCell>986</TableCell>
                    <TableCell>25.7%</TableCell>
                    <TableCell>28 min</TableCell>
                    <TableCell className="text-green-500">
                      <div className="flex items-center">
                        <ArrowUpIcon className="mr-1 h-4 w-4" />
                        3.8%
                      </div>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">11-20 visits</TableCell>
                    <TableCell>745</TableCell>
                    <TableCell>19.4%</TableCell>
                    <TableCell>25 min</TableCell>
                    <TableCell className="text-red-500">
                      <div className="flex items-center">
                        <ArrowDownIcon className="mr-1 h-4 w-4" />
                        1.2%
                      </div>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">20+ visits</TableCell>
                    <TableCell>438</TableCell>
                    <TableCell>11.4%</TableCell>
                    <TableCell>22 min</TableCell>
                    <TableCell className="text-red-500">
                      <div className="flex items-center">
                        <ArrowDownIcon className="mr-1 h-4 w-4" />
                        2.5%
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="conditions" className="space-y-6">
          <div className="md:grid max-md:space-y-6 gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Conditions</CardTitle>
                <CardDescription>Most common patient conditions</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    hypertension: {
                      label: "Hypertension",
                      color: "hsl(var(--chart-1))",
                    },
                    diabetes: {
                      label: "Diabetes",
                      color: "hsl(var(--chart-2))",
                    },
                    respiratory: {
                      label: "Respiratory Infections",
                      color: "hsl(var(--chart-3))",
                    },
                    arthritis: {
                      label: "Arthritis",
                      color: "hsl(var(--chart-4))",
                    },
                    anxiety: {
                      label: "Anxiety/Depression",
                      color: "hsl(var(--chart-5))",
                    },
                    other: {
                      label: "Other",
                      color: "hsl(var(--chart-6))",
                    },
                  }}
                  className="h-[300px] w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={topConditionsData} cx="50%" cy="50%" labelLine={false} outerRadius={80} fill="#8884d8" dataKey="value" label={false}>
                        {topConditionsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      {/* <Legend /> */}
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Condition Trends</CardTitle>
                <CardDescription>Trends in patient conditions over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    hypertension: {
                      label: "Hypertension",
                      color: "hsl(var(--chart-1))",
                    },
                    diabetes: {
                      label: "Diabetes",
                      color: "hsl(var(--chart-2))",
                    },
                    respiratory: {
                      label: "Respiratory Infections",
                      color: "hsl(var(--chart-3))",
                    },
                  }}
                  className="h-[300px] w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={conditionTrendsData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={70}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Line
                        type="monotone"
                        dataKey="hypertension"
                        stroke="hsl(var(--chart-1))"
                        name="Hypertension"
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="diabetes"
                        stroke="hsl(var(--chart-2))"
                        name="Diabetes"
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="respiratory"
                        stroke="hsl(var(--chart-3))"
                        name="Respiratory Infections"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Condition by Department</CardTitle>
                  <CardDescription>Distribution of conditions by department</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <DownloadIcon className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table className="whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead>Top Condition</TableHead>
                    <TableHead>Cases</TableHead>
                    <TableHead>% of Dept</TableHead>
                    <TableHead>Avg. Visits</TableHead>
                    <TableHead>Change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="whitespace-nowrap">
                  <TableRow>
                    <TableCell className="font-medium">Cardiology</TableCell>
                    <TableCell>Hypertension</TableCell>
                    <TableCell>428</TableCell>
                    <TableCell>42.8%</TableCell>
                    <TableCell>4.2</TableCell>
                    <TableCell className="text-green-500">
                      <div className="flex items-center">
                        <ArrowUpIcon className="mr-1 h-4 w-4" />
                        2.4%
                      </div>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Orthopedics</TableCell>
                    <TableCell>Osteoarthritis</TableCell>
                    <TableCell>356</TableCell>
                    <TableCell>38.2%</TableCell>
                    <TableCell>3.8</TableCell>
                    <TableCell className="text-green-500">
                      <div className="flex items-center">
                        <ArrowUpIcon className="mr-1 h-4 w-4" />
                        1.8%
                      </div>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Neurology</TableCell>
                    <TableCell>Migraine</TableCell>
                    <TableCell>245</TableCell>
                    <TableCell>32.4%</TableCell>
                    <TableCell>5.2</TableCell>
                    <TableCell className="text-red-500">
                      <div className="flex items-center">
                        <ArrowDownIcon className="mr-1 h-4 w-4" />
                        0.7%
                      </div>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Pediatrics</TableCell>
                    <TableCell>Respiratory Infection</TableCell>
                    <TableCell>312</TableCell>
                    <TableCell>45.6%</TableCell>
                    <TableCell>2.4</TableCell>
                    <TableCell className="text-green-500">
                      <div className="flex items-center">
                        <ArrowUpIcon className="mr-1 h-4 w-4" />
                        4.2%
                      </div>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Dermatology</TableCell>
                    <TableCell>Eczema</TableCell>
                    <TableCell>186</TableCell>
                    <TableCell>28.4%</TableCell>
                    <TableCell>3.1</TableCell>
                    <TableCell className="text-green-500">
                      <div className="flex items-center">
                        <ArrowUpIcon className="mr-1 h-4 w-4" />
                        1.2%
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
