import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, BarChartIcon as ChartBarIcon, LineChartIcon, PackageIcon, TrendingUpIcon, UsersIcon } from "lucide-react";
import Link from "next/link";

export default function ReportsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">Reports</h1>
        <p className="text-muted-foreground">Access and generate detailed reports for your clinic</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Appointment Reports
            </CardTitle>
            <CardDescription>Track appointment metrics, trends, and patient attendance</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Appointments</span>
                <span className="font-medium">1,248</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Completion Rate</span>
                <span className="font-medium">70.2%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">No-Show Rate</span>
                <span className="font-medium">6.8%</span>
              </div>
            </div>
            <Button asChild>
              <Link href="/reports/appointments">View Report</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUpIcon className="h-5 w-5" />
              Financial Reports
            </CardTitle>
            <CardDescription>Track revenue, expenses, and financial performance</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Revenue</span>
                <span className="font-medium">$128,450</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Net Profit</span>
                <span className="font-medium">$41,125</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Growth</span>
                <span className="font-medium">+12.8%</span>
              </div>
            </div>
            <Button asChild>
              <Link href="/reports/financial">View Report</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="h-5 w-5" />
              Patient Visit Reports
            </CardTitle>
            <CardDescription>Analyze patient visits, demographics, and health trends</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Visits</span>
                <span className="font-medium">3,842</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">New Patients</span>
                <span className="font-medium">428</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Avg. Duration</span>
                <span className="font-medium">32 min</span>
              </div>
            </div>
            <Button asChild>
              <Link href="/reports/patients">View Report</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PackageIcon className="h-5 w-5" />
              Inventory Reports
            </CardTitle>
            <CardDescription>Track inventory levels, usage, and supply chain metrics</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Items</span>
                <span className="font-medium">1,245</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Low Stock</span>
                <span className="font-medium">32</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Inventory Value</span>
                <span className="font-medium">$248,320</span>
              </div>
            </div>
            <Button asChild>
              <Link href="/reports/inventory">View Report</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChartBarIcon className="h-5 w-5" />
              Staff Performance
            </CardTitle>
            <CardDescription>Evaluate staff productivity, attendance, and performance</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Staff Count</span>
                <span className="font-medium">48</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Avg. Attendance</span>
                <span className="font-medium">92.5%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Productivity</span>
                <span className="font-medium">87.3%</span>
              </div>
            </div>
            <Button asChild variant="outline">
              <Link href="#">Coming Soon</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChartIcon className="h-5 w-5" />
              Custom Reports
            </CardTitle>
            <CardDescription>Create customized reports with specific metrics and filters</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Saved Reports</span>
                <span className="font-medium">5</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Templates</span>
                <span className="font-medium">12</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Export Options</span>
                <span className="font-medium">PDF, CSV, Excel</span>
              </div>
            </div>
            <Button asChild variant="outline">
              <Link href="#">Coming Soon</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
