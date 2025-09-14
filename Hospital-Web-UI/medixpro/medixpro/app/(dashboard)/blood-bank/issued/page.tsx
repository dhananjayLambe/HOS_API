"use client";

import { Download, MoreHorizontal, Plus, RefreshCw, Search, XCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Shell } from "@/components/shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
type Issuance = {
  id: string;
  recipient: {
    name: string;
    id: string;
    avatar: string;
  };
  bloodType: string;
  units: number;
  issueDate: string;
  requestingDoctor: string;
  purpose: string;
  crossMatch: string;
  status: string;
  department: string;
};
// Mock data for blood issuances
const issuances: Issuance[] = [
  {
    id: "ISS-2023-001",
    recipient: {
      name: "John Smith",
      id: "PT-10045",
      avatar: "/abstract-jr.png",
    },
    bloodType: "O+",
    units: 2,
    issueDate: "2023-04-15 09:30 AM",
    requestingDoctor: "Dr. Sarah Johnson",
    purpose: "Surgery - Appendectomy",
    crossMatch: "Compatible",
    status: "Delivered",
    department: "Surgery",
  },
  {
    id: "ISS-2023-002",
    recipient: {
      name: "Emily Davis",
      id: "PT-10089",
      avatar: "/abstract-geometric-lt.png",
    },
    bloodType: "A-",
    units: 1,
    issueDate: "2023-04-16 02:15 PM",
    requestingDoctor: "Dr. Michael Chen",
    purpose: "Anemia Treatment",
    crossMatch: "Compatible",
    status: "Delivered",
    department: "Internal Medicine",
  },
  {
    id: "ISS-2023-003",
    recipient: {
      name: "Robert Wilson",
      id: "PT-10124",
      avatar: "/graffiti-ew.png",
    },
    bloodType: "B+",
    units: 3,
    issueDate: "2023-04-17 11:45 AM",
    requestingDoctor: "Dr. Lisa Patel",
    purpose: "Emergency - Trauma",
    crossMatch: "Compatible",
    status: "Delivered",
    department: "Emergency",
  },
  {
    id: "ISS-2023-004",
    recipient: {
      name: "City Hospital",
      id: "EXT-0023",
      avatar: "",
    },
    bloodType: "AB+",
    units: 2,
    issueDate: "2023-04-18 10:00 AM",
    requestingDoctor: "Dr. James Wilson",
    purpose: "External Request",
    crossMatch: "N/A",
    status: "In Transit",
    department: "External",
  },
  {
    id: "ISS-2023-005",
    recipient: {
      name: "Maria Garcia",
      id: "PT-10156",
      avatar: "/stylized-initials.png",
    },
    bloodType: "O-",
    units: 1,
    issueDate: "2023-04-19 03:30 PM",
    requestingDoctor: "Dr. David Kim",
    purpose: "Childbirth - Hemorrhage",
    crossMatch: "Compatible",
    status: "Delivered",
    department: "Obstetrics",
  },
  {
    id: "ISS-2023-006",
    recipient: {
      name: "James Brown",
      id: "PT-10178",
      avatar: "/abstract-jr.png",
    },
    bloodType: "A+",
    units: 2,
    issueDate: "2023-04-20 08:45 AM",
    requestingDoctor: "Dr. Emily White",
    purpose: "Surgery - Heart Bypass",
    crossMatch: "Compatible",
    status: "Delivered",
    department: "Cardiology",
  },
  {
    id: "ISS-2023-007",
    recipient: {
      name: "Linda Martinez",
      id: "PT-10203",
      avatar: "/stylized-initials.png",
    },
    bloodType: "B-",
    units: 1,
    issueDate: "2023-04-21 01:30 PM",
    requestingDoctor: "Dr. Robert Lee",
    purpose: "Chemotherapy Support",
    crossMatch: "Compatible",
    status: "Delivered",
    department: "Oncology",
  },
  {
    id: "ISS-2023-008",
    recipient: {
      name: "County Medical Center",
      id: "EXT-0045",
      avatar: "",
    },
    bloodType: "O+",
    units: 4,
    issueDate: "2023-04-22 09:15 AM",
    requestingDoctor: "Dr. Thomas Brown",
    purpose: "External Request",
    crossMatch: "N/A",
    status: "In Transit",
    department: "External",
  },
  {
    id: "ISS-2023-009",
    recipient: {
      name: "William Taylor",
      id: "PT-10234",
      avatar: "/graffiti-ew.png",
    },
    bloodType: "AB-",
    units: 1,
    issueDate: "2023-04-23 11:00 AM",
    requestingDoctor: "Dr. Jennifer Garcia",
    purpose: "Kidney Transplant",
    crossMatch: "Compatible",
    status: "Delivered",
    department: "Nephrology",
  },
  {
    id: "ISS-2023-010",
    recipient: {
      name: "Sarah Johnson",
      id: "PT-10267",
      avatar: "/abstract-geometric-lt.png",
    },
    bloodType: "O+",
    units: 2,
    issueDate: "2023-04-24 02:45 PM",
    requestingDoctor: "Dr. Mark Wilson",
    purpose: "Emergency - Accident",
    crossMatch: "Compatible",
    status: "Delivered",
    department: "Emergency",
  },
];

