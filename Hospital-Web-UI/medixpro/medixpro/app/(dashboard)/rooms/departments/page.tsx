"use client"

import { useState } from "react"
import Link from "next/link"
import { Search, Filter, MoreHorizontal, Download, Printer, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import DepartmentDischargeModal from "@/components/rooms/department-discharge-modal"

// Mock data for departments and rooms
const departments = [
  {
    id: "dept-1",
    name: "Cardiology",
    totalRooms: 25,
    occupied: 18,
    available: 7,
  },
  {
    id: "dept-2",
    name: "Orthopedics",
    totalRooms: 20,
    occupied: 15,
    available: 5,
  },
  {
    id: "dept-3",
    name: "Neurology",
    totalRooms: 15,
    occupied: 10,
    available: 5,
  },
  {
    id: "dept-4",
    name: "Pulmonology",
    totalRooms: 18,
    occupied: 12,
    available: 6,
  },
  {
    id: "dept-5",
    name: "Gastroenterology",
    totalRooms: 22,
    occupied: 16,
    available: 6,
  },
  {
    id: "dept-6",
    name: "Pediatrics",
    totalRooms: 20,
    occupied: 14,
    available: 6,
  },
]

const roomsByDepartment = {
  Cardiology: [
    {
      id: "room-101",
      number: "101",
      type: "Private",
      status: "occupied",
      patient: "John Smith",
      doctor: "Dr. Emily Chen",
    },
    { id: "room-102", number: "102", type: "Private", status: "available", patient: "", doctor: "" },
    {
      id: "room-103",
      number: "103",
      type: "Semi-Private",
      status: "occupied",
      patient: "Maria Garcia",
      doctor: "Dr. James Wilson",
    },
    {
      id: "room-104",
      number: "104",
      type: "Semi-Private",
      status: "occupied",
      patient: "Robert Davis",
      doctor: "Dr. Lisa Wong",
    },
    { id: "room-105", number: "105", type: "General", status: "available", patient: "", doctor: "" },
  ],
  Orthopedics: [
    {
      id: "room-201",
      number: "201",
      type: "Private",
      status: "occupied",
      patient: "Sarah Johnson",
      doctor: "Dr. Michael Brown",
    },
    { id: "room-202", number: "202", type: "Private", status: "available", patient: "", doctor: "" },
    {
      id: "room-203",
      number: "203",
      type: "Semi-Private",
      status: "occupied",
      patient: "David Lee",
      doctor: "Dr. Sarah Miller",
    },
    {
      id: "room-204",
      number: "204",
      type: "General",
      status: "occupied",
      patient: "Jennifer Wilson",
      doctor: "Dr. Michael Brown",
    },
    { id: "room-205", number: "205", type: "ICU", status: "available", patient: "", doctor: "" },
  ],
  Neurology: [
    {
      id: "room-301",
      number: "301",
      type: "Private",
      status: "occupied",
      patient: "William Brown",
      doctor: "Dr. Lisa Wong",
    },
    { id: "room-302", number: "302", type: "Semi-Private", status: "available", patient: "", doctor: "" },
    {
      id: "room-303",
      number: "303",
      type: "General",
      status: "occupied",
      patient: "Elizabeth Taylor",
      doctor: "Dr. Lisa Wong",
    },
    {
      id: "room-304",
      number: "304",
      type: "ICU",
      status: "occupied",
      patient: "Michael Johnson",
      doctor: "Dr. James Wilson",
    },
    { id: "room-305", number: "305", type: "Private", status: "available", patient: "", doctor: "" },
  ],
  Pulmonology: [
    {
      id: "room-401",
      number: "401",
      type: "Private",
      status: "occupied",
      patient: "Thomas Anderson",
      doctor: "Dr. James Wilson",
    },
    { id: "room-402", number: "402", type: "Semi-Private", status: "available", patient: "", doctor: "" },
    {
      id: "room-403",
      number: "403",
      type: "General",
      status: "occupied",
      patient: "Patricia Martin",
      doctor: "Dr. Emily Chen",
    },
    {
      id: "room-404",
      number: "404",
      type: "ICU",
      status: "occupied",
      patient: "Charles Wilson",
      doctor: "Dr. Sarah Miller",
    },
    { id: "room-405", number: "405", type: "Private", status: "available", patient: "", doctor: "" },
  ],
  Gastroenterology: [
    {
      id: "room-501",
      number: "501",
      type: "Private",
      status: "occupied",
      patient: "Linda Harris",
      doctor: "Dr. Sarah Miller",
    },
    { id: "room-502", number: "502", type: "Semi-Private", status: "available", patient: "", doctor: "" },
    {
      id: "room-503",
      number: "503",
      type: "General",
      status: "occupied",
      patient: "Richard Clark",
      doctor: "Dr. Michael Brown",
    },
    {
      id: "room-504",
      number: "504",
      type: "ICU",
      status: "occupied",
      patient: "Susan Lewis",
      doctor: "Dr. Emily Chen",
    },
    { id: "room-505", number: "505", type: "Private", status: "available", patient: "", doctor: "" },
  ],
  Pediatrics: [
    {
      id: "room-601",
      number: "601",
      type: "Private",
      status: "occupied",
      patient: "Emma Wilson",
      doctor: "Dr. Lisa Wong",
    },
    { id: "room-602", number: "602", type: "Semi-Private", status: "available", patient: "", doctor: "" },
    {
      id: "room-603",
      number: "603",
      type: "General",
      status: "occupied",
      patient: "Noah Martinez",
      doctor: "Dr. James Wilson",
    },
    {
      id: "room-604",
      number: "604",
      type: "ICU",
      status: "occupied",
      patient: "Olivia Brown",
      doctor: "Dr. Sarah Miller",
    },
    { id: "room-605", number: "605", type: "Private", status: "available", patient: "", doctor: "" },
  ],
}

export default function RoomsByDepartmentPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [roomTypeFilter, setRoomTypeFilter] = useState("all")
  const [selectedDepartment, setSelectedDepartment] = useState("Cardiology")
  const [isDischargeModalOpen, setIsDischargeModalOpen] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<{
    id: string
    number: string
    patient: string
    department: string
  } | null>(null)

  // Filter rooms based on search term and filters
  const filteredRooms = roomsByDepartment[selectedDepartment as keyof typeof roomsByDepartment].filter((room) => {
    const matchesSearch =
      room.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      room.patient.toLowerCase().includes(searchTerm.toLowerCase()) ||
      room.doctor.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || room.status === statusFilter

    const matchesRoomType = roomTypeFilter === "all" || room.type === roomTypeFilter

    return matchesSearch && matchesStatus && matchesRoomType
  })

  const handleDischargeClick = (room: {
    id: string
    number: string
    patient: string
  }) => {
    setSelectedRoom({
      id: room.id,
      number: room.number,
      patient: room.patient,
      department: selectedDepartment,
    })
    setIsDischargeModalOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        <h2 className="text-2xl md:text-2xl lg:text-3xl font-bold tracking-tight">Rooms by Department</h2>
        <div className="flex items-center space-x-2">
          <Link href="/rooms/add">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add New Room
            </Button>
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
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {departments.slice(0, 3).map((dept) => (
          <Card key={dept.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{dept.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dept.totalRooms}</div>
              <div className="flex items-center justify-between mt-2 text-sm">
                <div className="flex items-center">
                  <div className="h-2 w-2 rounded-full bg-green-500 mr-1"></div>
                  <span>Available: {dept.available}</span>
                </div>
                <div className="flex items-center">
                  <div className="h-2 w-2 rounded-full bg-red-500 mr-1"></div>
                  <span>Occupied: {dept.occupied}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="Cardiology" onValueChange={setSelectedDepartment}>
        <TabsList >
          {departments.map((dept) => (
            <TabsTrigger key={dept.id} value={dept.name}>
              {dept.name}
            </TabsTrigger>
          ))}
        </TabsList>
        {departments.map((dept) => (
          <TabsContent key={dept.id} value={dept.name}>
            <div className="flex flex-col space-y-4">
              <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0">
                <div className="flex flex-1 items-center space-x-2">
                  <div className="relative w-full md:w-80">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search rooms..."
                      className="w-full pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex flex-col space-y-2 md:flex-row md:space-x-2 md:space-y-0">
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
                      <SelectItem value="available">Available</SelectItem>
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
                      <TableHead>Room Number</TableHead>
                      <TableHead>Room Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRooms.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          No rooms found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRooms.map((room) => (
                        <TableRow key={room.id}>
                          <TableCell className="font-medium">{room.number}</TableCell>
                          <TableCell>{room.type}</TableCell>
                          <TableCell>
                            <Badge
                              variant={room.status === "available" ? "outline" : "default"}
                              className={
                                room.status === "available"
                                  ? "bg-green-100 text-green-800 hover:bg-green-100"
                                  : "bg-red-100 text-red-800 hover:bg-red-100"
                              }
                            >
                              {room.status === "available" ? "Available" : "Occupied"}
                            </Badge>
                          </TableCell>
                          <TableCell>{room.patient || "—"}</TableCell>
                          <TableCell>{room.doctor || "—"}</TableCell>
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
                                  <Link href={`/rooms/departments/${room.id}`} className="flex w-full">
                                    View Details
                                  </Link>
                                </DropdownMenuItem>
                                {room.status === "available" ? (
                                  <DropdownMenuItem>
                                    <Link href={`/rooms/new?room=${room.id}`} className="flex w-full">
                                      Allot Room
                                    </Link>
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => handleDischargeClick(room)}>
                                    Discharge Patient
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem>
                                  <Link href={`/rooms/departments/${room.id}/edit`} className="flex w-full">
                                    Edit Room
                                  </Link>
                                </DropdownMenuItem>
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
          </TabsContent>
        ))}
      </Tabs>

      {/* Discharge Modal */}
      {selectedRoom && (
        <DepartmentDischargeModal
          isOpen={isDischargeModalOpen}
          onClose={() => setIsDischargeModalOpen(false)}
          roomId={selectedRoom.id}
          roomNumber={selectedRoom.number}
          patientName={selectedRoom.patient}
          department={selectedRoom.department}
        />
      )}
    </div>
  )
}
