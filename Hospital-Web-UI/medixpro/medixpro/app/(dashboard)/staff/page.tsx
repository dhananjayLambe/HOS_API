"use client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Award, Building, Calendar, Clipboard, Clock, Download, Edit, Eye, FileText, Filter, Mail, MoreVertical, Phone, RefreshCw, Search, Shield, Trash, UserCheck, UserPlus, Users, UserX } from "lucide-react";
import Link from "next/link";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useState } from "react";

// Mock data for staff members
const staffMembers = [
  {
    id: "1",
    name: "Dr. Sarah Johnson",
    initials: "SJ",
    role: "Cardiologist",
    department: "Medical",
    email: "sarah.j@clinic.com",
    phone: "555-0101",
    status: "Active",
    avatar: "/mystical-forest-spirit.png",
    joinDate: "May 15, 2012",
  },
  {
    id: "2",
    name: "Dr. Michael Chen",
    initials: "MC",
    role: "Neurologist",
    department: "Medical",
    email: "michael.c@clinic.com",
    phone: "555-0102",
    status: "Active",
    avatar: "",
    joinDate: "Jun 22, 2015",
  },
  {
    id: "3",
    name: "Emma Rodriguez",
    initials: "ER",
    role: "Head Nurse",
    department: "Nursing",
    email: "emma.r@clinic.com",
    phone: "555-0103",
    status: "On Leave",
    avatar: "",
    joinDate: "Feb 10, 2018",
  },
  {
    id: "4",
    name: "Robert Davis",
    initials: "RD",
    role: "Lab Technician",
    department: "Laboratory",
    email: "robert.d@clinic.com",
    phone: "555-0104",
    status: "Active",
    avatar: "",
    joinDate: "Nov 5, 2019",
  },
  {
    id: "5",
    name: "Jennifer Kim",
    initials: "JK",
    role: "Pharmacist",
    department: "Pharmacy",
    email: "jennifer.k@clinic.com",
    phone: "555-0105",
    status: "Active",
    avatar: "",
    joinDate: "Mar 18, 2017",
  },
  {
    id: "6",
    name: "David Wilson",
    initials: "DW",
    role: "Radiologist",
    department: "Radiology",
    email: "david.w@clinic.com",
    phone: "555-0106",
    status: "Inactive",
    avatar: "",
    joinDate: "Sep 30, 2016",
  },
  {
    id: "7",
    name: "Maria Garcia",
    initials: "MG",
    role: "Receptionist",
    department: "Administration",
    email: "maria.g@clinic.com",
    phone: "555-0107",
    status: "Active",
    avatar: "",
    joinDate: "Jan 12, 2020",
  },
  {
    id: "8",
    name: "James Brown",
    initials: "JB",
    role: "Physical Therapist",
    department: "Therapy",
    email: "james.b@clinic.com",
    phone: "555-0108",
    status: "Active",
    avatar: "",
    joinDate: "Jul 7, 2018",
  },
];

// Mock data for department stats
const departmentStats = [
  { name: "Medical", count: 12, color: "bg-blue-500" },
  { name: "Nursing", count: 18, color: "bg-green-500" },
  { name: "Administration", count: 8, color: "bg-purple-500" },
  { name: "Laboratory", count: 5, color: "bg-amber-500" },
  { name: "Pharmacy", count: 4, color: "bg-red-500" },
  { name: "Radiology", count: 3, color: "bg-indigo-500" },
  { name: "Therapy", count: 6, color: "bg-pink-500" },
  { name: "Support", count: 7, color: "bg-cyan-500" },
];

