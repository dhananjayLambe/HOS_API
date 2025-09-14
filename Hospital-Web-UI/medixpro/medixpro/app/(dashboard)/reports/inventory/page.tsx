"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DateRangePicker } from "@/components/date-range-picker"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  DownloadIcon,
  FilterIcon,
  PackageIcon,
  RefreshCwIcon,
  SearchIcon,
  TruckIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

// Sample data for charts
const inventoryCategoryData = [
  { name: "Medications", value: 428, color: "#8884d8" },
  { name: "Medical Supplies", value: 356, color: "#82ca9d" },
  { name: "Equipment", value: 124, color: "#ffc658" },
  { name: "Office Supplies", value: 215, color: "#ff8042" },
  { name: "Laboratory", value: 122, color: "#0088fe" },
]

const stockStatusData = [
  { name: "In Stock", value: 1121, color: "#4ade80" },
  { name: "Low Stock", value: 86, color: "#facc15" },
  { name: "Out of Stock", value: 38, color: "#f87171" },
]

const stockLevelTrendsData = [
  { month: "Jan", medications: 380, supplies: 320, equipment: 110, office: 190, laboratory: 105 },
  { month: "Feb", medications: 390, supplies: 330, equipment: 115, office: 195, laboratory: 110 },
  { month: "Mar", medications: 400, supplies: 340, equipment: 120, office: 200, laboratory: 115 },
  { month: "Apr", medications: 410, supplies: 335, equipment: 118, office: 205, laboratory: 112 },
  { month: "May", medications: 420, supplies: 345, equipment: 122, office: 210, laboratory: 118 },
  { month: "Jun", medications: 428, supplies: 356, equipment: 124, office: 215, laboratory: 122 },
]

const reorderFrequencyData = [
  { name: "Weekly", value: 18 },
  { name: "Bi-weekly", value: 32 },
  { name: "Monthly", value: 45 },
  { name: "Quarterly", value: 25 },
  { name: "Annually", value: 5 },
]

const monthlyUsageData = [
  { month: "Jan", medications: 42, supplies: 35, equipment: 8, office: 22, laboratory: 15 },
  { month: "Feb", medications: 45, supplies: 38, equipment: 7, office: 24, laboratory: 16 },
  { month: "Mar", medications: 48, supplies: 40, equipment: 9, office: 25, laboratory: 18 },
  { month: "Apr", medications: 52, supplies: 42, equipment: 8, office: 26, laboratory: 17 },
  { month: "May", medications: 55, supplies: 45, equipment: 10, office: 28, laboratory: 19 },
  { month: "Jun", medications: 58, supplies: 48, equipment: 9, office: 30, laboratory: 20 },
]

const topUsedItemsData = [
  { name: "Surgical Gloves", value: 245 },
  { name: "Syringes", value: 210 },
  { name: "Gauze Pads", value: 185 },
  { name: "Ibuprofen", value: 165 },
  { name: "Bandages", value: 140 },
]

const supplierDistributionData = [
  { name: "Medline Industries", value: 324, color: "#8884d8" },
  { name: "McKesson", value: 286, color: "#82ca9d" },
  { name: "Cardinal Health", value: 245, color: "#ffc658" },
  { name: "Henry Schein", value: 198, color: "#ff8042" },
  { name: "Owens & Minor", value: 192, color: "#0088fe" },
]

const orderFulfillmentData = [
  { name: "Medline Industries", fulfillment: 98.2, delivery: 2.4 },
  { name: "McKesson", fulfillment: 96.8, delivery: 3.1 },
  { name: "Cardinal Health", fulfillment: 97.5, delivery: 2.8 },
  { name: "Henry Schein", fulfillment: 95.4, delivery: 3.5 },
  { name: "Owens & Minor", fulfillment: 94.8, delivery: 3.8 },
]