// Component for the blood type distribution chart// Props type
type BloodTypeChartProps = {
  issuances: Issuance[];
};

const BloodTypeChart = ({ issuances }: BloodTypeChartProps) => {
  // Calculate blood type distribution
  const bloodTypeCounts: Record<string, number> = issuances.reduce((acc, issuance) => {
    const { bloodType, units } = issuance;
    acc[bloodType] = (acc[bloodType] || 0) + units;
    return acc;
  }, {} as Record<string, number>);

  // Sort blood types for consistent display
  const sortedBloodTypes = Object.keys(bloodTypeCounts).sort();

  // Calculate max value for scaling
  const maxValue = Math.max(...Object.values(bloodTypeCounts));

  // Color mapping for blood types
  const colorMap: Record<string, string> = {
    "A+": "bg-red-500",
    "A-": "bg-red-700",
    "B+": "bg-blue-500",
    "B-": "bg-blue-700",
    "AB+": "bg-purple-500",
    "AB-": "bg-purple-700",
    "O+": "bg-green-500",
    "O-": "bg-green-700",
  };

  return (
    <div className="flex flex-col justify-center gap-2">
      {sortedBloodTypes.map((bloodType) => (
        <div key={bloodType} className="mb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">{bloodType}</span>
            <span className="text-sm text-muted-foreground">{bloodTypeCounts[bloodType]} units</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2.5">
            <div className={`${colorMap[bloodType] || "bg-primary"} h-2.5 rounded-full`} style={{ width: `${(bloodTypeCounts[bloodType] / maxValue) * 100}%` }}></div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Component for the department distribution chart
const DepartmentChart = ({ issuances }: BloodTypeChartProps) => {
  // Calculate department distribution
  const departmentCounts: Record<string, number> = issuances.reduce((acc, issuance) => {
    const { department, units } = issuance;
    acc[department] = (acc[department] || 0) + units;
    return acc;
  }, {} as Record<string, number>);

  // Sort departments by count (descending)
  const sortedDepartments = Object.keys(departmentCounts).sort((a, b) => departmentCounts[b] - departmentCounts[a]);

  // Calculate max value for scaling
  const maxValue = Math.max(...Object.values(departmentCounts));

  // Generate a color for each department
  const getColor = (index: number): string => {
    const colors = ["bg-blue-500", "bg-green-500", "bg-yellow-500", "bg-red-500", "bg-purple-500", "bg-pink-500", "bg-indigo-500", "bg-teal-500"];
    return colors[index % colors.length];
  };

  return (
    <div className="flex flex-col gap-2 justify-center">
      {sortedDepartments.map((department, index) => (
        <div key={department} className="mb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">{department}</span>
            <span className="text-sm text-muted-foreground">{departmentCounts[department]} units</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2.5">
            <div
              className={`${getColor(index)} h-2.5 rounded-full`}
              style={{
                width: `${(departmentCounts[department] / maxValue) * 100}%`,
              }}
            ></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default function IssuedPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [bloodTypeFilter, setBloodTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");

  // Helper function for status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Delivered":
        return <Badge variant="success">{status}</Badge>;
      case "In Transit":
        return <Badge variant="warning">{status}</Badge>;
      case "Returned":
        return <Badge variant="destructive">{status}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Helper function for blood type badge
  const getBloodTypeBadge = (bloodType: string) => {
    const colorMap: Record<string, string> = {
      "A+": "bg-red-500",
      "A-": "bg-red-700",
      "B+": "bg-blue-500",
      "B-": "bg-blue-700",
      "AB+": "bg-purple-500",
      "AB-": "bg-purple-700",
      "O+": "bg-green-500",
      "O-": "bg-green-700",
    };

    const bgColor = colorMap[bloodType] || "bg-gray-500";

    return <Badge className={`${bgColor}`}>{bloodType}</Badge>;
  };

  // Reset all filters
  const resetFilters = () => {
    setSearchText("");
    setBloodTypeFilter("all");
    setStatusFilter("all");
    setDepartmentFilter("all");
  };

  // Filter issuances based on all filters
  const filteredIssuances = issuances.filter((issuance) => {
    // Filter by tab
    if (activeTab === "patient" && issuance.recipient.id.startsWith("EXT")) return false;
    if (activeTab === "external" && !issuance.recipient.id.startsWith("EXT")) return false;
    if (activeTab === "emergency" && !issuance.purpose.toLowerCase().includes("emergency")) return false;

    // Filter by search text
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      const matchesSearch = issuance.id.toLowerCase().includes(searchLower) || issuance.recipient.name.toLowerCase().includes(searchLower) || issuance.recipient.id.toLowerCase().includes(searchLower) || issuance.requestingDoctor.toLowerCase().includes(searchLower) || issuance.purpose.toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;
    }

    // Filter by blood type
    if (bloodTypeFilter !== "all" && issuance.bloodType !== bloodTypeFilter) return false;

    // Filter by status
    if (statusFilter !== "all" && issuance.status !== statusFilter) return false;

    // Filter by department
    if (departmentFilter !== "all" && issuance.department !== departmentFilter) return false;

    return true;
  });

  // Get unique departments for filter dropdown
  const departments = [...new Set(issuances.map((issuance) => issuance.department))];

  // Get unique statuses for filter dropdown
  const statuses = [...new Set(issuances.map((issuance) => issuance.status))];

  return (
    <Shell>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl lg:text-3xl font-semibold tracking-tight mb-2">Issued Blood</h2>
          <p className="text-muted-foreground">Manage issued blood units and track transfusions.</p>
        </div>
        <div>
          <Button asChild>
            <Link href="/blood-bank/issue">
              <Plus className="mr-2 h-4 w-4" />
              Issue Blood
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Units Issued</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{issuances.reduce((total, issuance) => total + issuance.units, 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">+14 from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Issued This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">32</div>
            <p className="text-xs text-muted-foreground mt-1">+3 compared to last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emergency Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{issuances.filter((i) => i.purpose.toLowerCase().includes("emergency")).length}</div>
            <p className="text-xs text-muted-foreground mt-1">Critical situations handled</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cross-Matched Units</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{issuances.filter((i) => i.crossMatch === "Compatible").reduce((total, i) => total + i.units, 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Compatibility verified</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Issues by Blood Type</CardTitle>
          </CardHeader>
          <CardContent >
            <BloodTypeChart issuances={issuances} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Issues by Department</CardTitle>
          </CardHeader>
          <CardContent >
            <DepartmentChart issuances={issuances} />
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0 mt-6">
        <div className="flex w-full sm:w-auto items-center space-x-2 flex-wrap gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Search issuances..." className="w-full pl-8" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
            {searchText && (
              <button onClick={() => setSearchText("")} className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground">
                <XCircle className="h-4 w-4" />
              </button>
            )}
          </div>
          <Select value={bloodTypeFilter} onValueChange={setBloodTypeFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Blood Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Blood Types</SelectItem>
              <SelectItem value="A+">A+</SelectItem>
              <SelectItem value="A-">A-</SelectItem>
              <SelectItem value="B+">B+</SelectItem>
              <SelectItem value="B-">B-</SelectItem>
              <SelectItem value="AB+">AB+</SelectItem>
              <SelectItem value="AB-">AB-</SelectItem>
              <SelectItem value="O+">O+</SelectItem>
              <SelectItem value="O-">O-</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {statuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept} value={dept}>
                  {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(searchText || bloodTypeFilter !== "all" || statusFilter !== "all" || departmentFilter !== "all") && (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              <XCircle className="mr-2 h-3.5 w-3.5" />
              Reset
            </Button>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" className="h-8">
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="h-8">
            <Download className="mr-2 h-3.5 w-3.5" />
            Export
          </Button>
        </div>
      </div>

      {/* Tabs and Table */}
      <Tabs defaultValue="all" className="mt-6" onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Issues</TabsTrigger>
          <TabsTrigger value="patient">Patient</TabsTrigger>
          <TabsTrigger value="external">External</TabsTrigger>
          <TabsTrigger value="emergency">Emergency</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full whitespace-nowrap">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 font-medium">Issue ID</th>
                      <th className="text-left p-4 font-medium">Recipient</th>
                      <th className="text-left p-4 font-medium">Blood Type</th>
                      <th className="text-left p-4 font-medium hidden md:table-cell">Issue Date</th>
                      <th className="text-left p-4 font-medium hidden lg:table-cell">Requesting Doctor</th>
                      <th className="text-left p-4 font-medium hidden xl:table-cell">Purpose</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-right p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIssuances.map((issuance) => (
                      <tr key={issuance.id} className="border-b hover:bg-muted/50">
                        <td className="p-4">
                          <Link href="#" className="font-medium hover:underline">
                            {issuance.id}
                          </Link>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={issuance.recipient.avatar || "/user-2.png"} alt={issuance.recipient.name} />
                              <AvatarFallback>{issuance.recipient.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{issuance.recipient.name}</div>
                              <div className="text-xs text-muted-foreground">{issuance.recipient.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1">
                            {getBloodTypeBadge(issuance.bloodType)}
                            <span className="ml-2">{issuance.units} unit(s)</span>
                          </div>
                        </td>
                        <td className="p-4 hidden md:table-cell">{issuance.issueDate}</td>
                        <td className="p-4 hidden lg:table-cell">{issuance.requestingDoctor}</td>
                        <td className="p-4 hidden xl:table-cell">
                          <div className="max-w-[200px] truncate" title={issuance.purpose}>
                            {issuance.purpose}
                          </div>
                        </td>
                        <td className="p-4">{getStatusBadge(issuance.status)}</td>
                        <td className="p-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Link href="/blood-bank/stock/bs-001">View Details</Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem>Print Receipt</DropdownMenuItem>
                              <DropdownMenuItem>
                                <Link href="/blood-bank/stock/bs-001/update">Update Status</Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>Record Outcome</DropdownMenuItem>
                              <DropdownMenuItem>Report Reaction</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredIssuances.length === 0 && (
                <div className="flex flex-col items-center justify-center p-8">
                  <p className="text-muted-foreground">No blood issuances found.</p>
                </div>
              )}
              <div className="flex items-center justify-between p-4">
                <p className="text-sm text-muted-foreground">
                  Showing {filteredIssuances.length} of {issuances.length} issuances
                </p>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" disabled>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" disabled>
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="patient" className="mt-4">
          {/* Same card structure as "all" tab */}
          <Card>
            <CardContent className="p-0">
              {/* Table content similar to "all" tab but filtered for patients */}
              <div className="overflow-x-auto">
                <table className="w-full whitespace-nowrap">
                  {/* Table header and body similar to "all" tab */}
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 font-medium">Issue ID</th>
                      <th className="text-left p-4 font-medium">Recipient</th>
                      <th className="text-left p-4 font-medium">Blood Type</th>
                      <th className="text-left p-4 font-medium hidden md:table-cell">Issue Date</th>
                      <th className="text-left p-4 font-medium hidden lg:table-cell">Requesting Doctor</th>
                      <th className="text-left p-4 font-medium hidden xl:table-cell">Purpose</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-right p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIssuances.map((issuance) => (
                      <tr key={issuance.id} className="border-b hover:bg-muted/50">
                        <td className="p-4">
                          <Link href="#" className="font-medium hover:underline">
                            {issuance.id}
                          </Link>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={issuance.recipient.avatar || "/user-2.png"} alt={issuance.recipient.name} />
                              <AvatarFallback>{issuance.recipient.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{issuance.recipient.name}</div>
                              <div className="text-xs text-muted-foreground">{issuance.recipient.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1">
                            {getBloodTypeBadge(issuance.bloodType)}
                            <span className="ml-2">{issuance.units} unit(s)</span>
                          </div>
                        </td>
                        <td className="p-4 hidden md:table-cell">{issuance.issueDate}</td>
                        <td className="p-4 hidden lg:table-cell">{issuance.requestingDoctor}</td>
                        <td className="p-4 hidden xl:table-cell">
                          <div className="max-w-[200px] truncate" title={issuance.purpose}>
                            {issuance.purpose}
                          </div>
                        </td>
                        <td className="p-4">{getStatusBadge(issuance.status)}</td>
                        <td className="p-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Link href="/blood-bank/stock/bs-001">View Details</Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem>Print Receipt</DropdownMenuItem>
                              <DropdownMenuItem>
                                <Link href="/blood-bank/stock/bs-001/update">Update Status</Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>Record Outcome</DropdownMenuItem>
                              <DropdownMenuItem>Report Reaction</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredIssuances.length === 0 && (
                <div className="flex flex-col items-center justify-center p-8">
                  <p className="text-muted-foreground">No patient blood issuances found.</p>
                </div>
              )}
              <div className="flex items-center justify-between p-4">
                <p className="text-sm text-muted-foreground">
                  Showing {filteredIssuances.length} of {issuances.length} issuances
                </p>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" disabled>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" disabled>
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="external" className="mt-4">
          {/* Similar structure for external tab */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full whitespace-nowrap">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 font-medium">Issue ID</th>
                      <th className="text-left p-4 font-medium">Recipient</th>
                      <th className="text-left p-4 font-medium">Blood Type</th>
                      <th className="text-left p-4 font-medium hidden md:table-cell">Issue Date</th>
                      <th className="text-left p-4 font-medium hidden lg:table-cell">Requesting Doctor</th>
                      <th className="text-left p-4 font-medium hidden xl:table-cell">Purpose</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-right p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIssuances.map((issuance) => (
                      <tr key={issuance.id} className="border-b hover:bg-muted/50">
                        <td className="p-4">
                          <Link href="#" className="font-medium hover:underline">
                            {issuance.id}
                          </Link>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={issuance.recipient.avatar || "/user-2.png"} alt={issuance.recipient.name} />
                              <AvatarFallback>{issuance.recipient.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{issuance.recipient.name}</div>
                              <div className="text-xs text-muted-foreground">{issuance.recipient.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1">
                            {getBloodTypeBadge(issuance.bloodType)}
                            <span className="ml-2">{issuance.units} unit(s)</span>
                          </div>
                        </td>
                        <td className="p-4 hidden md:table-cell">{issuance.issueDate}</td>
                        <td className="p-4 hidden lg:table-cell">{issuance.requestingDoctor}</td>
                        <td className="p-4 hidden xl:table-cell">
                          <div className="max-w-[200px] truncate" title={issuance.purpose}>
                            {issuance.purpose}
                          </div>
                        </td>
                        <td className="p-4">{getStatusBadge(issuance.status)}</td>
                        <td className="p-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Link href="/blood-bank/stock/bs-001">View Details</Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem>Print Receipt</DropdownMenuItem>
                              <DropdownMenuItem>
                                <Link href="/blood-bank/stock/bs-001/update">Update Status</Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>Record Outcome</DropdownMenuItem>
                              <DropdownMenuItem>Report Reaction</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredIssuances.length === 0 && (
                <div className="flex flex-col items-center justify-center p-8">
                  <p className="text-muted-foreground">No external blood issuances found.</p>
                </div>
              )}
              <div className="flex items-center justify-between p-4">
                <p className="text-sm text-muted-foreground">
                  Showing {filteredIssuances.length} of {issuances.length} issuances
                </p>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" disabled>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" disabled>
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="emergency" className="mt-4">
          {/* Similar structure for emergency tab */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full whitespace-nowrap">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 font-medium">Issue ID</th>
                      <th className="text-left p-4 font-medium">Recipient</th>
                      <th className="text-left p-4 font-medium">Blood Type</th>
                      <th className="text-left p-4 font-medium hidden md:table-cell">Issue Date</th>
                      <th className="text-left p-4 font-medium hidden lg:table-cell">Requesting Doctor</th>
                      <th className="text-left p-4 font-medium hidden xl:table-cell">Purpose</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-right p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIssuances.map((issuance) => (
                      <tr key={issuance.id} className="border-b hover:bg-muted/50">
                        <td className="p-4">
                          <Link href="#" className="font-medium hover:underline">
                            {issuance.id}
                          </Link>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={issuance.recipient.avatar || "/user-2.png"} alt={issuance.recipient.name} />
                              <AvatarFallback>{issuance.recipient.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{issuance.recipient.name}</div>
                              <div className="text-xs text-muted-foreground">{issuance.recipient.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1">
                            {getBloodTypeBadge(issuance.bloodType)}
                            <span className="ml-2">{issuance.units} unit(s)</span>
                          </div>
                        </td>
                        <td className="p-4 hidden md:table-cell">{issuance.issueDate}</td>
                        <td className="p-4 hidden lg:table-cell">{issuance.requestingDoctor}</td>
                        <td className="p-4 hidden xl:table-cell">
                          <div className="max-w-[200px] truncate" title={issuance.purpose}>
                            {issuance.purpose}
                          </div>
                        </td>
                        <td className="p-4">{getStatusBadge(issuance.status)}</td>
                        <td className="p-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Link href="/blood-bank/stock/bs-001">View Details</Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem>Print Receipt</DropdownMenuItem>
                              <DropdownMenuItem>
                                <Link href="/blood-bank/stock/bs-001/update">Update Status</Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>Record Outcome</DropdownMenuItem>
                              <DropdownMenuItem>Report Reaction</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredIssuances.length === 0 && (
                <div className="flex flex-col items-center justify-center p-8">
                  <p className="text-muted-foreground">No emergency blood issuances found.</p>
                </div>
              )}
              <div className="flex items-center justify-between p-4">
                <p className="text-sm text-muted-foreground">
                  Showing {filteredIssuances.length} of {issuances.length} issuances
                </p>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" disabled>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" disabled>
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </Shell>
  );
}