export default function StaffPage() {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  return (
    <>
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">Staff Management</h2>
          <p className="text-muted-foreground">Manage clinic staff, roles, and permissions</p>
        </div>
        <div className="flex items-center flex-wrap gap-2">
          <Button asChild>
            <Link href="/staff/add">
              <UserPlus className="mr-2 h-4 w-4" />
              Add New Staff
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <FileText className="mr-2 h-4 w-4" />
                More Options
                <svg className="ml-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/staff/roles">
                  <Shield className="mr-2 h-4 w-4" />
                  Roles & Permissions
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/staff/attendance">
                  <Clock className="mr-2 h-4 w-4" />
                  Attendance
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/staff/certifications">
                  <Award className="mr-2 h-4 w-4" />
                  Certifications
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/staff/performance">
                  <Clipboard className="mr-2 h-4 w-4" />
                  Performance
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="md:grid max-md:space-y-6 gap-6 md:grid-cols-4">
        <Card className="md:col-span-3">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Staff Directory</CardTitle>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input type="search" placeholder="Search staff..." className="w-full pl-8 sm:w-[300px]" />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Filter className="h-4 w-4" />
                      <span className="sr-only">Filter</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[200px]">
                    <DropdownMenuLabel>Filter By</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Select>
                        <SelectTrigger className="w-full border-none p-0 shadow-none">
                          <SelectValue placeholder="Department" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Departments</SelectItem>
                          <SelectItem value="medical">Medical</SelectItem>
                          <SelectItem value="nursing">Nursing</SelectItem>
                          <SelectItem value="admin">Administration</SelectItem>
                          <SelectItem value="lab">Laboratory</SelectItem>
                          <SelectItem value="pharmacy">Pharmacy</SelectItem>
                          <SelectItem value="radiology">Radiology</SelectItem>
                          <SelectItem value="therapy">Therapy</SelectItem>
                          <SelectItem value="support">Support</SelectItem>
                        </SelectContent>
                      </Select>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Select>
                        <SelectTrigger className="w-full border-none p-0 shadow-none">
                          <SelectValue placeholder="Role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Roles</SelectItem>
                          <SelectItem value="doctor">Doctor</SelectItem>
                          <SelectItem value="nurse">Nurse</SelectItem>
                          <SelectItem value="admin">Administrator</SelectItem>
                          <SelectItem value="technician">Technician</SelectItem>
                          <SelectItem value="receptionist">Receptionist</SelectItem>
                        </SelectContent>
                      </Select>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Select>
                        <SelectTrigger className="w-full border-none p-0 shadow-none">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Statuses</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="on-leave">On Leave</SelectItem>
                        </SelectContent>
                      </Select>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Button variant="outline" size="sm" className="w-full">
                        <RefreshCw className="mr-2 h-3 w-3" />
                        Reset Filters
                      </Button>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="list" className="w-full">
              <TabsList className="mb-4 grid w-full grid-cols-2">
                <TabsTrigger value="list">List View</TabsTrigger>
                <TabsTrigger value="grid">Grid View</TabsTrigger>
              </TabsList>
              <TabsContent value="list" className="mt-0">
                <div className="rounded-md border">
                  <Table className="whitespace-nowrap">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="hidden md:table-cell">Department</TableHead>
                        <TableHead className="hidden md:table-cell">Contact</TableHead>
                        <TableHead className="hidden md:table-cell">Joined</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="whitespace-nowrap">
                      {staffMembers.map((staff) => (
                        <TableRow key={staff.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={staff.avatar || "/user-2.png?height=32&width=32&query=person"} alt={staff.name} />
                                <AvatarFallback>{staff.initials}</AvatarFallback>
                              </Avatar>
                              <div className="font-medium">{staff.name}</div>
                            </div>
                          </TableCell>
                          <TableCell>{staff.role}</TableCell>
                          <TableCell className="hidden md:table-cell">{staff.department}</TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="flex flex-col">
                              <span className="text-xs text-muted-foreground">{staff.email}</span>
                              <span className="text-xs text-muted-foreground">{staff.phone}</span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">{staff.joinDate}</TableCell>
                          <TableCell>
                            <Badge variant={staff.status === "Active" ? "success" : staff.status === "On Leave" ? "warning" : "secondary"}>{staff.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                  <span className="sr-only">Actions</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                  <Link href={`/staff/${staff.id}`}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Profile
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={`/staff/${staff.id}/edit`}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={`/staff/${staff.id}/schedule`}>
                                    <Calendar className="mr-2 h-4 w-4" />
                                    Schedule
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                  {staff.status === "Active" ? (
                                    <>
                                      <UserX className="mr-2 h-4 w-4" />
                                      Deactivate
                                    </>
                                  ) : (
                                    <>
                                      <UserCheck className="mr-2 h-4 w-4" />
                                      Activate
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setDeleteDialogOpen(true)} className="text-red-500">
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
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing <strong>1-8</strong> of <strong>63</strong> staff members
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled>
                      Previous
                    </Button>
                    <Button variant="outline" size="sm">
                      Next
                    </Button>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="grid" className="mt-0">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {staffMembers.map((staff) => (
                    <Card key={staff.id} className="overflow-hidden">
                      <CardContent className="!p-0">
                        <div className="flex flex-col">
                          <div className="flex items-center justify-between bg-muted p-2 lg:p-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={staff.avatar || "/user-2.png?height=40&width=40&query=person"} alt={staff.name} />
                                <AvatarFallback>{staff.initials}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{staff.name}</div>
                                <div className="text-xs text-muted-foreground">{staff.role}</div>
                              </div>
                            </div>
                            <Badge variant={staff.status === "Active" ? "success" : staff.status === "On Leave" ? "warning" : "secondary"}>{staff.status}</Badge>
                          </div>
                          <div className="p-4">
                            <div className="grid gap-2">
                              <div className="flex items-center gap-2">
                                <Building className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{staff.department}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{staff.email}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{staff.phone}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">Joined {staff.joinDate}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex border-t">
                            <Button asChild variant="ghost" className="flex-1 rounded-none rounded-bl-md py-2">
                              <Link href={`/staff/${staff.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </Link>
                            </Button>
                            <Button asChild variant="ghost" className="flex-1 rounded-none border-l py-2">
                              <Link href={`/staff/${staff.id}/edit`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </Link>
                            </Button>
                            <Button asChild variant="ghost" className="flex-1 rounded-none rounded-br-md border-l py-2">
                              <Link href={`/staff/${staff.id}/schedule`}>
                                <Calendar className="mr-2 h-4 w-4" />
                                Schedule
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing <strong>1-8</strong> of <strong>63</strong> staff members
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled>
                      Previous
                    </Button>
                    <Button variant="outline" size="sm">
                      Next
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="pb-2 flex !flex-row items-center justify-between">
              <CardTitle className="text-base">Staff Overview</CardTitle>
              <Users className="size-8 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-3xl font-bold">63</span>
                  <span className="text-xs text-muted-foreground">Total Staff</span>
                </div>                
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Active</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">52</Badge>
                    <span className="text-xs text-muted-foreground">83%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>On Leave</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">8</Badge>
                    <span className="text-xs text-muted-foreground">13%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Inactive</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">3</Badge>
                    <span className="text-xs text-muted-foreground">4%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Departments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {departmentStats.map((dept) => (
                  <div key={dept.name} className="flex items-center gap-2">
                    <div className={`h-3 w-3 rounded-full ${dept.color}`} />
                    <div className="flex flex-1 items-center justify-between">
                      <span className="text-sm">{dept.name}</span>
                      <Badge variant="outline">{dept.count}</Badge>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-center">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/departments">
                    <Building className="mr-2 h-4 w-4" />
                    Manage Departments
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                <Button variant="outline" className="justify-start" asChild>
                  <Link href="/staff/add">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add New Staff
                  </Link>
                </Button>
                <Button variant="outline" className="justify-start" asChild>
                  <Link href="/staff/roles">
                    <Shield className="mr-2 h-4 w-4" />
                    Manage Roles
                  </Link>
                </Button>
                <Button variant="outline" className="justify-start" asChild>
                  <Link href="/staff/attendance">
                    <Clock className="mr-2 h-4 w-4" />
                    Attendance
                  </Link>
                </Button>
                <Button variant="outline" className="justify-start">
                  <Download className="mr-2 h-4 w-4" />
                  Export Staff List
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>

    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to Delete this staff member?</AlertDialogTitle>
            <AlertDialogDescription>This action will permanently delete the staff member's record from the system. This action cannot be undone and will remove all associated data including schedules, permissions and attendance records.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => setDeleteDialogOpen(false)} className="bg-red-500 text-neutral-50 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