// Custom pie chart label
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }:any) => {
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  return (
    <text x={x} y={y} fill="white" textAnchor={x > cx ? "start" : "end"} dominantBaseline="central">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export default function InventoryReportPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Inventory Report</h1>
          <div className="flex items-center gap-2">
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
        <p className="text-muted-foreground">Track inventory levels, usage patterns, and supply chain metrics</p>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <DateRangePicker />
          <Select defaultValue="all">
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="medications">Medications</SelectItem>
              <SelectItem value="supplies">Medical Supplies</SelectItem>
              <SelectItem value="equipment">Equipment</SelectItem>
              <SelectItem value="office">Office Supplies</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="all">
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Supplier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Suppliers</SelectItem>
              <SelectItem value="medline">Medline Industries</SelectItem>
              <SelectItem value="mckesson">McKesson</SelectItem>
              <SelectItem value="cardinal">Cardinal Health</SelectItem>
              <SelectItem value="henry">Henry Schein</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="relative w-full md:w-[320px]">
          <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input type="search" placeholder="Search inventory items..." className="w-full pl-8" />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <PackageIcon className="size-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,245</div>
            <p className="text-xs text-muted-foreground">+28 items since last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <Badge variant="destructive" className="px-1.5 py-0.5 text-xs">
              32
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.6%</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-red-500">+0.8%</span> from previous period
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <Badge variant="warning" className="bg-yellow-500 px-1.5 py-0.5 text-xs text-white">
              18
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1.4%</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-500">-0.5%</span> from previous period
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
            <TruckIcon className="size-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$248,320</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-500">+4.3%</span> from previous period
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="stock">Stock Levels</TabsTrigger>
          <TabsTrigger value="usage">Usage Trends</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-6">
          <div className="md:grid max-md:space-y-6 gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Inventory by Category</CardTitle>
                <CardDescription>Distribution of inventory items by category</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <ChartContainer
                  config={{
                    medications: {
                      label: "Medications",
                      color: "#8884d8",
                    },
                    supplies: {
                      label: "Medical Supplies",
                      color: "#82ca9d",
                    },
                    equipment: {
                      label: "Equipment",
                      color: "#ffc658",
                    },
                    office: {
                      label: "Office Supplies",
                      color: "#ff8042",
                    },
                    laboratory: {
                      label: "Laboratory",
                      color: "#0088fe",
                    },
                  }}
                  className="h-[300px] w-full max-w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={inventoryCategoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {inventoryCategoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Stock Status Distribution</CardTitle>
                <CardDescription>Current stock status of inventory items</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <ChartContainer
                  config={{
                    inStock: {
                      label: "In Stock",
                      color: "#4ade80",
                    },
                    lowStock: {
                      label: "Low Stock",
                      color: "#facc15",
                    },
                    outOfStock: {
                      label: "Out of Stock",
                      color: "#f87171",
                    },
                  }}
                  className="h-[300px] w-full max-w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stockStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {stockStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend 
                        layout="horizontal"
                        verticalAlign="bottom"
                        align="center"
                        wrapperStyle={{
                          paddingTop: "20px",
                          fontSize: "12px"
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <CardTitle>Top Low Stock Items</CardTitle>
                  <CardDescription>Items that need immediate attention</CardDescription>
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
                    <TableHead>Item Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Reorder Level</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="whitespace-nowrap">
                  <TableRow>
                    <TableCell className="font-medium">Surgical Gloves (M)</TableCell>
                    <TableCell>Medical Supplies</TableCell>
                    <TableCell>24 boxes</TableCell>
                    <TableCell>50 boxes</TableCell>
                    <TableCell>Medline Industries</TableCell>
                    <TableCell>
                      <Badge variant="destructive">Critical</Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Ibuprofen 200mg</TableCell>
                    <TableCell>Medications</TableCell>
                    <TableCell>15 bottles</TableCell>
                    <TableCell>30 bottles</TableCell>
                    <TableCell>McKesson</TableCell>
                    <TableCell>
                      <Badge variant="destructive">Critical</Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Gauze Pads 4x4</TableCell>
                    <TableCell>Medical Supplies</TableCell>
                    <TableCell>32 packs</TableCell>
                    <TableCell>60 packs</TableCell>
                    <TableCell>Cardinal Health</TableCell>
                    <TableCell>
                      <Badge variant="warning" className="bg-yellow-500 text-white">
                        Low
                      </Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Syringes 5ml</TableCell>
                    <TableCell>Medical Supplies</TableCell>
                    <TableCell>45 boxes</TableCell>
                    <TableCell>75 boxes</TableCell>
                    <TableCell>Henry Schein</TableCell>
                    <TableCell>
                      <Badge variant="warning" className="bg-yellow-500 text-white">
                        Low
                      </Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Amoxicillin 500mg</TableCell>
                    <TableCell>Medications</TableCell>
                    <TableCell>18 bottles</TableCell>
                    <TableCell>25 bottles</TableCell>
                    <TableCell>McKesson</TableCell>
                    <TableCell>
                      <Badge variant="warning" className="bg-yellow-500 text-white">
                        Low
                      </Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="stock" className="space-y-6">
          <div className="md:grid max-md:space-y-6 gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Stock Level Trends</CardTitle>
                <CardDescription>Stock level changes over the past 6 months</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <ChartContainer
                  config={{
                    medications: {
                      label: "Medications",
                      color: "hsl(var(--chart-1))",
                    },
                    supplies: {
                      label: "Medical Supplies",
                      color: "hsl(var(--chart-2))",
                    },
                    equipment: {
                      label: "Equipment",
                      color: "hsl(var(--chart-3))",
                    },
                    office: {
                      label: "Office Supplies",
                      color: "hsl(var(--chart-4))",
                    },
                    laboratory: {
                      label: "Laboratory",
                      color: "hsl(var(--chart-5))",
                    },
                  }}
                  className="h-[300px] w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart 
                      data={stockLevelTrendsData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={70}
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        width={60}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend 
                        wrapperStyle={{ fontSize: '12px' }}
                        layout="horizontal"
                        verticalAlign="top"
                        align="center"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="medications" 
                        stroke="hsl(var(--chart-1))" 
                        strokeWidth={2} 
                        dot={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="supplies" 
                        stroke="hsl(var(--chart-2))" 
                        strokeWidth={2} 
                        dot={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="equipment" 
                        stroke="hsl(var(--chart-3))" 
                        strokeWidth={2} 
                        dot={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="office" 
                        stroke="hsl(var(--chart-4))" 
                        strokeWidth={2} 
                        dot={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="laboratory" 
                        stroke="hsl(var(--chart-5))" 
                        strokeWidth={2} 
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Reorder Frequency</CardTitle>
                <CardDescription>How often items need to be reordered</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <ChartContainer
                  config={{
                    value: {
                      label: "Items",
                      color: "hsl(var(--chart-1))",
                    },
                  }}
                  className="h-[300px] w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={reorderFrequencyData} 
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        type="number"
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={100}
                        tick={{ fontSize: 12 }}
                        tickMargin={5}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend 
                        wrapperStyle={{ fontSize: '12px' }}
                        verticalAlign="bottom"
                        height={36}
                      />
                      <Bar 
                        dataKey="value" 
                        fill="hsl(var(--chart-1))" 
                        barSize={20} 
                        radius={[0, 2, 2, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <CardTitle>Stock Level by Category</CardTitle>
                  <CardDescription>Current stock levels across categories</CardDescription>
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
                    <TableHead>Category</TableHead>
                    <TableHead>Total Items</TableHead>
                    <TableHead>In Stock</TableHead>
                    <TableHead>Low Stock</TableHead>
                    <TableHead>Out of Stock</TableHead>
                    <TableHead>Stock Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="whitespace-nowrap">
                  <TableRow>
                    <TableCell className="font-medium">Medications</TableCell>
                    <TableCell>428</TableCell>
                    <TableCell>385</TableCell>
                    <TableCell>32</TableCell>
                    <TableCell>11</TableCell>
                    <TableCell>$124,850</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Medical Supplies</TableCell>
                    <TableCell>356</TableCell>
                    <TableCell>312</TableCell>
                    <TableCell>28</TableCell>
                    <TableCell>16</TableCell>
                    <TableCell>$68,420</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Equipment</TableCell>
                    <TableCell>124</TableCell>
                    <TableCell>118</TableCell>
                    <TableCell>4</TableCell>
                    <TableCell>2</TableCell>
                    <TableCell>$42,680</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Office Supplies</TableCell>
                    <TableCell>215</TableCell>
                    <TableCell>198</TableCell>
                    <TableCell>12</TableCell>
                    <TableCell>5</TableCell>
                    <TableCell>$12,370</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Laboratory</TableCell>
                    <TableCell>122</TableCell>
                    <TableCell>108</TableCell>
                    <TableCell>10</TableCell>
                    <TableCell>4</TableCell>
                    <TableCell>$36,480</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="usage" className="space-y-6">
          <div className="md:grid max-md:space-y-6 gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Usage Trends</CardTitle>
                <CardDescription>Inventory usage patterns over time</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <ChartContainer
                  config={{
                    medications: {
                      label: "Medications",
                      color: "hsl(var(--chart-1))",
                    },
                    supplies: {
                      label: "Medical Supplies",
                      color: "hsl(var(--chart-2))",
                    },
                    equipment: {
                      label: "Equipment",
                      color: "hsl(var(--chart-3))",
                    },
                    office: {
                      label: "Office Supplies",
                      color: "hsl(var(--chart-4))",
                    },
                    laboratory: {
                      label: "Laboratory",
                      color: "hsl(var(--chart-5))",
                    },
                  }}
                  className="h-[300px] w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={monthlyUsageData}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Area
                        type="monotone"
                        dataKey="medications"
                        stackId="1"
                        stroke="var(--color-medications)"
                        fill="var(--color-medications)"
                      />
                      <Area
                        type="monotone"
                        dataKey="supplies"
                        stackId="1"
                        stroke="var(--color-supplies)"
                        fill="var(--color-supplies)"
                      />
                      <Area
                        type="monotone"
                        dataKey="equipment"
                        stackId="1"
                        stroke="var(--color-equipment)"
                        fill="var(--color-equipment)"
                      />
                      <Area
                        type="monotone"
                        dataKey="office"
                        stackId="1"
                        stroke="var(--color-office)"
                        fill="var(--color-office)"
                      />
                      <Area
                        type="monotone"
                        dataKey="laboratory"
                        stackId="1"
                        stroke="var(--color-laboratory)"
                        fill="var(--color-laboratory)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Top Used Items</CardTitle>
                <CardDescription>Most frequently used inventory items</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <ChartContainer
                  config={{
                    value: {
                      label: "Usage Count",
                      color: "hsl(var(--chart-1))",
                    },
                  }}
                  className="h-[300px] w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={topUsedItemsData} 
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={100} 
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Bar 
                        dataKey="value" 
                        fill="var(--color-value)" 
                        barSize={20}
                        minPointSize={2}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <CardTitle>Usage by Department</CardTitle>
                  <CardDescription>Inventory consumption by department</CardDescription>
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
                    <TableHead>Department</TableHead>
                    <TableHead>Items Used</TableHead>
                    <TableHead>Usage Value</TableHead>
                    <TableHead>% of Total</TableHead>
                    <TableHead>Change</TableHead>
                    <TableHead>Top Item</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="whitespace-nowrap">
                  <TableRow>
                    <TableCell className="font-medium">Emergency</TableCell>
                    <TableCell>1,245</TableCell>
                    <TableCell>$28,450</TableCell>
                    <TableCell>24.8%</TableCell>
                    <TableCell className="text-green-500">
                      <div className="flex items-center">
                        <ArrowUpIcon className="mr-1 h-4 w-4" />
                        3.2%
                      </div>
                    </TableCell>
                    <TableCell>Surgical Gloves</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Surgery</TableCell>
                    <TableCell>986</TableCell>
                    <TableCell>$32,680</TableCell>
                    <TableCell>28.5%</TableCell>
                    <TableCell className="text-green-500">
                      <div className="flex items-center">
                        <ArrowUpIcon className="mr-1 h-4 w-4" />
                        5.4%
                      </div>
                    </TableCell>
                    <TableCell>Surgical Kits</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Pediatrics</TableCell>
                    <TableCell>645</TableCell>
                    <TableCell>$12,340</TableCell>
                    <TableCell>10.8%</TableCell>
                    <TableCell className="text-red-500">
                      <div className="flex items-center">
                        <ArrowDownIcon className="mr-1 h-4 w-4" />
                        1.8%
                      </div>
                    </TableCell>
                    <TableCell>Pediatric Masks</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Cardiology</TableCell>
                    <TableCell>528</TableCell>
                    <TableCell>$18,920</TableCell>
                    <TableCell>16.5%</TableCell>
                    <TableCell className="text-green-500">
                      <div className="flex items-center">
                        <ArrowUpIcon className="mr-1 h-4 w-4" />
                        2.1%
                      </div>
                    </TableCell>
                    <TableCell>ECG Electrodes</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Radiology</TableCell>
                    <TableCell>412</TableCell>
                    <TableCell>$14,680</TableCell>
                    <TableCell>12.8%</TableCell>
                    <TableCell className="text-red-500">
                      <div className="flex items-center">
                        <ArrowDownIcon className="mr-1 h-4 w-4" />
                        0.7%
                      </div>
                    </TableCell>
                    <TableCell>Contrast Media</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="suppliers" className="space-y-6">
          <div className="md:grid max-md:space-y-6 gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Supplier Distribution</CardTitle>
                <CardDescription>Inventory distribution by supplier</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <ChartContainer
                  config={{
                    medline: {
                      label: "Medline Industries",
                      color: "#8884d8",
                    },
                    mckesson: {
                      label: "McKesson",
                      color: "#82ca9d",
                    },
                    cardinal: {
                      label: "Cardinal Health",
                      color: "#ffc658",
                    },
                    henry: {
                      label: "Henry Schein",
                      color: "#ff8042",
                    },
                    owens: {
                      label: "Owens & Minor",
                      color: "#0088fe",
                    },
                  }}
                  className="h-[300px] w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={supplierDistributionData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderCustomizedLabel}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {supplierDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend 
                        layout="horizontal"
                        verticalAlign="bottom"
                        align="center"
                        wrapperStyle={{
                          paddingTop: "20px",
                          fontSize: "12px"
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Order Fulfillment Rate</CardTitle>
                <CardDescription>Order fulfillment performance by supplier</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <ChartContainer
                  config={{
                    fulfillment: {
                      label: "Fulfillment Rate (%)",
                      color: "hsl(var(--chart-1))",
                    },
                    delivery: {
                      label: "Avg. Delivery Time (days)",
                      color: "hsl(var(--chart-2))",
                    },
                  }}
                  className="h-[300px] w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={orderFulfillmentData}
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
                      <YAxis 
                        yAxisId="left" 
                        orientation="left" 
                        stroke="var(--color-fulfillment)"
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        yAxisId="right" 
                        orientation="right" 
                        stroke="var(--color-delivery)"
                        tick={{ fontSize: 12 }}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend 
                        wrapperStyle={{ fontSize: '12px' }}
                        layout="horizontal"
                        verticalAlign="bottom"
                        align="center"
                      />
                      <Bar 
                        yAxisId="left" 
                        dataKey="fulfillment" 
                        fill="var(--color-fulfillment)" 
                        barSize={20} 
                        name="Fulfillment Rate (%)"
                      />
                      <Bar 
                        yAxisId="right" 
                        dataKey="delivery" 
                        fill="var(--color-delivery)" 
                        barSize={20} 
                        name="Avg. Delivery Time (days)"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <CardTitle>Supplier Performance</CardTitle>
                  <CardDescription>Performance metrics for each supplier</CardDescription>
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
                    <TableHead>Supplier</TableHead>
                    <TableHead>Items Supplied</TableHead>
                    <TableHead>Order Value</TableHead>
                    <TableHead>Fulfillment Rate</TableHead>
                    <TableHead>Avg. Delivery Time</TableHead>
                    <TableHead>Quality Rating</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="whitespace-nowrap">
                  <TableRow>
                    <TableCell className="font-medium">Medline Industries</TableCell>
                    <TableCell>324</TableCell>
                    <TableCell>$68,450</TableCell>
                    <TableCell>98.2%</TableCell>
                    <TableCell>2.4 days</TableCell>
                    <TableCell>4.8/5</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">McKesson</TableCell>
                    <TableCell>286</TableCell>
                    <TableCell>$54,320</TableCell>
                    <TableCell>96.8%</TableCell>
                    <TableCell>3.1 days</TableCell>
                    <TableCell>4.6/5</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Cardinal Health</TableCell>
                    <TableCell>245</TableCell>
                    <TableCell>$48,680</TableCell>
                    <TableCell>97.5%</TableCell>
                    <TableCell>2.8 days</TableCell>
                    <TableCell>4.7/5</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Henry Schein</TableCell>
                    <TableCell>198</TableCell>
                    <TableCell>$36,920</TableCell>
                    <TableCell>95.4%</TableCell>
                    <TableCell>3.5 days</TableCell>
                    <TableCell>4.5/5</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Owens & Minor</TableCell>
                    <TableCell>192</TableCell>
                    <TableCell>$32,480</TableCell>
                    <TableCell>94.8%</TableCell>
                    <TableCell>3.8 days</TableCell>
                    <TableCell>4.4/5</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
