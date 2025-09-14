"use client";
import { CalendarDateRangePicker } from "@/components/date-range-picker";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, ArrowLeft, CheckCircle, Download, FileText, Filter, MoreHorizontal, Search, Send } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

// Sample insurance claims data
export const claims = [
  {
    id: "CLM-001",
    patient: {
      name: "John Smith",
      image: "/colorful-abstract-shapes.png",
      id: "P12345",
    },
    invoice: "INV-001",
    provider: "Blue Cross Blue Shield",
    policyNumber: "BCBS123456789",
    submittedDate: "2024-04-15",
    amount: 200.0,
    status: "Approved",
    approvedAmount: 180.0,
    paymentDate: "2024-04-22",
    claimType: "Medical",
    notes: "Claim approved with standard copay deduction",
  },
  {
    id: "CLM-002",
    patient: {
      name: "Emily Davis",
      image: "/colorful-abstract-shapes.png",
      id: "P23456",
    },
    invoice: "INV-002",
    provider: "Aetna",
    policyNumber: "AET987654321",
    submittedDate: "2024-04-16",
    amount: 280.0,
    status: "Pending",
    approvedAmount: 0.0,
    paymentDate: "",
    claimType: "Medical",
    notes: "Claim under review by insurance provider",
  },
  {
    id: "CLM-003",
    patient: {
      name: "Robert Wilson",
      image: "/user-3.png",
      id: "P34567",
    },
    invoice: "INV-003",
    provider: "UnitedHealthcare",
    policyNumber: "UHC567891234",
    submittedDate: "2024-04-10",
    amount: 140.0,
    status: "Approved",
    approvedAmount: 140.0,
    paymentDate: "2024-04-20",
    claimType: "Medical",
    notes: "Claim approved in full",
  },
  {
    id: "CLM-004",
    patient: {
      name: "Jessica Brown",
      image: "/user-3.png",
      id: "P45678",
    },
    invoice: "INV-004",
    provider: "Delta Dental",
    policyNumber: "DD456789123",
    submittedDate: "2024-04-05",
    amount: 416.0,
    status: "Approved",
    approvedAmount: 350.0,
    paymentDate: "2024-04-18",
    claimType: "Dental",
    notes: "Partial approval - some procedures not covered under policy",
  },
  {
    id: "CLM-005",
    patient: {
      name: "Michael Johnson",
      image: "/user-3.png",
      id: "P56789",
    },
    invoice: "INV-005",
    provider: "Cigna",
    policyNumber: "CIG123789456",
    submittedDate: "2024-04-18",
    amount: 360.0,
    status: "Submitted",
    approvedAmount: 0.0,
    paymentDate: "",
    claimType: "Medical",
    notes: "Claim submitted electronically, awaiting acknowledgment",
  },
  {
    id: "CLM-006",
    patient: {
      name: "Sarah Thompson",
      image: "/user-3.png",
      id: "P67890",
    },
    invoice: "INV-006",
    provider: "Humana",
    policyNumber: "HUM789123456",
    submittedDate: "2024-04-12",
    amount: 240.0,
    status: "Rejected",
    approvedAmount: 0.0,
    paymentDate: "",
    claimType: "Medical",
    rejectionReason: "Service not covered under current policy",
    notes: "Claim rejected - patient notified",
  },
  {
    id: "CLM-007",
    patient: {
      name: "David Miller",
      image: "/user-3.png",
      id: "P78901",
    },
    invoice: "INV-007",
    provider: "MedixPro",
    policyNumber: "MED123456789",
    submittedDate: "",
    amount: 180.0,
    status: "Draft",
    approvedAmount: 0.0,
    paymentDate: "",
    claimType: "Medical",
    notes: "Claim prepared but not yet submitted",
  },
];

