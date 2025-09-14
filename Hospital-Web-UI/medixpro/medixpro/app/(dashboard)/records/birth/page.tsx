"use client"

import { useState } from "react"
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
import { useRouter } from "next/navigation"

// Sample data for birth records
const birthRecords = [
  {
    id: "BR-2023-001",
    childName: "Emma Johnson",
    gender: "Female",
    dateOfBirth: "2023-05-15T08:30:00",
    parentName: "Sarah and Michael Johnson",
    weight: "3.2 kg",
    attendingDoctor: "Dr. Lisa Chen",
    status: "Verified",
    hospital: "City General Hospital",
  },
  {
    id: "BR-2023-002",
    childName: "Noah Williams",
    gender: "Male",
    dateOfBirth: "2023-05-18T10:45:00",
    parentName: "Jessica and David Williams",
    weight: "3.5 kg",
    attendingDoctor: "Dr. Robert Kim",
    status: "Pending",
    hospital: "City General Hospital",
  },
  {
    id: "BR-2023-003",
    childName: "Olivia Davis",
    gender: "Female",
    dateOfBirth: "2023-05-20T14:15:00",
    parentName: "Emily and James Davis",
    weight: "3.1 kg",
    attendingDoctor: "Dr. Lisa Chen",
    status: "Verified",
    hospital: "Riverside Medical Center",
  },
  {
    id: "BR-2023-004",
    childName: "Liam Miller",
    gender: "Male",
    dateOfBirth: "2023-05-22T09:20:00",
    parentName: "Sophia and William Miller",
    weight: "3.7 kg",
    attendingDoctor: "Dr. John Smith",
    status: "Verified",
    hospital: "City General Hospital",
  },
  {
    id: "BR-2023-005",
    childName: "Ava Wilson",
    gender: "Female",
    dateOfBirth: "2023-05-25T11:30:00",
    parentName: "Olivia and Daniel Wilson",
    weight: "3.0 kg",
    attendingDoctor: "Dr. Robert Kim",
    status: "Pending",
    hospital: "Riverside Medical Center",
  },
]

export default function BirthRecordsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showFilters, setShowFilters] = useState(false)
  const router = useRouter()

  // Filter records based on search query and status
  const filteredRecords = birthRecords.filter((record) => {
    const matchesSearch =
      record.childName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.parentName.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === "all" || record.status.toLowerCase() === statusFilter.toLowerCase()

    return matchesSearch && matchesStatus
  })

  return (
    <div className="container mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Birth Records</h1>
          <p className="text-muted-foreground">Manage and track all birth records in the system</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => router.push("/records/birth/add")}>
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
          <div className="flex flex-1 items-center gap-2">
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
            <CalendarDateRangePicker className="hidden md:flex" />
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
                <label className="text-sm font-medium">Hospital</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select hospital" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Hospitals</SelectItem>
                    <SelectItem value="city-general">City General Hospital</SelectItem>
                    <SelectItem value="riverside">Riverside Medical Center</SelectItem>
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
                    <SelectItem value="dr-chen">Dr. Lisa Chen</SelectItem>
                    <SelectItem value="dr-kim">Dr. Robert Kim</SelectItem>
                    <SelectItem value="dr-smith">Dr. John Smith</SelectItem>
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
                    <TableHead>Child Name</TableHead>
                    <TableHead>Date of Birth</TableHead>
                    <TableHead>Parents</TableHead>
                    <TableHead>Attending Doctor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No birth records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.id}</TableCell>
                        <TableCell>{record.childName}</TableCell>
                        <TableCell>{new Date(record.dateOfBirth).toLocaleDateString()}</TableCell>
                        <TableCell>{record.parentName}</TableCell>
                        <TableCell>{record.attendingDoctor}</TableCell>
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
                              <DropdownMenuItem onClick={() => router.push(`/records/birth/${record.id}`)}>
                                <FileText className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => router.push(`/records/birth/${record.id}/edit`)}>
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
                    <TableHead>Child Name</TableHead>
                    <TableHead>Date of Birth</TableHead>
                    <TableHead>Parents</TableHead>
                    <TableHead>Attending Doctor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {birthRecords
                    .filter((record) => record.status === "Verified")
                    .map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.id}</TableCell>
                        <TableCell>{record.childName}</TableCell>
                        <TableCell>{new Date(record.dateOfBirth).toLocaleDateString()}</TableCell>
                        <TableCell>{record.parentName}</TableCell>
                        <TableCell>{record.attendingDoctor}</TableCell>
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
                              <DropdownMenuItem onClick={() => router.push(`/records/birth/${record.id}`)}>
                                <FileText className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => router.push(`/records/birth/${record.id}/edit`)}>
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
                    <TableHead>Child Name</TableHead>
                    <TableHead>Date of Birth</TableHead>
                    <TableHead>Parents</TableHead>
                    <TableHead>Attending Doctor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {birthRecords
                    .filter((record) => record.status === "Pending")
                    .map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.id}</TableCell>
                        <TableCell>{record.childName}</TableCell>
                        <TableCell>{new Date(record.dateOfBirth).toLocaleDateString()}</TableCell>
                        <TableCell>{record.parentName}</TableCell>
                        <TableCell>{record.attendingDoctor}</TableCell>
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
                              <DropdownMenuItem onClick={() => router.push(`/records/birth/${record.id}`)}>
                                <FileText className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => router.push(`/records/birth/${record.id}/edit`)}>
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
