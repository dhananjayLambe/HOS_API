import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  ArrowLeft,
  Search,
  Filter,
  MoreHorizontal,
  Plus,
  Download,
  Award,
  FileText,
  Bell,
  Eye,
  Edit,
  Trash,
  AlertTriangle,
  CheckCircle,
  Clock,
} from "lucide-react"
import Link from "next/link"

// Mock data for certifications
const certifications = [
  {
    id: 1,
    staffName: "Dr. Sarah Johnson",
    staffId: "1",
    staffAvatar: "/mystical-forest-spirit.png",
    staffInitials: "SJ",
    department: "Medical",
    role: "Cardiologist",
    certName: "Board Certified in Cardiology",
    issuingBody: "American Board of Internal Medicine",
    issueDate: "2015-05-10",
    expiryDate: "2025-05-10",
    status: "Valid",
    daysUntilExpiry: 730,
  },
  {
    id: 2,
    staffName: "Dr. Sarah Johnson",
    staffId: "1",
    staffAvatar: "/mystical-forest-spirit.png",
    staffInitials: "SJ",
    department: "Medical",
    role: "Cardiologist",
    certName: "Advanced Cardiac Life Support (ACLS)",
    issuingBody: "American Heart Association",
    issueDate: "2020-03-15",
    expiryDate: "2022-03-15",
    status: "Expired",
    daysUntilExpiry: -365,
  },
  {
    id: 3,
    staffName: "Dr. Michael Chen",
    staffId: "2",
    staffAvatar: "",
    staffInitials: "MC",
    department: "Medical",
    role: "Neurologist",
    certName: "Board Certified in Neurology",
    issuingBody: "American Board of Psychiatry and Neurology",
    issueDate: "2016-07-22",
    expiryDate: "2026-07-22",
    status: "Valid",
    daysUntilExpiry: 1095,
  },
  {
    id: 4,
    staffName: "Emma Rodriguez",
    staffId: "3",
    staffAvatar: "",
    staffInitials: "ER",
    department: "Nursing",
    role: "Head Nurse",
    certName: "Registered Nurse (RN) License",
    issuingBody: "State Nursing Board",
    issueDate: "2018-02-10",
    expiryDate: "2024-02-10",
    status: "Expiring Soon",
    daysUntilExpiry: 45,
  },
  {
    id: 5,
    staffName: "Robert Davis",
    staffId: "4",
    staffAvatar: "",
    staffInitials: "RD",
    department: "Laboratory",
    role: "Lab Technician",
    certName: "Medical Laboratory Technician Certification",
    issuingBody: "American Society for Clinical Pathology",
    issueDate: "2019-11-05",
    expiryDate: "2023-11-05",
    status: "Expiring Soon",
    daysUntilExpiry: 30,
  },
  {
    id: 6,
    staffName: "Jennifer Kim",
    staffId: "5",
    staffAvatar: "",
    staffInitials: "JK",
    department: "Pharmacy",
    role: "Pharmacist",
    certName: "Pharmacist License",
    issuingBody: "State Board of Pharmacy",
    issueDate: "2017-03-18",
    expiryDate: "2023-03-18",
    status: "Expired",
    daysUntilExpiry: -60,
  },
  {
    id: 7,
    staffName: "David Wilson",
    staffId: "6",
    staffAvatar: "",
    staffInitials: "DW",
    department: "Radiology",
    role: "Radiologist",
    certName: "American Board of Radiology Certification",
    issuingBody: "American Board of Radiology",
    issueDate: "2016-09-30",
    expiryDate: "2026-09-30",
    status: "Valid",
    daysUntilExpiry: 1460,
  },
  {
    id: 8,
    staffName: "Maria Garcia",
    staffId: "7",
    staffAvatar: "",
    staffInitials: "MG",
    department: "Administration",
    role: "Receptionist",
    certName: "Medical Office Administration Certificate",
    issuingBody: "National Healthcare Association",
    issueDate: "2020-01-12",
    expiryDate: "2024-01-12",
    status: "Valid",
    daysUntilExpiry: 180,
  },
]

