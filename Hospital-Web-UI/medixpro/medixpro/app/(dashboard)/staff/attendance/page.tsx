"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ArrowLeft,
  Search,
  Plus,
  MoreHorizontal,
  Download,
  Calendar,
  Clock,
  UserCheck,
  UserX,
  UserMinus,
  AlertTriangle,
  Filter,
  CheckCircle,
  XCircle,
  FileText,
  CalendarClock,
  Eye,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  ClipboardList,
  BarChart4,
  Printer,
  FileSpreadsheet,
  CheckCircle2,
  CircleXIcon as XCircle2,
  AlertOctagon,
  Clock3,
} from "lucide-react"
import Link from "next/link"
import { EditTimeModal } from "@/components/attendance/edit-time-modal"
import { AddNoteModal } from "@/components/attendance/add-note-modal"
import { ViewHistoryModal } from "@/components/attendance/view-history-modal"

export default function StaffAttendancePage() {
  const [currentDate, setCurrentDate] = useState("May 15, 2023")
  const [currentMonth, setCurrentMonth] = useState("May 2023")
  const [selectedDepartment, setSelectedDepartment] = useState("All Departments")
  const [searchQuery, setSearchQuery] = useState("")

  // Add these new state variables
  const [editTimeModalOpen, setEditTimeModalOpen] = useState(false)
  const [addNoteModalOpen, setAddNoteModalOpen] = useState(false)
  const [viewHistoryModalOpen, setViewHistoryModalOpen] = useState(false)
  const [selectedStaffMember, setSelectedStaffMember] = useState<any>(null)

  // Add these functions after the state variables
  const handleEditTime = (staffMember: any) => {
    setSelectedStaffMember(staffMember)
    setEditTimeModalOpen(true)
  }

  const handleAddNote = (staffMember: any) => {
    setSelectedStaffMember(staffMember)
    setAddNoteModalOpen(true)
  }

  const handleViewHistory = (staffMember: any) => {
    setSelectedStaffMember(staffMember)
    setViewHistoryModalOpen(true)
  }

  const handleSaveTime = (data: { timeType: string; time: string }) => {
    // In a real app, this would update the database
    console.log(`Updated ${data.timeType} to ${data.time} for ${selectedStaffMember?.name}`)
    // You could update the local state here to reflect the changes
  }

  const handleSaveNote = (data: { noteType: string; note: string }) => {
    // In a real app, this would update the database
    console.log(`Added ${data.noteType} note: ${data.note} for ${selectedStaffMember?.name}`)
    // You could update the local state here to reflect the changes
  }

  // Mock data for attendance
  const attendanceData = [
    {
      id: 1,
      name: "Dr. Sarah Johnson",
      role: "Cardiologist",
      department: "Medical",
      date: "2023-05-15",
      checkIn: "08:45 AM",
      checkOut: "05:30 PM",
      status: "Present",
      hours: "8.75",
      avatar: "/stylized-initials.png",
    },
    {
      id: 2,
      name: "Dr. Michael Chen",
      role: "Neurologist",
      department: "Medical",
      date: "2023-05-15",
      checkIn: "09:15 AM",
      checkOut: "06:00 PM",
      status: "Present",
      hours: "8.75",
      avatar: "/microphone-crowd.png",
    },
    {
      id: 3,
      name: "Nurse Emma Wilson",
      role: "Head Nurse",
      department: "Nursing",
      date: "2023-05-15",
      checkIn: "08:00 AM",
      checkOut: "04:30 PM",
      status: "Present",
      hours: "8.5",
      avatar: "/graffiti-ew.png",
    },
    {
      id: 4,
      name: "James Rodriguez",
      role: "Lab Technician",
      department: "Laboratory",
      date: "2023-05-15",
      checkIn: "08:30 AM",
      checkOut: "05:00 PM",
      status: "Present",
      hours: "8.5",
      avatar: "/abstract-jr.png",
    },
    {
      id: 5,
      name: "Lisa Thompson",
      role: "Receptionist",
      department: "Administration",
      date: "2023-05-15",
      checkIn: "08:55 AM",
      checkOut: "05:15 PM",
      status: "Present",
      hours: "8.33",
      avatar: "/abstract-geometric-lt.png",
    },
    {
      id: 6,
      name: "Dr. Robert Davis",
      role: "Pediatrician",
      department: "Medical",
      date: "2023-05-15",
      checkIn: "10:30 AM",
      checkOut: "06:45 PM",
      status: "Late",
      hours: "8.25",
      avatar: "/red-door.png",
    },
    {
      id: 7,
      name: "Sophia Martinez",
      role: "Pharmacist",
      department: "Pharmacy",
      date: "2023-05-15",
      checkIn: null,
      checkOut: null,
      status: "Absent",
      hours: "0",
      avatar: "/abstract-geometric-sm.png",
    },
    {
      id: 8,
      name: "Daniel Lee",
      role: "IT Support",
      department: "IT",
      date: "2023-05-15",
      checkIn: null,
      checkOut: null,
      status: "On Leave",
      hours: "0",
      avatar: "/abstract-dl.png",
    },
  ]

  // Mock data for leave requests
  const leaveRequests = [
    {
      id: 1,
      name: "Dr. Sarah Johnson",
      role: "Cardiologist",
      department: "Medical",
      type: "Vacation",
      startDate: "2023-06-10",
      endDate: "2023-06-17",
      days: 7,
      status: "Approved",
      approvedBy: "Dr. William Smith",
      avatar: "/stylized-initials.png",
    },
    {
      id: 2,
      name: "Nurse Emma Wilson",
      role: "Head Nurse",
      department: "Nursing",
      type: "Sick Leave",
      startDate: "2023-05-20",
      endDate: "2023-05-22",
      days: 2,
      status: "Pending",
      approvedBy: null,
      avatar: "/graffiti-ew.png",
    },
    {
      id: 3,
      name: "James Rodriguez",
      role: "Lab Technician",
      department: "Laboratory",
      type: "Personal",
      startDate: "2023-05-25",
      endDate: "2023-05-25",
      days: 1,
      status: "Pending",
      approvedBy: null,
      avatar: "/abstract-jr.png",
    },
    {
      id: 4,
      name: "Daniel Lee",
      role: "IT Support",
      department: "IT",
      type: "Vacation",
      startDate: "2023-05-15",
      endDate: "2023-05-19",
      days: 5,
      status: "Approved",
      approvedBy: "Lisa Thompson",
      avatar: "/abstract-dl.png",
    },
  ]

  // Mock data for monthly timesheets
  const timesheetData = [
    {
      id: 1,
      name: "Dr. Sarah Johnson",
      department: "Medical",
      weekStarting: "May 15, 2023",
      totalHours: "42.5",
      overtime: "2.5",
      status: "Pending Approval",
      avatar: "/stylized-initials.png",
    },
    {
      id: 2,
      name: "Nurse Emma Wilson",
      department: "Nursing",
      weekStarting: "May 15, 2023",
      totalHours: "40.0",
      overtime: "0.0",
      status: "Approved",
      avatar: "/graffiti-ew.png",
    },
    {
      id: 3,
      name: "James Rodriguez",
      department: "Laboratory",
      weekStarting: "May 15, 2023",
      totalHours: "38.5",
      overtime: "0.0",
      status: "Approved",
      avatar: "/abstract-jr.png",
    },
    {
      id: 4,
      name: "Dr. Michael Chen",
      department: "Medical",
      weekStarting: "May 8, 2023",
      totalHours: "45.0",
      overtime: "5.0",
      status: "Approved",
      avatar: "/microphone-crowd.png",
    },
    {
      id: 5,
      name: "Lisa Thompson",
      department: "Administration",
      weekStarting: "May 8, 2023",
      totalHours: "39.5",
      overtime: "0.0",
      status: "Approved",
      avatar: "/abstract-geometric-lt.png",
    },
  ]

  // Mock data for calendar view
  const calendarDays = Array.from({ length: 31 }, (_, i) => i + 1)
  const calendarStaff = attendanceData.slice(0, 5)

  // Mock data for attendance statistics
  const attendanceStats = {
    present: {
      count: attendanceData.filter((a) => a.status === "Present").length,
      percentage: 75,
      trend: "+2%",
    },
    absent: {
      count: attendanceData.filter((a) => a.status === "Absent").length,
      percentage: 12.5,
      trend: "-1%",
    },
    onLeave: {
      count: attendanceData.filter((a) => a.status === "On Leave").length,
      percentage: 12.5,
      trend: "0%",
    },
    late: {
      count: attendanceData.filter((a) => a.status === "Late").length,
      percentage: 12.5,
      trend: "-3%",
    },
  }

  // Filter attendance data based on search query and department
  const filteredAttendance = attendanceData.filter((staff) => {
    const matchesSearch =
      staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.role.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesDepartment = selectedDepartment === "All Departments" || staff.department === selectedDepartment
    return matchesSearch && matchesDepartment
  })

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center border-b mb-3">
        <Button variant="ghost" size="icon" asChild className="mr-4">
          <Link href="/staff">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <h2 className="text-2xl font-bold">Staff Attendance</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present Today</CardTitle>
            <UserCheck className="size-8 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceStats.present.count}</div>
            <div className="flex items-center mt-1">
              <div className="w-full bg-gray-200 dark:bg-neutral-900 rounded-full h-2.5">
                <div
                  className="bg-emerald-500 h-2.5 rounded-full"
                  style={{ width: `${attendanceStats.present.percentage}%` }}
                ></div>
              </div>
              <span className="text-xs text-emerald-400 ml-2">{attendanceStats.present.trend}</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">Out of {attendanceData.length} staff members</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Absent Today</CardTitle>
            <UserX className="size-8 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceStats.absent.count}</div>
            <div className="flex items-center mt-1">
              <div className="w-full bg-gray-200 dark:bg-neutral-900 rounded-full h-2.5">
                <div
                  className="bg-red-500 h-2.5 rounded-full"
                  style={{ width: `${attendanceStats.absent.percentage}%` }}
                ></div>
              </div>
              <span className="text-xs text-red-400 ml-2">{attendanceStats.absent.trend}</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">Unplanned absences</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Leave</CardTitle>
            <UserMinus className="size-8 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceStats.onLeave.count}</div>
            <div className="flex items-center mt-1">
              <div className="w-full bg-gray-200 dark:bg-neutral-900 rounded-full h-2.5">
                <div
                  className="bg-blue-500 h-2.5 rounded-full"
                  style={{ width: `${attendanceStats.onLeave.percentage}%` }}
                ></div>
              </div>
              <span className="text-xs text-blue-400 ml-2">{attendanceStats.onLeave.trend}</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">Approved leave requests</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Late Arrivals</CardTitle>
            <AlertTriangle className="size-8 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceStats.late.count}</div>
            <div className="flex items-center mt-1">
              <div className="w-full bg-gray-200 dark:bg-neutral-900 rounded-full h-2.5">
                <div
                  className="bg-amber-500 h-2.5 rounded-full"
                  style={{ width: `${attendanceStats.late.percentage}%` }}
                ></div>
              </div>
              <span className="text-xs text-amber-400 ml-2">{attendanceStats.late.trend}</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">More than 30 minutes late</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="search"
                placeholder="Search staff..."
                className="w-full md:w-[300px] pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Departments">All Departments</SelectItem>
                <SelectItem value="Medical">Medical</SelectItem>
                <SelectItem value="Nursing">Nursing</SelectItem>
                <SelectItem value="Laboratory">Laboratory</SelectItem>
                <SelectItem value="Administration">Administration</SelectItem>
                <SelectItem value="Pharmacy">Pharmacy</SelectItem>
                <SelectItem value="IT">IT</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Calendar className="mr-2 h-4 w-4" />
              {currentDate}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Clock className="mr-2 h-4 w-4" />
                  Record Time
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record Attendance</DialogTitle>
                  <DialogDescription className="text-gray-400">
                    Record check-in or check-out time for staff members.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="staff" className="text-gray-300">
                      Staff Member
                    </Label>
                    <Select>
                      <SelectTrigger id="staff">
                        <SelectValue placeholder="Select staff member" />
                      </SelectTrigger>
                      <SelectContent>
                        {attendanceData.map((staff) => (
                          <SelectItem key={staff.id} value={staff.id.toString()}>
                            {staff.name} - {staff.role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="time-type" className="text-gray-300">
                      Record Type
                    </Label>
                    <Select>
                      <SelectTrigger id="time-type">
                        <SelectValue placeholder="Select record type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="check-in">Check In</SelectItem>
                        <SelectItem value="check-out">Check Out</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="time" className="text-gray-300">
                      Time
                    </Label>
                    <Input id="time" type="time" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="notes" className="text-gray-300">
                      Notes (Optional)
                    </Label>
                    <Input id="notes" placeholder="Add any additional notes" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline">Cancel</Button>
                  <Button className="bg-blue-600 hover:bg-blue-700">Save Record</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        <Tabs defaultValue="daily" className="w-full">
          <TabsList>
            <TabsTrigger value="daily">
              <UserCheck className="h-4 w-4 mr-2 hidden sm:block" />
              Daily Attendance
            </TabsTrigger>
            <TabsTrigger value="calendar">
              <CalendarDays className="h-4 w-4 mr-2 hidden sm:block" />
              Calendar View
            </TabsTrigger>
            <TabsTrigger value="timesheet">
              <ClipboardList className="h-4 w-4 mr-2 hidden sm:block" />
              Timesheets
            </TabsTrigger>
            <TabsTrigger value="leave">
              <UserMinus className="h-4 w-4 mr-2 hidden sm:block" />
              Leave Requests
            </TabsTrigger>
            <TabsTrigger value="reports">
              <BarChart4 className="h-4 w-4 mr-2 hidden sm:block" />
              Reports
            </TabsTrigger>
          </TabsList>

          {/* Daily Attendance Tab */}
          <TabsContent value="daily" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3 px-6 py-4">
                <CardTitle>Daily Attendance Record</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                  </Button>
                  <Button variant="outline" size="sm">
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table className="whitespace-nowrap">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead className="hidden md:table-cell">Role</TableHead>
                      <TableHead>Check In</TableHead>
                      <TableHead>Check Out</TableHead>
                      <TableHead className="hidden md:table-cell">Hours</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="whitespace-nowrap">
                    {filteredAttendance.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <img
                              src={record.avatar || "/user-2.png"}
                              alt={record.name}
                              className="h-8 w-8 rounded-full"
                            />
                            <span className="font-medium">{record.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{record.department}</TableCell>
                        <TableCell className="hidden md:table-cell">{record.role}</TableCell>
                        <TableCell>
                          {record.checkIn ? (
                            <div className="flex items-center">
                              <Clock3 className="h-3 w-3 mr-1 text-gray-400" />
                              {record.checkIn}
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {record.checkOut ? (
                            <div className="flex items-center">
                              <Clock3 className="h-3 w-3 mr-1 text-gray-400" />
                              {record.checkOut}
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{record.hours}</TableCell>
                        <TableCell>
                          <StatusBadge status={record.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handleEditTime(record)}>
                                <Clock className="mr-2 h-4 w-4" />
                                Edit Time
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleAddNote(record)}>
                                <FileText className="mr-2 h-4 w-4" />
                                Add Note
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleViewHistory(record)}>
                                <CalendarClock className="mr-2 h-4 w-4" />
                                View History
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

          {/* Calendar View Tab */}
          <TabsContent value="calendar" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center flex-wrap gap-3 justify-between px-6 py-4">
                <CardTitle>Monthly Attendance Calendar</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium">{currentMonth}</span>
                  <Button variant="outline" size="sm">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table className="whitespace-nowrap">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-gray-800 z-10 w-[250px]">Staff</TableHead>
                        {calendarDays.map((day) => (
                          <TableHead key={day} className="text-center p-1 min-w-[40px]">
                            {day}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody className="whitespace-nowrap">
                      {calendarStaff.map((staff) => (
                        <TableRow key={staff.id}>
                          <TableCell className="sticky left-0 bg-gray-900 z-10 hover:bg-gray-800 w-[250px]">
                            <div className="flex items-center gap-2">
                              <img
                                src={staff.avatar || "/user-2.png"}
                                alt={staff.name}
                                className="h-8 w-8 rounded-full"
                              />
                              <span className="font-medium">{staff.name}</span>
                            </div>
                          </TableCell>
                          {calendarDays.map((day) => {
                            // Simulate different attendance statuses for different days
                            let status = "Present"
                            if (day % 7 === 0) status = "Weekend"
                            else if (day === 15 && staff.id === 6) status = "Late"
                            else if (day === 12 && staff.id === 7) status = "Absent"
                            else if (day >= 15 && day <= 19 && staff.id === 8) status = "On Leave"

                            return (
                              <TableCell key={day} className="p-1 text-center">
                                {status === "Weekend" ? (
                                  <span className="text-gray-600">-</span>
                                ) : (
                                  <AttendanceStatusIcon status={status} />
                                )}
                              </TableCell>
                            )
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex items-center justify-center gap-6 mt-6">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm text-gray-300">Present</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle2 className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-gray-300">Absent</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertOctagon className="h-4 w-4 text-amber-500" />
                    <span className="text-sm text-gray-300">Late</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-gray-300">On Leave</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Timesheet Tab */}
          <TabsContent value="timesheet" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Staff Timesheets</CardTitle>
                <p className="text-sm text-gray-400">View and manage staff working hours</p>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="outline" size="sm">
                      <Calendar className="mr-2 h-4 w-4" />
                      This Week
                    </Button>
                    <Button variant="outline" size="sm">
                      <Filter className="mr-2 h-4 w-4" />
                      Department
                    </Button>
                  </div>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Timesheet
                  </Button>
                </div>
                <Table className="whitespace-nowrap">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Week Starting</TableHead>
                      <TableHead>Total Hours</TableHead>
                      <TableHead className="hidden md:table-cell">Overtime</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="whitespace-nowrap">
                    {timesheetData.map((timesheet) => (
                      <TableRow key={timesheet.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <img
                              src={timesheet.avatar || "/user-2.png"}
                              alt={timesheet.name}
                              className="h-8 w-8 rounded-full"
                            />
                            <span className="font-medium">{timesheet.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{timesheet.department}</TableCell>
                        <TableCell>{timesheet.weekStarting}</TableCell>
                        <TableCell>{timesheet.totalHours}</TableCell>
                        <TableCell className="hidden md:table-cell">{timesheet.overtime}</TableCell>
                        <TableCell>
                          <Badge
                            variant={timesheet.status === "Approved" ? "default" : "outline"}
                            className={
                              timesheet.status === "Approved"
                                ? "bg-green-600 text-white hover:bg-green-700"
                                : "bg-transparent border-gray-600 text-gray-300"
                            }
                          >
                            {timesheet.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                            <Eye className="h-4 w-4 mr-2" />
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

          {/* Leave Requests Tab */}
          <TabsContent value="leave" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Leave Requests</CardTitle>
                <p className="text-sm text-gray-400">Manage staff leave and time off requests</p>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Filter className="mr-2 h-4 w-4" />
                      All Requests
                    </Button>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                        <Plus className="mr-2 h-4 w-4" />
                        New Request
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Submit Leave Request</DialogTitle>
                        <DialogDescription className="text-gray-400">
                          Request time off or leave of absence.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="leave-staff" className="text-gray-300">
                            Staff Member
                          </Label>
                          <Select>
                            <SelectTrigger id="leave-staff">
                              <SelectValue placeholder="Select staff member" />
                            </SelectTrigger>
                            <SelectContent>
                              {attendanceData.map((staff) => (
                                <SelectItem key={staff.id} value={staff.id.toString()}>
                                  {staff.name} - {staff.role}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="leave-type" className="text-gray-300">
                            Leave Type
                          </Label>
                          <Select>
                            <SelectTrigger id="leave-type">
                              <SelectValue placeholder="Select leave type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="vacation">Vacation</SelectItem>
                              <SelectItem value="sick">Sick Leave</SelectItem>
                              <SelectItem value="personal">Personal</SelectItem>
                              <SelectItem value="maternity">Maternity/Paternity</SelectItem>
                              <SelectItem value="bereavement">Bereavement</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="start-date" className="text-gray-300">
                              Start Date
                            </Label>
                            <Input id="start-date" type="date" />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="end-date" className="text-gray-300">
                              End Date
                            </Label>
                            <Input id="end-date" type="date" />
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="leave-reason" className="text-gray-300">
                            Reason (Optional)
                          </Label>
                          <Input id="leave-reason" placeholder="Brief explanation for the leave request" />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline">Cancel</Button>
                        <Button className="bg-blue-600 hover:bg-blue-700">Submit Request</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                <Table className="whitespace-nowrap">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff</TableHead>
                      <TableHead className="hidden md:table-cell">Department</TableHead>
                      <TableHead>Leave Type</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead className="hidden md:table-cell">Dates</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="whitespace-nowrap">
                    {leaveRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <img
                              src={request.avatar || "/user-2.png"}
                              alt={request.name}
                              className="h-8 w-8 rounded-full"
                            />
                            <span className="font-medium">{request.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{request.department}</TableCell>
                        <TableCell>{request.type}</TableCell>
                        <TableCell>{request.days} days</TableCell>
                        <TableCell className="hidden md:table-cell">
                          {request.startDate} to {request.endDate}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              request.status === "Approved"
                                ? "default"
                                : request.status === "Rejected"
                                  ? "destructive"
                                  : "outline"
                            }
                            className={
                              request.status === "Approved"
                                ? "bg-green-600 text-white hover:bg-green-700"
                                : request.status === "Rejected"
                                  ? "bg-red-600 text-white hover:bg-red-700"
                                  : "bg-transparent border-gray-600 text-gray-300"
                            }
                          >
                            {request.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
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
                              {request.status === "Pending" && (
                                <>
                                  <DropdownMenuItem>
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Approve
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Reject
                                  </DropdownMenuItem>
                                </>
                              )}
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

          {/* Reports Tab */}
          <TabsContent value="reports" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Attendance Reports</CardTitle>
                <p className="text-sm text-gray-400">Generate and view comprehensive attendance reports</p>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="outline" size="sm">
                      <Calendar className="mr-2 h-4 w-4" />
                      This Month
                    </Button>
                    <Button variant="outline" size="sm">
                      <Filter className="mr-2 h-4 w-4" />
                      All Departments
                    </Button>
                  </div>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Download className="mr-2 h-4 w-4" />
                    Export Report
                  </Button>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-gray-300">Attendance Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">Present:</span>
                          <span className="text-sm font-medium">92%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">Absent:</span>
                          <span className="text-sm font-medium">3%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">On Leave:</span>
                          <span className="text-sm font-medium">4%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">Late:</span>
                          <span className="text-sm font-medium">1%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-gray-300">Department Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">Medical:</span>
                          <span className="text-sm font-medium">95% present</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">Nursing:</span>
                          <span className="text-sm font-medium">90% present</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">Administration:</span>
                          <span className="text-sm font-medium">93% present</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">Support:</span>
                          <span className="text-sm font-medium">88% present</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-gray-300">Leave Statistics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">Vacation:</span>
                          <span className="text-sm font-medium">45%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">Sick Leave:</span>
                          <span className="text-sm font-medium">30%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">Personal:</span>
                          <span className="text-sm font-medium">15%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">Other:</span>
                          <span className="text-sm font-medium">10%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Monthly Attendance Trends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] bg-gray-800 rounded-md flex items-center justify-center">
                      <p className="text-gray-400">Attendance trend chart would be displayed here</p>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      {/* Add these modal components at the end of the return statement */}
      {selectedStaffMember && (
        <>
          <EditTimeModal
            isOpen={editTimeModalOpen}
            onClose={() => setEditTimeModalOpen(false)}
            staffMember={selectedStaffMember}
            onSave={handleSaveTime}
          />
          <AddNoteModal
            isOpen={addNoteModalOpen}
            onClose={() => setAddNoteModalOpen(false)}
            staffMember={selectedStaffMember}
            onSave={handleSaveNote}
          />
          <ViewHistoryModal
            isOpen={viewHistoryModalOpen}
            onClose={() => setViewHistoryModalOpen(false)}
            staffMember={selectedStaffMember}
          />
        </>
      )}
    </div>
  )
}

// Helper components
function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "Present":
      return (
        <Badge variant="default" className="bg-emerald-600 text-white hover:bg-emerald-700">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Present
        </Badge>
      )
    case "Late":
      return (
        <Badge variant="warning" className="bg-amber-600 text-white hover:bg-amber-700">
          <AlertOctagon className="h-3 w-3 mr-1" />
          Late
        </Badge>
      )
    case "Absent":
      return (
        <Badge variant="destructive" className="bg-red-600 text-white hover:bg-red-700">
          <XCircle2 className="h-3 w-3 mr-1" />
          Absent
        </Badge>
      )
    case "On Leave":
      return (
        <Badge variant="outline" className="bg-transparent border-blue-600 text-blue-400">
          <Clock3 className="h-3 w-3 mr-1" />
          On Leave
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="bg-transparent border-gray-600 text-gray-300">
          {status}
        </Badge>
      )
  }
}

function AttendanceStatusIcon({ status }: { status: string }) {
  switch (status) {
    case "Present":
      return <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
    case "Late":
      return <AlertOctagon className="h-4 w-4 text-amber-500 mx-auto" />
    case "Absent":
      return <XCircle2 className="h-4 w-4 text-red-500 mx-auto" />
    case "On Leave":
      return <Clock3 className="h-4 w-4 text-blue-500 mx-auto" />
    default:
      return null
  }
}
