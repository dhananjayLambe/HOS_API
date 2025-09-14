"use client"

import { useState } from "react"
import Link from "next/link"
import { Calendar, Search, Filter, MoreHorizontal, Download, Printer, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { DateRangePicker } from "@/components/date-range-picker"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import DischargePatientModal from "@/components/rooms/discharge-patient-modal"

// Mock data for room allotments
const allotments = [
  {
    id: "RA-001",
    patientName: "John Smith",
    patientId: "P-1001",
    roomNumber: "301",
    roomType: "Private",
    department: "Cardiology",
    allotmentDate: "2023-04-15",
    dischargeDate: "2023-04-20",
    status: "occupied",
    doctor: "Dr. Emily Chen",
  },
  {
    id: "RA-002",
    patientName: "Sarah Johnson",
    patientId: "P-1002",
    roomNumber: "205",
    roomType: "Semi-Private",
    department: "Orthopedics",
    allotmentDate: "2023-04-16",
    dischargeDate: "2023-04-25",
    status: "occupied",
    doctor: "Dr. Michael Brown",
  },
  {
    id: "RA-003",
    patientName: "Robert Davis",
    patientId: "P-1003",
    roomNumber: "102",
    roomType: "General",
    department: "Neurology",
    allotmentDate: "2023-04-10",
    dischargeDate: "2023-04-18",
    status: "discharged",
    doctor: "Dr. Lisa Wong",
  },
  {
    id: "RA-004",
    patientName: "Maria Garcia",
    patientId: "P-1004",
    roomNumber: "405",
    roomType: "ICU",
    department: "Pulmonology",
    allotmentDate: "2023-04-17",
    dischargeDate: "",
    status: "occupied",
    doctor: "Dr. James Wilson",
  },
  {
    id: "RA-005",
    patientName: "David Lee",
    patientId: "P-1005",
    roomNumber: "210",
    roomType: "Semi-Private",
    department: "Gastroenterology",
    allotmentDate: "2023-04-12",
    dischargeDate: "2023-04-19",
    status: "discharged",
    doctor: "Dr. Sarah Miller",
  },
]

export default function AllotedRoomsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [roomTypeFilter, setRoomTypeFilter] = useState("all")
  const [dischargeModalOpen, setDischargeModalOpen] = useState<string | null>(null)

  // Filter allotments based on search term and filters
  const filteredAllotments = allotments.filter((allotment) => {
    const matchesSearch =
      allotment.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      allotment.roomNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      allotment.patientId.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || allotment.status === statusFilter

    const matchesDepartment = departmentFilter === "all" || allotment.department === departmentFilter

    const matchesRoomType = roomTypeFilter === "all" || allotment.roomType === roomTypeFilter

    return matchesSearch && matchesStatus && matchesDepartment && matchesRoomType
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        <h2 className="text-2xl xl:text-3xl font-bold">Alloted Rooms</h2>
        <div className="flex items-center space-x-2">
          <Link href="/rooms/new">
            <Button>New Allotment</Button>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Download className="mr-2 h-4 w-4" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Printer className="mr-2 h-4 w-4" />
                Print List
              </DropdownMenuItem>
              <DropdownMenuItem>
                <FileText className="mr-2 h-4 w-4" />
                Generate Report
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Rooms</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">120</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Occupied</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">78</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">42</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">65%</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col space-y-4">
        <div className="flex gap-4 flex-wrap items-center justify-between">
          <div className="flex flex-1 items-center flex-wrap gap-4">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by patient, room..."
                className="w-full pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <DateRangePicker />
          </div>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filter by:</span>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="occupied">Occupied</SelectItem>
                <SelectItem value="discharged">Discharged</SelectItem>
              </SelectContent>
            </Select>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="Cardiology">Cardiology</SelectItem>
                <SelectItem value="Orthopedics">Orthopedics</SelectItem>
                <SelectItem value="Neurology">Neurology</SelectItem>
                <SelectItem value="Pulmonology">Pulmonology</SelectItem>
                <SelectItem value="Gastroenterology">Gastroenterology</SelectItem>
              </SelectContent>
            </Select>
            <Select value={roomTypeFilter} onValueChange={setRoomTypeFilter}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Room Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Private">Private</SelectItem>
                <SelectItem value="Semi-Private">Semi-Private</SelectItem>
                <SelectItem value="General">General</SelectItem>
                <SelectItem value="ICU">ICU</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-md border">
          <Table className="whitespace-nowrap">
            <TableHeader>
              <TableRow>
                <TableHead>Allotment ID</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Allotment Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAllotments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    No room allotments found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAllotments.map((allotment) => (
                  <TableRow key={allotment.id}>
                    <TableCell className="font-medium">{allotment.id}</TableCell>
                    <TableCell>
                      <div className="font-medium">{allotment.patientName}</div>
                      <div className="text-sm text-muted-foreground">{allotment.patientId}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{allotment.roomNumber}</div>
                      <div className="text-sm text-muted-foreground">{allotment.roomType}</div>
                    </TableCell>
                    <TableCell>{allotment.department}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                        {allotment.allotmentDate}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={allotment.status === "occupied" ? "default" : "secondary"}>
                        {allotment.status === "occupied" ? "Occupied" : "Discharged"}
                      </Badge>
                    </TableCell>
                    <TableCell>{allotment.doctor}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Link href={`/rooms/alloted/${allotment.id}`} className="flex w-full">
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Link href={`/rooms/alloted/${allotment.id}/edit`} className="flex w-full">
                              Edit Allotment
                            </Link>
                          </DropdownMenuItem>
                          {allotment.status === "occupied" && (
                            <DropdownMenuItem>
                              <button className="flex w-full" onClick={() => setDischargeModalOpen(allotment.id)}>
                                Discharge Patient
                              </button>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem>Print Details</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      {dischargeModalOpen && (
        <DischargePatientModal
          isOpen={!!dischargeModalOpen}
          onClose={() => setDischargeModalOpen(null)}
          allotmentId={dischargeModalOpen}
          patientName={allotments.find((a) => a.id === dischargeModalOpen)?.patientName || ""}
          roomNumber={allotments.find((a) => a.id === dischargeModalOpen)?.roomNumber || ""}
        />
      )}
    </div>
  )
}
