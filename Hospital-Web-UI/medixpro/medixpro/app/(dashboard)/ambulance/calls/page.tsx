import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Ambulance, Clock, Eye, MoreHorizontal, Phone, Plus, Search, UserRound } from "lucide-react";
import Link from "next/link";

// Sample data for ambulance calls
const ambulanceCalls = [
  {
    id: "AC001",
    date: "2023-04-22",
    time: "08:30 AM",
    patient: "John Doe",
    contact: "+1 (555) 123-4567",
    location: "123 Main St, Anytown",
    reason: "Chest Pain",
    status: "Completed",
    ambulance: "AMB-001",
    driver: "Michael Johnson",
  },
  {
    id: "AC002",
    date: "2023-04-22",
    time: "09:45 AM",
    patient: "Jane Smith",
    contact: "+1 (555) 987-6543",
    location: "456 Oak Ave, Somewhere",
    reason: "Traffic Accident",
    status: "In Progress",
    ambulance: "AMB-003",
    driver: "Robert Davis",
  },
  {
    id: "AC003",
    date: "2023-04-22",
    time: "11:15 AM",
    patient: "Emily Johnson",
    contact: "+1 (555) 456-7890",
    location: "789 Pine Rd, Elsewhere",
    reason: "Difficulty Breathing",
    status: "Pending",
    ambulance: "AMB-002",
    driver: "Sarah Wilson",
  },
  {
    id: "AC004",
    date: "2023-04-21",
    time: "02:30 PM",
    patient: "David Brown",
    contact: "+1 (555) 234-5678",
    location: "321 Elm St, Nowhere",
    reason: "Fall Injury",
    status: "Completed",
    ambulance: "AMB-001",
    driver: "Michael Johnson",
  },
  {
    id: "AC005",
    date: "2023-04-21",
    time: "05:00 PM",
    patient: "Lisa Garcia",
    contact: "+1 (555) 876-5432",
    location: "654 Maple Dr, Anytown",
    reason: "Stroke Symptoms",
    status: "Completed",
    ambulance: "AMB-004",
    driver: "Thomas Anderson",
  },
  {
    id: "AC006",
    date: "2023-04-21",
    time: "07:45 PM",
    patient: "Robert Martinez",
    contact: "+1 (555) 345-6789",
    location: "987 Cedar Ln, Somewhere",
    reason: "Severe Allergic Reaction",
    status: "Completed",
    ambulance: "AMB-002",
    driver: "Sarah Wilson",
  },
  {
    id: "AC007",
    date: "2023-04-20",
    time: "10:15 AM",
    patient: "Maria Rodriguez",
    contact: "+1 (555) 567-8901",
    location: "159 Birch St, Elsewhere",
    reason: "Pregnancy Complications",
    status: "Completed",
    ambulance: "AMB-003",
    driver: "Robert Davis",
  },
];

