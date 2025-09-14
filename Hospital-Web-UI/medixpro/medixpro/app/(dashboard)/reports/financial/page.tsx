"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DateRangePicker } from "@/components/date-range-picker"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CreditCardIcon,
  DollarSignIcon,
  DownloadIcon,
  FilterIcon,
  RefreshCcwIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  WalletIcon,
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
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ComposedChart,
} from "recharts"
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"

export default function FinancialReportsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Financial Reports</h1>
        <p className="text-muted-foreground">Track revenue, expenses, and financial performance metrics</p>
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
          <Select defaultValue="all-services">
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Service" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-services">All Services</SelectItem>
              <SelectItem value="consultations">Consultations</SelectItem>
              <SelectItem value="procedures">Procedures</SelectItem>
              <SelectItem value="tests">Tests & Labs</SelectItem>
              <SelectItem value="surgeries">Surgeries</SelectItem>
              <SelectItem value="therapy">Therapy</SelectItem>
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

      <div className="md:grid max-md:space-y-4 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm xl:text-lg font-medium">Total Revenue</CardTitle>
            <DollarSignIcon className="size-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$128,450</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-500">+18.2%</span> from last month
            </p>
            <div className="mt-4 h-1 w-full rounded-full bg-secondary">
              <div className="h-1 w-[75%] rounded-full bg-primary"></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm xl:text-lg font-medium">Total Expenses</CardTitle>
            <WalletIcon className="size-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$87,325</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-red-500">+5.4%</span> from last month
            </p>
            <div className="mt-4 h-1 w-full rounded-full bg-secondary">
              <div className="h-1 w-[68%] rounded-full bg-red-500"></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm xl:text-lg font-medium">Net Profit</CardTitle>
            <TrendingUpIcon className="size-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$41,125</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-500">+12.8%</span> from last month
            </p>
            <div className="mt-4 h-1 w-full rounded-full bg-secondary">
              <div className="h-1 w-[32%] rounded-full bg-green-500"></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm xl:text-lg font-medium">Outstanding Payments</CardTitle>
            <CreditCardIcon className="size-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$23,540</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-red-500">+3.2%</span> from last month
            </p>
            <div className="mt-4 h-1 w-full rounded-full bg-secondary">
              <div className="h-1 w-[18%] rounded-full bg-amber-500"></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="md:grid max-md:space-y-4 gap-4 md:grid-cols-2">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Revenue vs Expenses</CardTitle>
                <CardDescription>Monthly comparison of revenue and expenses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="w-full h-[300px] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <ChartContainer
                    config={{
                      revenue: {
                        label: "Revenue",
                        color: "hsl(var(--chart-1))",
                      },
                      expenses: {
                        label: "Expenses",
                        color: "hsl(var(--chart-2))",
                      },
                      profit: {
                        label: "Profit",
                        color: "hsl(var(--chart-3))",
                      },
                    }}
                    className="h-full w-full"
                  >
                    <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                      <ComposedChart 
                        data={monthlyFinancialData}
                        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="month" 
                          tick={{ fontSize: 12 }}
                          interval={0}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis 
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => `$${value.toLocaleString()}`}
                        />
                        <Tooltip 
                          content={<ChartTooltipContent />}
                          wrapperStyle={{ 
                            backgroundColor: 'white',
                            padding: '8px',
                            borderRadius: '4px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                          }}
                        />
                        <Legend 
                          verticalAlign="top" 
                          height={36}
                          wrapperStyle={{ paddingBottom: '20px' }}
                        />
                        <Bar 
                          dataKey="revenue" 
                          fill="var(--color-revenue)" 
                          barSize={20}
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar 
                          dataKey="expenses" 
                          fill="var(--color-expenses)" 
                          barSize={20}
                          radius={[4, 4, 0, 0]}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="profit" 
                          stroke="var(--color-profit)" 
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Revenue by Department</CardTitle>
                <CardDescription>Distribution of revenue across different departments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ChartContainer
                    config={{
                      value: {
                        label: "Revenue",
                        color: "hsl(var(--chart-1))",
                      },
                    }}
                    className="h-full w-full"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={departmentRevenueData}
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          paddingAngle={2}
                        >
                          {departmentRevenueData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={DEPARTMENT_COLORS[index % DEPARTMENT_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          content={<ChartTooltipContent />}
                          wrapperStyle={{ 
                            backgroundColor: 'white',
                            padding: '8px',
                            borderRadius: '4px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                          }}
                        />
                        <Legend 
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle>Financial Summary</CardTitle>
                  <CardDescription>Monthly financial performance metrics</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Input placeholder="Search..." className="h-8 w-[150px] lg:w-[250px]" />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 gap-1">
                        <FilterIcon className="h-3.5 w-3.5" />
                        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Filter</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Filter by Period</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>All</DropdownMenuItem>
                      <DropdownMenuItem>This Month</DropdownMenuItem>
                      <DropdownMenuItem>Last Month</DropdownMenuItem>
                      <DropdownMenuItem>This Quarter</DropdownMenuItem>
                      <DropdownMenuItem>Last Quarter</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table className="whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Expenses</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                    <TableHead className="text-right">Growth</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="whitespace-nowrap">
                  {financialSummary.map((month) => (
                    <TableRow key={month.id}>
                      <TableCell className="font-medium">{month.month}</TableCell>
                      <TableCell className="text-right">${month.revenue.toLocaleString()}</TableCell>
                      <TableCell className="text-right">${month.expenses.toLocaleString()}</TableCell>
                      <TableCell className="text-right">${month.profit.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{month.margin}%</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {month.growth > 0 ? (
                            <>
                              <span className="text-green-500">+{month.growth}%</span>
                              <TrendingUpIcon className="h-4 w-4 text-green-500" />
                            </>
                          ) : (
                            <>
                              <span className="text-red-500">{month.growth}%</span>
                              <TrendingDownIcon className="h-4 w-4 text-red-500" />
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
        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trends</CardTitle>
              <CardDescription>Monthly revenue breakdown by service category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-full h-[400px]">
                <ChartContainer
                  config={{
                    consultations: {
                      label: "Consultations",
                      color: "hsl(var(--chart-1))",
                    },
                    procedures: {
                      label: "Procedures",
                      color: "hsl(var(--chart-2))",
                    },
                    tests: {
                      label: "Tests & Labs",
                      color: "hsl(var(--chart-3))",
                    },
                    surgeries: {
                      label: "Surgeries",
                      color: "hsl(var(--chart-4))",
                    },
                    therapy: {
                      label: "Therapy",
                      color: "hsl(var(--chart-5))",
                    },
                  }}
                  className="w-full h-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueByServiceData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip content={<ChartTooltipContent />} />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="consultations"
                        stackId="1"
                        stroke="var(--color-consultations)"
                        fill="var(--color-consultations)"
                      />
                      <Area
                        type="monotone"
                        dataKey="procedures"
                        stackId="1"
                        stroke="var(--color-procedures)"
                        fill="var(--color-procedures)"
                      />
                      <Area
                        type="monotone"
                        dataKey="tests"
                        stackId="1"
                        stroke="var(--color-tests)"
                        fill="var(--color-tests)"
                      />
                      <Area
                        type="monotone"
                        dataKey="surgeries"
                        stackId="1"
                        stroke="var(--color-surgeries)"
                        fill="var(--color-surgeries)"
                      />
                      <Area
                        type="monotone"
                        dataKey="therapy"
                        stackId="1"
                        stroke="var(--color-therapy)"
                        fill="var(--color-therapy)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
          <div className="md:grid max-md:space-y-4 gap-4 md:grid-cols-2">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Top Revenue Sources</CardTitle>
                <CardDescription>Highest revenue generating services</CardDescription>
              </CardHeader>
              <CardContent>
                <Table className="whitespace-nowrap">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">% of Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="whitespace-nowrap">
                    {topRevenueSources.map((service) => (
                      <TableRow key={service.id}>
                        <TableCell className="font-medium">{service.name}</TableCell>
                        <TableCell>{service.department}</TableCell>
                        <TableCell className="text-right">${service.revenue.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{service.percentage}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Revenue by Payment Method</CardTitle>
                <CardDescription>Distribution of revenue by payment type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ChartContainer
                    config={{
                      value: {
                        label: "Revenue",
                        color: "hsl(var(--chart-1))",
                      },
                    }}
                    className="h-full w-full"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={paymentMethodData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          fill="#8884d8"
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {paymentMethodData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PAYMENT_COLORS[index % PAYMENT_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltipContent />} />
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
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Expense Breakdown</CardTitle>
              <CardDescription>Monthly expenses by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-full h-[400px]">
                <ChartContainer
                  config={{
                    salaries: {
                      label: "Staff Salaries",
                      color: "hsl(var(--chart-1))",
                    },
                    supplies: {
                      label: "Medical Supplies",
                      color: "hsl(var(--chart-2))",
                    },
                    maintenance: {
                      label: "Equipment Maintenance",
                      color: "hsl(var(--chart-3))",
                    },
                    utilities: {
                      label: "Utilities",
                      color: "hsl(var(--chart-4))",
                    },
                    administrative: {
                      label: "Administrative",
                      color: "hsl(var(--chart-5))",
                    },
                  }}
                  className="w-full h-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={expensesOverTimeData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip content={<ChartTooltipContent />} />
                      <Legend 
                        wrapperStyle={{
                          width: "100%",
                          paddingTop: "20px",
                          fontSize: "12px"
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="salaries"
                        stroke="var(--color-salaries)"
                        strokeWidth={2}
                        activeDot={{ r: 8 }}
                      />
                      <Line type="monotone" dataKey="supplies" stroke="var(--color-supplies)" strokeWidth={2} />
                      <Line type="monotone" dataKey="maintenance" stroke="var(--color-maintenance)" strokeWidth={2} />
                      <Line type="monotone" dataKey="utilities" stroke="var(--color-utilities)" strokeWidth={2} />
                      <Line
                        type="monotone"
                        dataKey="administrative"
                        stroke="var(--color-administrative)"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
          <div className="md:grid max-md:space-y-4 gap-4 md:grid-cols-2">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Top Expense Categories</CardTitle>
                <CardDescription>Highest expense categories</CardDescription>
              </CardHeader>
              <CardContent>
                <Table className="whitespace-nowrap">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">% of Total</TableHead>
                      <TableHead className="text-right">vs Last Month</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="whitespace-nowrap">
                    {topExpenseCategories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell className="font-medium">{category.name}</TableCell>
                        <TableCell className="text-right">${category.amount.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{category.percentage}%</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {category.change > 0 ? (
                              <>
                                <span className="text-red-500">+{category.change}%</span>
                                <ArrowUpIcon className="h-4 w-4 text-red-500" />
                              </>
                            ) : (
                              <>
                                <span className="text-green-500">{category.change}%</span>
                                <ArrowDownIcon className="h-4 w-4 text-green-500" />
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
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Department Expenses</CardTitle>
                <CardDescription>Expenses by department</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ChartContainer
                    config={{
                      expenses: {
                        label: "Expenses",
                        color: "hsl(var(--chart-1))",
                      },
                    }}
                    className="h-full w-full"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={departmentExpensesData}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={90} />
                        <Tooltip content={<ChartTooltipContent />} />
                        <Legend />
                        <Bar dataKey="expenses" fill="var(--color-expenses)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle>Recent Transactions</CardTitle>
                  <CardDescription>Latest financial transactions</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Input placeholder="Search transactions..." className="h-8 w-[150px] lg:w-[250px]" />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 gap-1">
                        <FilterIcon className="h-3.5 w-3.5" />
                        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Filter</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Filter by Type</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>All</DropdownMenuItem>
                      <DropdownMenuItem>Income</DropdownMenuItem>
                      <DropdownMenuItem>Expense</DropdownMenuItem>
                      <DropdownMenuItem>Insurance</DropdownMenuItem>
                      <DropdownMenuItem>Refund</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table className="whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="whitespace-nowrap">
                  {recentTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium">#{transaction.id}</TableCell>
                      <TableCell>{transaction.date}</TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell>{transaction.category}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            transaction.type === "Income"
                              ? "border-green-500 bg-green-500/10 text-green-500"
                              : transaction.type === "Expense"
                                ? "border-red-500 bg-red-500/10 text-red-500"
                                : transaction.type === "Insurance"
                                  ? "border-blue-500 bg-blue-500/10 text-blue-500"
                                  : "border-amber-500 bg-amber-500/10 text-amber-500"
                          }
                        >
                          {transaction.type}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={`text-right ${
                          transaction.type === "Income" || transaction.type === "Insurance"
                            ? "text-green-500"
                            : "text-red-500"
                        }`}
                      >
                        {transaction.type === "Income" || transaction.type === "Insurance" ? "+" : "-"}$
                        {transaction.amount.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Payment Status</CardTitle>
              <CardDescription>Overview of payment statuses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ChartContainer
                  config={{
                    value: {
                      label: "Amount",
                      color: "hsl(var(--chart-1))",
                    },
                  }}
                  className="h-full w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentStatusData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {paymentStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltipContent />} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Sample data for the tables
const financialSummary = [
  {
    id: 1,
    month: "April 2023",
    revenue: 128450,
    expenses: 87325,
    profit: 41125,
    margin: 32.0,
    growth: 12.8,
  },
  {
    id: 2,
    month: "March 2023",
    revenue: 108650,
    expenses: 82850,
    profit: 25800,
    margin: 23.7,
    growth: 8.5,
  },
  {
    id: 3,
    month: "February 2023",
    revenue: 100150,
    expenses: 76350,
    profit: 23800,
    margin: 23.8,
    growth: -2.1,
  },
  {
    id: 4,
    month: "January 2023",
    revenue: 102300,
    expenses: 78250,
    profit: 24050,
    margin: 23.5,
    growth: 5.2,
  },
  {
    id: 5,
    month: "December 2022",
    revenue: 97250,
    expenses: 74450,
    profit: 22800,
    margin: 23.4,
    growth: -1.8,
  },
]

const topRevenueSources = [
  {
    id: 1,
    name: "Cardiology Consultations",
    department: "Cardiology",
    revenue: 28450,
    percentage: 22.1,
  },
  {
    id: 2,
    name: "Orthopedic Surgeries",
    department: "Orthopedics",
    revenue: 24350,
    percentage: 19.0,
  },
  {
    id: 3,
    name: "General Checkups",
    department: "General Medicine",
    revenue: 18750,
    percentage: 14.6,
  },
  {
    id: 4,
    name: "Diagnostic Imaging",
    department: "Radiology",
    revenue: 15250,
    percentage: 11.9,
  },
  {
    id: 5,
    name: "Laboratory Tests",
    department: "Pathology",
    revenue: 12650,
    percentage: 9.8,
  },
]

const topExpenseCategories = [
  {
    id: 1,
    name: "Staff Salaries",
    amount: 42350,
    percentage: 48.5,
    change: 3.2,
  },
  {
    id: 2,
    name: "Medical Supplies",
    amount: 15750,
    percentage: 18.0,
    change: 5.8,
  },
  {
    id: 3,
    name: "Equipment Maintenance",
    amount: 8450,
    percentage: 9.7,
    change: -2.3,
  },
  {
    id: 4,
    name: "Utilities",
    amount: 6850,
    percentage: 7.8,
    change: 1.5,
  },
  {
    id: 5,
    name: "Administrative",
    amount: 5250,
    percentage: 6.0,
    change: -1.8,
  },
]

const recentTransactions = [
  {
    id: "TRX-7845",
    date: "Today, 2:30 PM",
    description: "Patient Payment - Emma Thompson",
    category: "Consultation",
    type: "Income",
    amount: 150,
  },
  {
    id: "TRX-7844",
    date: "Today, 1:15 PM",
    description: "Insurance Claim - Blue Cross",
    category: "Surgery",
    type: "Insurance",
    amount: 3250,
  },
  {
    id: "TRX-7843",
    date: "Today, 11:30 AM",
    description: "Medical Supplies Order",
    category: "Supplies",
    type: "Expense",
    amount: 875,
  },
  {
    id: "TRX-7842",
    date: "Today, 10:00 AM",
    description: "Patient Payment - James Wilson",
    category: "Laboratory",
    type: "Income",
    amount: 220,
  },
  {
    id: "TRX-7841",
    date: "Today, 9:15 AM",
    description: "Equipment Maintenance",
    category: "Maintenance",
    type: "Expense",
    amount: 450,
  },
  {
    id: "TRX-7840",
    date: "Yesterday, 4:30 PM",
    description: "Patient Refund - Sophia Martinez",
    category: "Refund",
    type: "Refund",
    amount: 75,
  },
  {
    id: "TRX-7839",
    date: "Yesterday, 3:00 PM",
    description: "Insurance Claim - Aetna",
    category: "Radiology",
    type: "Insurance",
    amount: 1850,
  },
  {
    id: "TRX-7838",
    date: "Yesterday, 1:45 PM",
    description: "Staff Payroll",
    category: "Salaries",
    type: "Expense",
    amount: 12500,
  },
  {
    id: "TRX-7837",
    date: "Yesterday, 11:30 AM",
    description: "Patient Payment - Liam Anderson",
    category: "Therapy",
    type: "Income",
    amount: 180,
  },
  {
    id: "TRX-7836",
    date: "Yesterday, 10:15 AM",
    description: "Utility Bill - Electricity",
    category: "Utilities",
    type: "Expense",
    amount: 650,
  },
]

// Chart data
const monthlyFinancialData = [
  { month: "Jan", revenue: 102300, expenses: 78250, profit: 24050 },
  { month: "Feb", revenue: 100150, expenses: 76350, profit: 23800 },
  { month: "Mar", revenue: 108650, expenses: 82850, profit: 25800 },
  { month: "Apr", revenue: 128450, expenses: 87325, profit: 41125 },
  { month: "May", revenue: 116700, expenses: 83200, profit: 33500 },
  { month: "Jun", revenue: 121500, expenses: 85100, profit: 36400 },
]

const departmentRevenueData = [
  { name: "Cardiology", value: 35250 },
  { name: "Orthopedics", value: 28750 },
  { name: "Neurology", value: 18500 },
  { name: "Pediatrics", value: 15750 },
  { name: "Dermatology", value: 12350 },
  { name: "Other", value: 17850 },
]

const revenueByServiceData = [
  {
    month: "Jan",
    consultations: 32500,
    procedures: 25800,
    tests: 18200,
    surgeries: 15400,
    therapy: 10400,
  },
  {
    month: "Feb",
    consultations: 31200,
    procedures: 24900,
    tests: 17800,
    surgeries: 16100,
    therapy: 10150,
  },
  {
    month: "Mar",
    consultations: 33800,
    procedures: 27200,
    tests: 19100,
    surgeries: 17500,
    therapy: 11050,
  },
  {
    month: "Apr",
    consultations: 38500,
    procedures: 32100,
    tests: 22800,
    surgeries: 21500,
    therapy: 13550,
  },
  {
    month: "May",
    consultations: 35200,
    procedures: 29800,
    tests: 21100,
    surgeries: 19200,
    therapy: 11400,
  },
  {
    month: "Jun",
    consultations: 36800,
    procedures: 30500,
    tests: 21800,
    surgeries: 20100,
    therapy: 12300,
  },
]

const paymentMethodData = [
  { name: "Insurance", value: 68250 },
  { name: "Credit Card", value: 32150 },
  { name: "Cash", value: 15750 },
  { name: "Bank Transfer", value: 8450 },
  { name: "Other", value: 3850 },
]

const expensesOverTimeData = [
  {
    month: "Jan",
    salaries: 38250,
    supplies: 14500,
    maintenance: 8200,
    utilities: 6500,
    administrative: 4800,
  },
  {
    month: "Feb",
    salaries: 37500,
    supplies: 14200,
    maintenance: 8100,
    utilities: 6350,
    administrative: 4700,
  },
  {
    month: "Mar",
    salaries: 39800,
    supplies: 15100,
    maintenance: 8350,
    utilities: 6700,
    administrative: 4900,
  },
  {
    month: "Apr",
    salaries: 42350,
    supplies: 15750,
    maintenance: 8450,
    utilities: 6850,
    administrative: 5250,
  },
  {
    month: "May",
    salaries: 40100,
    supplies: 15200,
    maintenance: 8300,
    utilities: 6650,
    administrative: 5050,
  },
  {
    month: "Jun",
    salaries: 41200,
    supplies: 15500,
    maintenance: 8400,
    utilities: 6750,
    administrative: 5150,
  },
]

const departmentExpensesData = [
  { name: "Cardiology", expenses: 18250 },
  { name: "Orthopedics", expenses: 15750 },
  { name: "Neurology", expenses: 12350 },
  { name: "Pediatrics", expenses: 10850 },
  { name: "Dermatology", expenses: 8750 },
  { name: "Radiology", expenses: 11250 },
  { name: "Pathology", expenses: 9850 },
]

const paymentStatusData = [
  { name: "Paid", value: 128450 },
  { name: "Pending", value: 15750 },
  { name: "Overdue", value: 7850 },
  { name: "Refunded", value: 2350 },
]

// Chart colors
const DEPARTMENT_COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82ca9d"]
const PAYMENT_COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"]
const STATUS_COLORS = ["#4CAF50", "#FFC107", "#F44336", "#9C27B0"]
