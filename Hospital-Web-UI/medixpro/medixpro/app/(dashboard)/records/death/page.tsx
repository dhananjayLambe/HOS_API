"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Calendar, Download, FileText, Filter, Plus, Search, SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CalendarDateRangePicker } from "@/components/date-range-picker"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

// Sample data for death records
const deathRecords = [
  {
    id: "DR-2023-001",
    name: "Robert Anderson",
    gender: "Male",
    age: 78,
    dateOfDeath: "2023-05-10T14:30:00",
    causeOfDeath: "Natural causes",
    attendingDoctor: "Dr. James Wilson",
    status: "Verified",
    location: "City General Hospital",
  },
  {
    id: "DR-2023-002",
    name: "Eleanor Thompson",
    gender: "Female",
    age: 85,
    dateOfDeath: "2023-05-12T09:15:00",
    causeOfDeath: "Heart failure",
    attendingDoctor: "Dr. Sarah Martinez",
    status: "Pending",
    location: "Riverside Medical Center",
  },
  {
    id: "DR-2023-003",
    name: "George Harris",
    gender: "Male",
    age: 67,
    dateOfDeath: "2023-05-15T18:45:00",
    causeOfDeath: "Respiratory failure",
    attendingDoctor: "Dr. James Wilson",
    status: "Verified",
    location: "City General Hospital",
  },
  {
    id: "DR-2023-004",
    name: "Margaret Clark",
    gender: "Female",
    age: 92,
    dateOfDeath: "2023-05-18T22:10:00",
    causeOfDeath: "Natural causes",
    attendingDoctor: "Dr. Sarah Martinez",
    status: "Verified",
    location: "Home care",
  },
  {
    id: "DR-2023-005",
    name: "Thomas Wright",
    gender: "Male",
    age: 71,
    dateOfDeath: "2023-05-20T11:30:00",
    causeOfDeath: "Cardiac arrest",
    attendingDoctor: "Dr. Michael Brown",
    status: "Pending",
    location: "Riverside Medical Center",
  },
]

export default function DeathRecordsPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showFilters, setShowFilters] = useState(false)

  // Filter records based on search query and status
  const filteredRecords = deathRecords.filter((record) => {
    const matchesSearch =
      record.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.causeOfDeath.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === "all" || record.status.toLowerCase() === statusFilter.toLowerCase()

    return matchesSearch && matchesStatus
  })

  return (
    <div className="container mx-auto  space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-2xl lg:text-3xl font-bold tracking-tight">Death Records</h2>
          <p className="text-muted-foreground">Manage and track all death records in the system</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => router.push("/records/death/add")}>
            <Plus className="mr-2 h-4 w-4" />
            Add Record
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="all">All Records</TabsTrigger>
          <TabsTrigger value="verified">Verified</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
        </TabsList>

        <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
          <div className="flex flex-1 items-center flex-wrap gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search records..."
                className="pl-8 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? "bg-accent" : ""}
            >
              <Filter className="h-4 w-4" />
              <span className="sr-only">Filter</span>
            </Button>
            <CalendarDateRangePicker />
          </div>
        </div>

        {showFilters && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-medium">Filters</CardTitle>
              <CardDescription>Narrow down records by specific criteria</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Location</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    <SelectItem value="city-general">City General Hospital</SelectItem>
                    <SelectItem value="riverside">Riverside Medical Center</SelectItem>
                    <SelectItem value="home">Home care</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Attending Doctor</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Doctors</SelectItem>
                    <SelectItem value="dr-wilson">Dr. James Wilson</SelectItem>
                    <SelectItem value="dr-martinez">Dr. Sarah Martinez</SelectItem>
                    <SelectItem value="dr-brown">Dr. Michael Brown</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-3 flex justify-end gap-2">
                <Button variant="outline">Reset</Button>
                <Button>Apply Filters</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <TabsContent value="all" className="m-0">
          <Card>
            <CardContent className="p-0">
              <Table className="whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead>Record ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Date of Death</TableHead>
                    <TableHead>Cause of Death</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No death records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.id}</TableCell>
                        <TableCell>{record.name}</TableCell>
                        <TableCell>{record.age}</TableCell>
                        <TableCell>{new Date(record.dateOfDeath).toLocaleDateString()}</TableCell>
                        <TableCell>{record.causeOfDeath}</TableCell>
                        <TableCell>
                          <Badge
                            variant={record.status === "Verified" ? "default" : "outline"}
                            className={
                              record.status === "Verified"
                                ? "bg-green-100 text-green-800 hover:bg-green-100"
                                : "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                            }
                          >
                            {record.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <SlidersHorizontal className="h-4 w-4" />
                                <span className="sr-only">Actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => router.push(`/records/death/${record.id}`)}>
                                <FileText className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => router.push(`/records/death/${record.id}/edit`)}>
                                <Calendar className="mr-2 h-4 w-4" />
                                Edit Record
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Download className="mr-2 h-4 w-4" />
                                Download Certificate
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verified" className="m-0">
          <Card>
            <CardContent className="p-0">
              <Table className="whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead>Record ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Date of Death</TableHead>
                    <TableHead>Cause of Death</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deathRecords
                    .filter((record) => record.status === "Verified")
                    .map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.id}</TableCell>
                        <TableCell>{record.name}</TableCell>
                        <TableCell>{record.age}</TableCell>
                        <TableCell>{new Date(record.dateOfDeath).toLocaleDateString()}</TableCell>
                        <TableCell>{record.causeOfDeath}</TableCell>
                        <TableCell>
                          <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                            {record.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <SlidersHorizontal className="h-4 w-4" />
                                <span className="sr-only">Actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => router.push(`/records/death/${record.id}`)}>
                                <FileText className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => router.push(`/records/death/${record.id}/edit`)}>
                                <Calendar className="mr-2 h-4 w-4" />
                                Edit Record
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Download className="mr-2 h-4 w-4" />
                                Download Certificate
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

        <TabsContent value="pending" className="m-0">
          <Card>
            <CardContent className="p-0">
              <Table className="whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead>Record ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Date of Death</TableHead>
                    <TableHead>Cause of Death</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deathRecords
                    .filter((record) => record.status === "Pending")
                    .map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.id}</TableCell>
                        <TableCell>{record.name}</TableCell>
                        <TableCell>{record.age}</TableCell>
                        <TableCell>{new Date(record.dateOfDeath).toLocaleDateString()}</TableCell>
                        <TableCell>{record.causeOfDeath}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                            {record.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <SlidersHorizontal className="h-4 w-4" />
                                <span className="sr-only">Actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => router.push(`/records/death/${record.id}`)}>
                                <FileText className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => router.push(`/records/death/${record.id}/edit`)}>
                                <Calendar className="mr-2 h-4 w-4" />
                                Edit Record
                              </DropdownMenuItem>
                              <DropdownMenuItem>Verify Record</DropdownMenuItem>
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
      </Tabs>
    </div>
  )
}
