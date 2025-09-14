"use client"

import { use, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ArrowLeft, Check, MoreHorizontal, Search, UserPlus, X } from "lucide-react"
import Link from "next/link"
import { AlertDialog, AlertDialogHeader, AlertDialogDescription, AlertDialogAction, AlertDialogFooter, AlertDialogContent, AlertDialogCancel, AlertDialogTitle } from "@/components/ui/alert-dialog"

export default function ManageDepartmentStaffPage({ params }: { params: Promise<{ id: string }> }) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const {id} = use(params)
  const departmentId = Number.parseInt(id)
  const department = departments.find((d) => d.id === departmentId) || departments[0]

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStaff, setSelectedStaff] = useState<string[]>([])

  const filteredStaff = departmentStaff.filter(
    (staff) =>
      staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staff.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staff.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const toggleStaffSelection = (id: string) => {
    setSelectedStaff((prev) => (prev.includes(id) ? prev.filter((staffId) => staffId !== id) : [...prev, id]))
  }

  const selectAllStaff = () => {
    if (selectedStaff.length === filteredStaff.length) {
      setSelectedStaff([])
    } else {
      setSelectedStaff(filteredStaff.map((staff) => staff.id))
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 flex-wrap"> 
        <Link href={`/departments/${departmentId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">Manage Staff</h2>
        <Badge
          className={
            department.status === "Active"
              ? "bg-green-100 text-green-800 hover:bg-green-100"
              : "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
          }
        >
          {department.name}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Department Staff</CardTitle>
              <CardDescription>Manage staff assigned to the {department.name} department</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search staff..."
                  className="w-full pl-8 md:w-[300px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Staff
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {selectedStaff.length > 0 && (
                <>
                  <span className="text-sm text-muted-foreground">{selectedStaff.length} selected</span>
                  <Button variant="outline" size="sm" onClick={() => setSelectedStaff([])}>
                    <X className="mr-2 h-3 w-3" />
                    Clear
                  </Button>
                  <Button variant="outline" size="sm">
                    <Check className="mr-2 h-3 w-3" />
                    Change Role
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-500 hover:text-red-500">
                    Remove from Department
                  </Button>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Role:</span>
              <Select defaultValue="all">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="doctor">Doctors</SelectItem>
                  <SelectItem value="nurse">Nurses</SelectItem>
                  <SelectItem value="technician">Technicians</SelectItem>
                  <SelectItem value="admin">Administrative</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border">
            <Table className="whitespace-nowrap">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedStaff.length === filteredStaff.length && filteredStaff.length > 0}
                      onCheckedChange={selectAllStaff}
                      aria-label="Select all staff"
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="whitespace-nowrap">
                {filteredStaff.map((staff) => (
                  <TableRow key={staff.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedStaff.includes(staff.id)}
                        onCheckedChange={() => toggleStaffSelection(staff.id)}
                        aria-label={`Select ${staff.name}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={staff.avatar || "/user-2.png"} alt={staff.name} />
                          <AvatarFallback>
                            {staff.name
                              .split(" ")
                              .map((n, i, arr) => i === arr.length - 1 ? n[0] : n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{staff.name}</div>
                          <div className="text-xs text-muted-foreground">{staff.id}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{staff.role}</TableCell>
                    <TableCell>{staff.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          staff.status === "Active"
                            ? "bg-green-100 text-green-800 hover:bg-green-100"
                            : "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                        }
                      >
                        {staff.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{staff.joined}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem>
                            <Link href={`/staff/1`}>
                              View profile
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem>Change role</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setDeleteDialogOpen(true)} className="text-red-600">Remove from department</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredStaff.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No staff found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to remove this staff from the department?</AlertDialogTitle>
            <AlertDialogDescription>This action will remove the staff from the department and they will no longer be visible to patients. You can reactivate them later if needed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => setDeleteDialogOpen(false)} className="bg-red-500 text-neutral-50 hover:bg-red-700">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

const departments = [
  {
    id: 1,
    name: "Cardiology",
    head: "Dr. Sarah Johnson",
    staffCount: 8,
    services: 12,
    status: "Active",
  },
  {
    id: 2,
    name: "Neurology",
    head: "Dr. Michael Chen",
    staffCount: 6,
    services: 9,
    status: "Active",
  },
  {
    id: 3,
    name: "Pediatrics",
    head: "Dr. Emily Rodriguez",
    staffCount: 10,
    services: 15,
    status: "Active",
  },
  {
    id: 4,
    name: "Orthopedics",
    head: "Dr. James Wilson",
    staffCount: 7,
    services: 11,
    status: "Active",
  },
  {
    id: 5,
    name: "Dermatology",
    head: "Dr. Lisa Thompson",
    staffCount: 4,
    services: 8,
    status: "Active",
  },
  {
    id: 6,
    name: "Ophthalmology",
    head: "Dr. Robert Kim",
    staffCount: 5,
    services: 7,
    status: "Active",
  },
  {
    id: 7,
    name: "Psychiatry",
    head: "Dr. Jennifer Martinez",
    staffCount: 6,
    services: 10,
    status: "Active",
  },
  {
    id: 8,
    name: "Radiology",
    head: "Dr. David Brown",
    staffCount: 4,
    services: 6,
    status: "Inactive",
  },
  {
    id: 9,
    name: "Oncology",
    head: "Dr. Susan Lee",
    staffCount: 7,
    services: 9,
    status: "Active",
  },
  {
    id: 10,
    name: "Endocrinology",
    head: "Dr. Thomas Garcia",
    staffCount: 3,
    services: 5,
    status: "Inactive",
  },
]

const departmentStaff = [
  {
    id: "STAFF-001",
    name: "Dr. Sarah Johnson",
    role: "Cardiologist",
    email: "sarah.johnson@clinic.com",
    status: "Active",
    joined: "Jan 15, 2020",
    avatar: "/thoughtful-gaze.png",
  },
  {
    id: "STAFF-002",
    name: "Dr. Robert Chen",
    role: "Cardiologist",
    email: "robert.chen@clinic.com",
    status: "Active",
    joined: "Mar 22, 2020",
    avatar: "/contemplative-artist.png",
  },
  {
    id: "STAFF-003",
    name: "Dr. Amanda Lee",
    role: "Cardiologist",
    email: "amanda.lee@clinic.com",
    status: "Active",
    joined: "Jun 10, 2021",
    avatar: "/contemplative-artist.png",
  },
  {
    id: "STAFF-004",
    name: "Nurse Jessica Parker",
    role: "Cardiac Nurse",
    email: "jessica.parker@clinic.com",
    status: "Active",
    joined: "Feb 05, 2020",
    avatar: "/thoughtful-artist.png",
  },
  {
    id: "STAFF-005",
    name: "Nurse David Wilson",
    role: "Cardiac Nurse",
    email: "david.wilson@clinic.com",
    status: "Active",
    joined: "Apr 18, 2021",
    avatar: "/user-2.png?height=32&width=32&query=portrait5",
  },
  {
    id: "STAFF-006",
    name: "Technician Alex Brown",
    role: "ECG Technician",
    email: "alex.brown@clinic.com",
    status: "Active",
    joined: "Sep 30, 2021",
    avatar: "/user-2.png?height=32&width=32&query=portrait6",
  },
  {
    id: "STAFF-007",
    name: "Technician Maria Garcia",
    role: "Cardiac Technician",
    email: "maria.garcia@clinic.com",
    status: "Inactive",
    joined: "Nov 12, 2020",
    avatar: "/user-2.png?height=32&width=32&query=portrait7",
  },
  {
    id: "STAFF-008",
    name: "Admin Lisa Thompson",
    role: "Department Admin",
    email: "lisa.thompson@clinic.com",
    status: "Active",
    joined: "Jan 05, 2022",
    avatar: "/user-2.png?height=32&width=32&query=portrait8",
  },
]