export default function AmbulanceCallListPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">Ambulance Call List</h1>
          <p className="text-muted-foreground">Manage and track all ambulance calls and dispatches</p>
        </div>
        <Button className="w-full md:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          New Ambulance Call
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">127</div>
              <Ambulance className="size-7 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">+5.2% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Calls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">3</div>
              <Phone className="size-7 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">2 pending, 1 in progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">8.5 min</div>
              <Clock className="size-7 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">-1.2 min from last month</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ambulance Calls</CardTitle>
          <CardDescription>View and manage all ambulance calls and dispatches</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex w-full items-center gap-2 md:w-auto">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search calls..." className="h-9 md:w-[200px] lg:w-[300px]" />
              </div>
              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <Select defaultValue="all">
                  <SelectTrigger className="h-9 w-full md:w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Select defaultValue="today">
                  <SelectTrigger className="h-9 w-full md:w-[180px]">
                    <SelectValue placeholder="Date Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Tabs defaultValue="all" className="w-full">
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="in-progress">In Progress</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="mt-4">
                <div className="rounded-md border">
                  <Table className="whitespace-nowrap">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Call ID</TableHead>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead className="hidden md:table-cell">Location</TableHead>
                        <TableHead className="hidden md:table-cell">Reason</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden lg:table-cell">Ambulance</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="whitespace-nowrap">
                      {ambulanceCalls.map((call) => (
                        <TableRow key={call.id}>
                          <TableCell className="font-medium">{call.id}</TableCell>
                          <TableCell>
                            {call.date}
                            <br />
                            <span className="text-xs text-muted-foreground">{call.time}</span>
                          </TableCell>
                          <TableCell>
                            {call.patient}
                            <br />
                            <span className="text-xs text-muted-foreground">{call.contact}</span>
                          </TableCell>
                          <TableCell className="hidden max-w-[200px] truncate md:table-cell">{call.location}</TableCell>
                          <TableCell className="hidden md:table-cell">{call.reason}</TableCell>
                          <TableCell>
                            <Badge variant={call.status === "Completed" ? "default" : call.status === "In Progress" ? "secondary" : "outline"}>{call.status}</Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <Link href="/ambulance/details" className="hover:underline">
                              {call.ambulance}
                            </Link>
                            <br />
                            <span className="text-xs text-muted-foreground">{call.driver}</span>
                          </TableCell>
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
                                  <Link href={`/ambulance/calls/${call.id}`} className="flex items-center">
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Link href={`/patients/1`} className="flex items-center">
                                    <UserRound className="mr-2 h-4 w-4" />
                                    View Patient
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Link href="/ambulance/details" className="flex items-center">
                                    <Ambulance className="mr-2 h-4 w-4" />
                                    View Ambulance
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>Print Report</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
              <TabsContent value="pending" className="mt-4">
                <div className="rounded-md border">
                  <Table className="whitespace-nowrap">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Call ID</TableHead>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead className="hidden md:table-cell">Location</TableHead>
                        <TableHead className="hidden md:table-cell">Reason</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden lg:table-cell">Ambulance</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="whitespace-nowrap">
                      {ambulanceCalls
                        .filter((call) => call.status === "Pending")
                        .map((call) => (
                          <TableRow key={call.id}>
                            <TableCell className="font-medium">{call.id}</TableCell>
                            <TableCell>
                              {call.date}
                              <br />
                              <span className="text-xs text-muted-foreground">{call.time}</span>
                            </TableCell>
                            <TableCell>
                              {call.patient}
                              <br />
                              <span className="text-xs text-muted-foreground">{call.contact}</span>
                            </TableCell>
                            <TableCell className="hidden max-w-[200px] truncate md:table-cell">{call.location}</TableCell>
                            <TableCell className="hidden md:table-cell">{call.reason}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{call.status}</Badge>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <Link href="/ambulance/details" className="hover:underline">
                                {call.ambulance}
                              </Link>
                              <br />
                              <span className="text-xs text-muted-foreground">{call.driver}</span>
                            </TableCell>
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
                                    <Link href={`/ambulance/calls/${call.id}`} className="flex items-center">
                                      <Eye className="mr-2 h-4 w-4" />
                                      View Details
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Link href={`/patients/1`} className="flex items-center">
                                      <UserRound className="mr-2 h-4 w-4" />
                                      View Patient
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Link href="/ambulance/details" className="flex items-center">
                                      <Ambulance className="mr-2 h-4 w-4" />
                                      View Ambulance
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem>Print Report</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
              <TabsContent value="in-progress" className="mt-4">
                <div className="rounded-md border">
                  <Table className="whitespace-nowrap">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Call ID</TableHead>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead className="hidden md:table-cell">Location</TableHead>
                        <TableHead className="hidden md:table-cell">Reason</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden lg:table-cell">Ambulance</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="whitespace-nowrap">
                      {ambulanceCalls
                        .filter((call) => call.status === "In Progress")
                        .map((call) => (
                          <TableRow key={call.id}>
                            <TableCell className="font-medium">{call.id}</TableCell>
                            <TableCell>
                              {call.date}
                              <br />
                              <span className="text-xs text-muted-foreground">{call.time}</span>
                            </TableCell>
                            <TableCell>
                              {call.patient}
                              <br />
                              <span className="text-xs text-muted-foreground">{call.contact}</span>
                            </TableCell>
                            <TableCell className="hidden max-w-[200px] truncate md:table-cell">{call.location}</TableCell>
                            <TableCell className="hidden md:table-cell">{call.reason}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{call.status}</Badge>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <Link href="/ambulance/details" className="hover:underline">
                                {call.ambulance}
                              </Link>
                              <br />
                              <span className="text-xs text-muted-foreground">{call.driver}</span>
                            </TableCell>
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
                                    <Link href={`/ambulance/calls/${call.id}`} className="flex items-center">
                                      <Eye className="mr-2 h-4 w-4" />
                                      View Details
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Link href={`/patients/1`} className="flex items-center">
                                      <UserRound className="mr-2 h-4 w-4" />
                                      View Patient
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Link href="/ambulance/details" className="flex items-center">
                                      <Ambulance className="mr-2 h-4 w-4" />
                                      View Ambulance
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem>Print Report</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
              <TabsContent value="completed" className="mt-4">
                <div className="rounded-md border">
                  <Table className="whitespace-nowrap">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Call ID</TableHead>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead className="hidden md:table-cell">Location</TableHead>
                        <TableHead className="hidden md:table-cell">Reason</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden lg:table-cell">Ambulance</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="whitespace-nowrap">
                      {ambulanceCalls
                        .filter((call) => call.status === "Completed")
                        .map((call) => (
                          <TableRow key={call.id}>
                            <TableCell className="font-medium">{call.id}</TableCell>
                            <TableCell>
                              {call.date}
                              <br />
                              <span className="text-xs text-muted-foreground">{call.time}</span>
                            </TableCell>
                            <TableCell>
                              {call.patient}
                              <br />
                              <span className="text-xs text-muted-foreground">{call.contact}</span>
                            </TableCell>
                            <TableCell className="hidden max-w-[200px] truncate md:table-cell">{call.location}</TableCell>
                            <TableCell className="hidden md:table-cell">{call.reason}</TableCell>
                            <TableCell>
                              <Badge>{call.status}</Badge>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <Link href="/ambulance/details" className="hover:underline">
                                {call.ambulance}
                              </Link>
                              <br />
                              <span className="text-xs text-muted-foreground">{call.driver}</span>
                            </TableCell>
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
                                    <Link href={`/ambulance/calls/${call.id}`} className="flex items-center">
                                      <Eye className="mr-2 h-4 w-4" />
                                      View Details
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Link href={`/patients/1`} className="flex items-center">
                                      <UserRound className="mr-2 h-4 w-4" />
                                      View Patient
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Link href="/ambulance/details" className="flex items-center">
                                      <Ambulance className="mr-2 h-4 w-4" />
                                      View Ambulance
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem>Print Report</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