export default function StaffCertificationsPage() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild className="h-8 w-8">
          <Link href="/staff">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Staff Certifications</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Certifications</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{certifications.length}</div>
            <p className="text-xs text-muted-foreground">
              Across {new Set(certifications.map((cert) => cert.staffId)).size} staff members
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valid</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{certifications.filter((cert) => cert.status === "Valid").length}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round(
                (certifications.filter((cert) => cert.status === "Valid").length / certifications.length) * 100,
              )}
              % of total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {certifications.filter((cert) => cert.status === "Expiring Soon").length}
            </div>
            <p className="text-xs text-muted-foreground">Require renewal in next 90 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {certifications.filter((cert) => cert.status === "Expired").length}
            </div>
            <p className="text-xs text-muted-foreground">Need immediate attention</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder="Search certifications..." className="w-[200px] pl-8 md:w-[300px]" />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Certification
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Certification</DialogTitle>
                  <DialogDescription>Record a new certification or license for a staff member.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="staff">Staff Member</Label>
                    <select
                      id="staff"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Select staff member</option>
                      {Array.from(new Set(certifications.map((cert) => cert.staffId))).map((staffId) => {
                        const staff = certifications.find((cert) => cert.staffId === staffId)
                        return (
                          <option key={staffId} value={staffId}>
                            {staff?.staffName} - {staff?.role}
                          </option>
                        )
                      })}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="cert-name">Certification Name</Label>
                    <Input id="cert-name" placeholder="Enter certification name" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="issuing-body">Issuing Organization</Label>
                    <Input id="issuing-body" placeholder="Enter issuing organization" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="issue-date">Issue Date</Label>
                      <Input id="issue-date" type="date" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="expiry-date">Expiry Date</Label>
                      <Input id="expiry-date" type="date" />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Input id="notes" placeholder="Add any additional notes" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline">Cancel</Button>
                  <Button>Save Certification</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">All Certifications</TabsTrigger>
            <TabsTrigger value="valid">Valid</TabsTrigger>
            <TabsTrigger value="expiring">Expiring Soon</TabsTrigger>
            <TabsTrigger value="expired">Expired</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table className="whitespace-nowrap">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff</TableHead>
                      <TableHead>Certification</TableHead>
                      <TableHead>Issuing Body</TableHead>
                      <TableHead>Issue Date</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="whitespace-nowrap">
                    {certifications.map((cert) => (
                      <TableRow key={cert.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={cert.staffAvatar || "/user-2.png"} alt={cert.staffName} />
                              <AvatarFallback>{cert.staffInitials}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{cert.staffName}</div>
                              <div className="text-xs text-muted-foreground">{cert.role}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{cert.certName}</TableCell>
                        <TableCell>{cert.issuingBody}</TableCell>
                        <TableCell>{new Date(cert.issueDate).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(cert.expiryDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              cert.status === "Valid"
                                ? "default"
                                : cert.status === "Expiring Soon"
                                  ? "warning"
                                  : "destructive"
                            }
                          >
                            {cert.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Bell className="mr-2 h-4 w-4" />
                                Set Reminder
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive focus:text-destructive">
                                <Trash className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
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
          <TabsContent value="valid" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table className="whitespace-nowrap">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff</TableHead>
                      <TableHead>Certification</TableHead>
                      <TableHead>Issuing Body</TableHead>
                      <TableHead>Issue Date</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Days Until Expiry</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="whitespace-nowrap">
                    {certifications
                      .filter((cert) => cert.status === "Valid")
                      .map((cert) => (
                        <TableRow key={cert.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={cert.staffAvatar || "/user-2.png"} alt={cert.staffName} />
                                <AvatarFallback>{cert.staffInitials}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{cert.staffName}</div>
                                <div className="text-xs text-muted-foreground">{cert.role}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{cert.certName}</TableCell>
                          <TableCell>{cert.issuingBody}</TableCell>
                          <TableCell>{new Date(cert.issueDate).toLocaleDateString()}</TableCell>
                          <TableCell>{new Date(cert.expiryDate).toLocaleDateString()}</TableCell>
                          <TableCell>{cert.daysUntilExpiry}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm">
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="expiring" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table className="whitespace-nowrap">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff</TableHead>
                      <TableHead>Certification</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Days Remaining</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="whitespace-nowrap">
                    {certifications
                      .filter((cert) => cert.status === "Expiring Soon")
                      .map((cert) => (
                        <TableRow key={cert.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={cert.staffAvatar || "/user-2.png"} alt={cert.staffName} />
                                <AvatarFallback>{cert.staffInitials}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{cert.staffName}</div>
                                <div className="text-xs text-muted-foreground">{cert.role}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{cert.certName}</TableCell>
                          <TableCell>{new Date(cert.expiryDate).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge variant="warning">{cert.daysUntilExpiry} days</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm">
                              <Bell className="mr-2 h-4 w-4" />
                              Send Reminder
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="expired" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table className="whitespace-nowrap">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff</TableHead>
                      <TableHead>Certification</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Days Overdue</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="whitespace-nowrap">
                    {certifications
                      .filter((cert) => cert.status === "Expired")
                      .map((cert) => (
                        <TableRow key={cert.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={cert.staffAvatar || "/user-2.png"} alt={cert.staffName} />
                                <AvatarFallback>{cert.staffInitials}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{cert.staffName}</div>
                                <div className="text-xs text-muted-foreground">{cert.role}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{cert.certName}</TableCell>
                          <TableCell>{new Date(cert.expiryDate).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge variant="destructive">{Math.abs(cert.daysUntilExpiry)} days</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm">
                              <FileText className="mr-2 h-4 w-4" />
                              Renew
                            </Button>
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
    </div>
  )
}