export default function InsuranceClaimsPage() {
  // Add state for search and filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    claimType: {
      Medical: true,
      Dental: true,
    },
    status: {
      Approved: true,
      Pending: true,
      Submitted: true,
      Rejected: true,
      Draft: true,
    },
  });

  // Filter claims based on search query and filters
  const filteredClaims = claims.filter((claim) => {
    // Search filter
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      searchQuery === "" ||
      claim.id.toLowerCase().includes(searchLower) ||
      claim.patient.name.toLowerCase().includes(searchLower) ||
      claim.provider.toLowerCase().includes(searchLower) ||
      claim.policyNumber.toLowerCase().includes(searchLower);

    // Type and status filters
    const matchesType = filters.claimType[claim.claimType as keyof typeof filters.claimType];
    const matchesStatus = filters.status[claim.status as keyof typeof filters.status]; 

    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="outline" size="icon" asChild>
          <Link href="/billing">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">Insurance Claims</h1>
          <p className="text-muted-foreground">Manage and track insurance claims for patient services.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex  gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search claims..."
              className="pl-8 w-full md:w-[250px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
                <span className="sr-only">Filter</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px]" align="start">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Claim Type</h4>
                  {Object.entries(filters.claimType).map(([type, checked]) => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox
                        id={`type-${type}`}
                        checked={checked}
                        onCheckedChange={(checked) =>
                          setFilters((prev) => ({
                            ...prev,
                            claimType: {
                              ...prev.claimType,
                              [type]: !!checked,
                            },
                          }))
                        }
                      />
                      <Label htmlFor={`type-${type}`}>{type}</Label>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Status</h4>
                  {Object.entries(filters.status).map(([status, checked]) => (
                    <div key={status} className="flex items-center space-x-2">
                      <Checkbox
                        id={`status-${status}`}
                        checked={checked}
                        onCheckedChange={(checked) =>
                          setFilters((prev) => ({
                            ...prev,
                            status: {
                              ...prev.status,
                              [status]: !!checked,
                            },
                          }))
                        }
                      />
                      <Label htmlFor={`status-${status}`}>{status}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
            <span className="sr-only">Download</span>
          </Button>
        </div>
        <CalendarDateRangePicker />
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Claims</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <CardTitle>All Insurance Claims</CardTitle>
                <CardDescription>View and manage all insurance claims.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select defaultValue="newest">
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="highest">Highest Amount</SelectItem>
                    <SelectItem value="lowest">Lowest Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Table className="whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead>Claim ID</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Type</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="whitespace-nowrap">
                  {filteredClaims.map((claim) => (
                    <TableRow key={claim.id}>
                      <TableCell className="font-medium">{claim.id}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={claim.patient.image || "/user-2.png"} alt={claim.patient.name} />
                            <AvatarFallback>{claim.patient.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{claim.patient.name}</p>
                            <p className="text-xs text-muted-foreground">{claim.patient.id}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p>{claim.provider}</p>
                          <p className="text-xs text-muted-foreground">Policy: {claim.policyNumber}</p>
                        </div>
                      </TableCell>
                      <TableCell>{claim.submittedDate || "Not submitted"}</TableCell>
                      <TableCell className="text-right">${claim.amount.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={claim.status === "Approved" ? "default" : claim.status === "Rejected" ? "destructive" : claim.status === "Draft" ? "secondary" : "outline"}
                          className={claim.status === "Approved" ? "bg-green-500" : claim.status === "Rejected" ? "bg-red-500" : claim.status === "Draft" ? "bg-gray-500" : claim.status === "Pending" ? "border-amber-500 text-amber-500" : "border-blue-500 text-blue-500"}
                        >
                          {claim.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{claim.claimType}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem>
                              <Link href={`/billing/insurance/${claim.id}`} className="flex items-center gap-2">
                                <FileText className="mr-2 h-4 w-4" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            {claim.status === "Draft" && (
                              <DropdownMenuItem>
                                <Send className="mr-2 h-4 w-4" />
                                Submit Claim
                              </DropdownMenuItem>
                            )}
                            {(claim.status === "Pending" || claim.status === "Submitted") && (
                              <DropdownMenuItem>
                                <AlertCircle className="mr-2 h-4 w-4" />
                                Check Status
                              </DropdownMenuItem>
                            )}
                            {claim.status === "Rejected" && (
                              <DropdownMenuItem>
                                <Send className="mr-2 h-4 w-4" />
                                Resubmit Claim
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <Download className="mr-2 h-4 w-4" />
                              Download Claim
                            </DropdownMenuItem>
                            {claim.status !== "Approved" && <DropdownMenuItem className="text-red-600">Cancel Claim</DropdownMenuItem>}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approved">
          <Card>
            <CardHeader>
              <CardTitle>Approved Claims</CardTitle>
              <CardDescription>View all approved insurance claims.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table className="whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead>Claim ID</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead className="text-right">Claimed</TableHead>
                    <TableHead className="text-right">Approved</TableHead>
                    <TableHead className="hidden md:table-cell">Payment Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="whitespace-nowrap">
                  {claims
                    .filter((claim) => claim.status === "Approved")
                    .map((claim) => (
                      <TableRow key={claim.id}>
                        <TableCell className="font-medium">{claim.id}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={claim.patient.image || "/user-2.png"} alt={claim.patient.name} />
                              <AvatarFallback>{claim.patient.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span>{claim.patient.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{claim.provider}</TableCell>
                        <TableCell className="text-right">${claim.amount.toFixed(2)}</TableCell>
                        <TableCell className="text-right">${claim.approvedAmount.toFixed(2)}</TableCell>
                        <TableCell className="hidden md:table-cell">{claim.paymentDate}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" className="h-8">
                            <FileText className="mr-2 h-4 w-4" />
                            <span className="hidden sm:inline">Details</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Claims</CardTitle>
              <CardDescription>View all pending and submitted insurance claims.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table className="whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead>Claim ID</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="whitespace-nowrap">
                  {claims
                    .filter((claim) => claim.status === "Pending" || claim.status === "Submitted")
                    .map((claim) => (
                      <TableRow key={claim.id}>
                        <TableCell className="font-medium">{claim.id}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={claim.patient.image || "/user-2.png"} alt={claim.patient.name} />
                              <AvatarFallback>{claim.patient.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span>{claim.patient.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{claim.provider}</TableCell>
                        <TableCell>{claim.submittedDate}</TableCell>
                        <TableCell className="text-right">${claim.amount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={claim.status === "Pending" ? "border-amber-500 text-amber-500" : "border-blue-500 text-blue-500"}>
                            {claim.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" className="h-8">
                              <AlertCircle className="mr-2 h-4 w-4" />
                              <span className="hidden sm:inline">Check Status</span>
                            </Button>
                            <Button size="sm" variant="outline" className="h-8">
                              <FileText className="mr-2 h-4 w-4" />
                              <span className="hidden sm:inline">Details</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rejected">
          <Card>
            <CardHeader>
              <CardTitle>Rejected Claims</CardTitle>
              <CardDescription>View all rejected insurance claims.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table className="whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead>Claim ID</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="hidden md:table-cell">Rejection Reason</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="whitespace-nowrap">
                  {claims
                    .filter((claim) => claim.status === "Rejected")
                    .map((claim) => (
                      <TableRow key={claim.id}>
                        <TableCell className="font-medium">{claim.id}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={claim.patient.image || "/user-2.png"} alt={claim.patient.name} />
                              <AvatarFallback>{claim.patient.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span>{claim.patient.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{claim.provider}</TableCell>
                        <TableCell className="text-right">${claim.amount.toFixed(2)}</TableCell>
                        <TableCell className="hidden md:table-cell">{claim.rejectionReason || "Unknown reason"}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" className="h-8">
                            <Send className="mr-2 h-4 w-4" />
                            <span className="hidden sm:inline">Resubmit</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="draft">
          <Card>
            <CardHeader>
              <CardTitle>Draft Claims</CardTitle>
              <CardDescription>View all draft insurance claims not yet submitted.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table className="whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead>Claim ID</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="hidden md:table-cell">Invoice</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="whitespace-nowrap">
                  {claims
                    .filter((claim) => claim.status === "Draft")
                    .map((claim) => (
                      <TableRow key={claim.id}>
                        <TableCell className="font-medium">{claim.id}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={claim.patient.image || "/user-2.png"} alt={claim.patient.name} />
                              <AvatarFallback>{claim.patient.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span>{claim.patient.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{claim.provider}</TableCell>
                        <TableCell className="text-right">${claim.amount.toFixed(2)}</TableCell>
                        <TableCell className="hidden md:table-cell">{claim.invoice}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" className="h-8">
                              <Send className="mr-2 h-4 w-4" />
                              <span className="hidden sm:inline">Submit</span>
                            </Button>
                            <Button size="sm" variant="outline" className="h-8">
                              <FileText className="mr-2 h-4 w-4" />
                              <span className="hidden sm:inline">Edit</span>
                            </Button>
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Total Claims</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${claims.reduce((total, claim) => total + claim.amount, 0).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">From {claims.length} claims</p>
            <div className="mt-2 h-1 w-full bg-muted">
              <div className="h-1 bg-primary" style={{ width: "100%" }} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Approved Claims</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              $
              {claims
                .filter((claim) => claim.status === "Approved")
                .reduce((total, claim) => total + claim.approvedAmount, 0)
                .toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">From {claims.filter((claim) => claim.status === "Approved").length} claims</p>
            <div className="mt-2 h-1 w-full bg-muted">
              <div
                className="h-1 bg-green-500"
                style={{
                  width: `${(claims.filter((claim) => claim.status === "Approved").length / claims.length) * 100}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pending Claims</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              $
              {claims
                .filter((claim) => claim.status === "Pending" || claim.status === "Submitted")
                .reduce((total, claim) => total + claim.amount, 0)
                .toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">From {claims.filter((claim) => claim.status === "Pending" || claim.status === "Submitted").length} claims</p>
            <div className="mt-2 h-1 w-full bg-muted">
              <div
                className="h-1 bg-amber-500"
                style={{
                  width: `${(claims.filter((claim) => claim.status === "Pending" || claim.status === "Submitted").length / claims.length) * 100}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Claim Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round((claims.filter((claim) => claim.status === "Approved").length / claims.filter((claim) => claim.status !== "Draft" && claim.status !== "Pending" && claim.status !== "Submitted").length) * 100)}%</div>
            <p className="text-xs text-muted-foreground">Approval rate for submitted claims</p>
            <div className="mt-2">
              <Progress value={(claims.filter((claim) => claim.status === "Approved").length / claims.filter((claim) => claim.status !== "Draft" && claim.status !== "Pending" && claim.status !== "Submitted").length) * 100} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Claim Details</CardTitle>
          <CardDescription>View detailed information about a selected claim.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-medium">Claim CLM-001</h3>
                <p className="text-sm text-muted-foreground">Blue Cross Blue Shield • Submitted on 2024-04-15</p>
              </div>
              <Badge className="w-fit bg-green-500">Approved</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium">Patient Information</h4>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src="/colorful-abstract-shapes.png" alt="John Smith" />
                    <AvatarFallback>JS</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">John Smith</p>
                    <p className="text-sm text-muted-foreground">ID: P12345</p>
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  <p>Policy Number: BCBS123456789</p>
                  <p>Group Number: GRP987654321</p>
                  <p>Relationship to Subscriber: Self</p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Claim Information</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <p>Claim Type:</p>
                    <p className="font-medium">Medical</p>
                  </div>
                  <div className="flex justify-between">
                    <p>Claim Amount:</p>
                    <p className="font-medium">$200.00</p>
                  </div>
                  <div className="flex justify-between">
                    <p>Approved Amount:</p>
                    <p className="font-medium">$180.00</p>
                  </div>
                  <div className="flex justify-between">
                    <p>Patient Responsibility:</p>
                    <p className="font-medium">$20.00</p>
                  </div>
                  <div className="flex justify-between">
                    <p>Payment Date:</p>
                    <p className="font-medium">2024-04-22</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Services & Procedures</h4>
              <Table className="whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Billed</TableHead>
                    <TableHead className="text-right">Allowed</TableHead>
                    <TableHead className="text-right">Patient Resp.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="whitespace-nowrap">
                  <TableRow>
                    <TableCell>General Consultation</TableCell>
                    <TableCell>2024-04-15</TableCell>
                    <TableCell className="text-right">$150.00</TableCell>
                    <TableCell className="text-right">$135.00</TableCell>
                    <TableCell className="text-right">$15.00</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Blood Test - Basic Panel</TableCell>
                    <TableCell>2024-04-15</TableCell>
                    <TableCell className="text-right">$50.00</TableCell>
                    <TableCell className="text-right">$45.00</TableCell>
                    <TableCell className="text-right">$5.00</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Notes</h4>
              <p className="text-sm">Claim approved with standard copay deduction</p>
            </div>

            <div className="flex justify-end gap-2 flex-wrap">
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Download EOB
              </Button>
              <Button variant="outline" size="sm">
                <FileText className="mr-2 h-4 w-4" />
                View Invoice
              </Button>
              <Button size="sm">
                <CheckCircle className="mr-2 h-4 w-4" />
                Mark as Reconciled
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
