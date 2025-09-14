import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Ambulance, Car, Edit, MoreHorizontal, Plus, Search, Settings, Wrench } from "lucide-react";
import Link from "next/link";

// Sample data for ambulances
const ambulances = [
  {
    id: "AMB-001",
    registrationNumber: "XYZ-1234",
    model: "Toyota HiAce",
    type: "Basic Life Support",
    year: "2021",
    status: "Available",
    driver: "Michael Johnson",
    lastMaintenance: "2023-03-15",
    nextMaintenance: "2023-06-15",
    location: "Main Hospital",
  },
  {
    id: "AMB-002",
    registrationNumber: "ABC-5678",
    model: "Mercedes Sprinter",
    type: "Advanced Life Support",
    year: "2022",
    status: "On Call",
    driver: "Sarah Wilson",
    lastMaintenance: "2023-04-02",
    nextMaintenance: "2023-07-02",
    location: "East Wing",
  },
  {
    id: "AMB-003",
    registrationNumber: "DEF-9012",
    model: "Ford Transit",
    type: "Basic Life Support",
    year: "2020",
    status: "Available",
    driver: "Robert Davis",
    lastMaintenance: "2023-02-20",
    nextMaintenance: "2023-05-20",
    location: "North Clinic",
  },
  {
    id: "AMB-004",
    registrationNumber: "GHI-3456",
    model: "Fiat Ducato",
    type: "Patient Transport",
    year: "2019",
    status: "Maintenance",
    driver: "Thomas Anderson",
    lastMaintenance: "2023-04-18",
    nextMaintenance: "2023-07-18",
    location: "Workshop",
  },
  {
    id: "AMB-005",
    registrationNumber: "JKL-7890",
    model: "Volkswagen Crafter",
    type: "Advanced Life Support",
    year: "2021",
    status: "Available",
    driver: "Jennifer Lopez",
    lastMaintenance: "2023-03-30",
    nextMaintenance: "2023-06-30",
    location: "South Clinic",
  },
  {
    id: "AMB-006",
    registrationNumber: "MNO-1234",
    model: "Renault Master",
    type: "Basic Life Support",
    year: "2020",
    status: "On Call",
    driver: "David Miller",
    lastMaintenance: "2023-04-10",
    nextMaintenance: "2023-07-10",
    location: "West Wing",
  },
  {
    id: "AMB-007",
    registrationNumber: "PQR-5678",
    model: "Mercedes Sprinter",
    type: "Advanced Life Support",
    year: "2022",
    status: "Available",
    driver: "Emily Clark",
    lastMaintenance: "2023-04-05",
    nextMaintenance: "2023-07-05",
    location: "Main Hospital",
  },
];

export default function AmbulanceListPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">Ambulance List</h1>
          <p className="text-muted-foreground">Manage and track all ambulances in the fleet</p>
        </div>
        <Button className="w-full md:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Add New Ambulance
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Ambulances</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">7</div>
              <Ambulance className="size-8 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">+1 from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Available Ambulances</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">4</div>
              <Car className="size-8 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">2 on call, 1 in maintenance</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Maintenance Due</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">2</div>
              <Wrench className="size-8 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">Next scheduled: May 20, 2023</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ambulance Fleet</CardTitle>
          <CardDescription>View and manage all ambulances in your fleet</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex w-full items-center gap-2 md:w-auto">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search ambulances..." className="h-9 md:w-[200px] lg:w-[300px]" />
              </div>
              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <Select defaultValue="all">
                  <SelectTrigger className="h-9 w-full md:w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="on-call">On Call</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
                <Select defaultValue="all">
                  <SelectTrigger className="h-9 w-full md:w-[180px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="bls">Basic Life Support</SelectItem>
                    <SelectItem value="als">Advanced Life Support</SelectItem>
                    <SelectItem value="pt">Patient Transport</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Tabs defaultValue="all" className="w-full">
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="available">Available</TabsTrigger>
                <TabsTrigger value="on-call">On Call</TabsTrigger>
                <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="mt-4">
                <div className="rounded-md border">
                  <Table className="whitespace-nowrap">
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Registration</TableHead>
                        <TableHead className="hidden md:table-cell">Model</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden lg:table-cell">Driver</TableHead>
                        <TableHead className="hidden lg:table-cell">Location</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="whitespace-nowrap">
                      {ambulances.map((ambulance) => (
                        <TableRow key={ambulance.id}>
                          <TableCell className="font-medium">
                            <Link href="/ambulance/details" className="hover:underline">
                              {ambulance.id}
                            </Link>
                          </TableCell>
                          <TableCell>{ambulance.registrationNumber}</TableCell>
                          <TableCell className="hidden md:table-cell">
                            {ambulance.model}
                            <br />
                            <span className="text-xs text-muted-foreground">{ambulance.year}</span>
                          </TableCell>
                          <TableCell>{ambulance.type}</TableCell>
                          <TableCell>
                            <Badge variant={ambulance.status === "Available" ? "default" : ambulance.status === "On Call" ? "secondary" : "outline"}>{ambulance.status}</Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">{ambulance.driver}</TableCell>
                          <TableCell className="hidden lg:table-cell">{ambulance.location}</TableCell>
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
                                  <Link href="/ambulance/details" className="flex items-center">
                                    <Edit className="mr-2 h-4 w-4" />
                                    View Details
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Settings className="mr-2 h-4 w-4" />
                                  Maintenance Log
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>Update Status</DropdownMenuItem>
                                <DropdownMenuItem>Assign Driver</DropdownMenuItem>
                                <DropdownMenuItem>View History</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
              <TabsContent value="available" className="mt-4">
                <div className="rounded-md border">
                  <Table className="whitespace-nowrap">
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Registration</TableHead>
                        <TableHead className="hidden md:table-cell">Model</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden lg:table-cell">Driver</TableHead>
                        <TableHead className="hidden lg:table-cell">Location</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="whitespace-nowrap">
                      {ambulances
                        .filter((ambulance) => ambulance.status === "Available")
                        .map((ambulance) => (
                          <TableRow key={ambulance.id}>
                            <TableCell className="font-medium">
                              <Link href="/ambulance/details" className="hover:underline">
                                {ambulance.id}
                              </Link>
                            </TableCell>
                            <TableCell>{ambulance.registrationNumber}</TableCell>
                            <TableCell className="hidden md:table-cell">
                              {ambulance.model}
                              <br />
                              <span className="text-xs text-muted-foreground">{ambulance.year}</span>
                            </TableCell>
                            <TableCell>{ambulance.type}</TableCell>
                            <TableCell>
                              <Badge>{ambulance.status}</Badge>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">{ambulance.driver}</TableCell>
                            <TableCell className="hidden lg:table-cell">{ambulance.location}</TableCell>
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
                                    <Link href="/ambulance/details" className="flex items-center">
                                      <Edit className="mr-2 h-4 w-4" />
                                      View Details
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Settings className="mr-2 h-4 w-4" />
                                    Maintenance Log
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem>Update Status</DropdownMenuItem>
                                  <DropdownMenuItem>Assign Driver</DropdownMenuItem>
                                  <DropdownMenuItem>View History</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
              <TabsContent value="on-call" className="mt-4">
                <div className="rounded-md border">
                  <Table className="whitespace-nowrap">
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Registration</TableHead>
                        <TableHead className="hidden md:table-cell">Model</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden lg:table-cell">Driver</TableHead>
                        <TableHead className="hidden lg:table-cell">Location</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="whitespace-nowrap">
                      {ambulances
                        .filter((ambulance) => ambulance.status === "On Call")
                        .map((ambulance) => (
                          <TableRow key={ambulance.id}>
                            <TableCell className="font-medium">
                              <Link href="/ambulance/details" className="hover:underline">
                                {ambulance.id}
                              </Link>
                            </TableCell>
                            <TableCell>{ambulance.registrationNumber}</TableCell>
                            <TableCell className="hidden md:table-cell">
                              {ambulance.model}
                              <br />
                              <span className="text-xs text-muted-foreground">{ambulance.year}</span>
                            </TableCell>
                            <TableCell>{ambulance.type}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{ambulance.status}</Badge>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">{ambulance.driver}</TableCell>
                            <TableCell className="hidden lg:table-cell">{ambulance.location}</TableCell>
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
                                    <Link href="/ambulance/details" className="flex items-center">
                                      <Edit className="mr-2 h-4 w-4" />
                                      View Details
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Settings className="mr-2 h-4 w-4" />
                                    Maintenance Log
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem>Update Status</DropdownMenuItem>
                                  <DropdownMenuItem>Assign Driver</DropdownMenuItem>
                                  <DropdownMenuItem>View History</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
              <TabsContent value="maintenance" className="mt-4">
                <div className="rounded-md border">
                  <Table className="whitespace-nowrap">
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Registration</TableHead>
                        <TableHead className="hidden md:table-cell">Model</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden lg:table-cell">Driver</TableHead>
                        <TableHead className="hidden lg:table-cell">Location</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="whitespace-nowrap">
                      {ambulances
                        .filter((ambulance) => ambulance.status === "Maintenance")
                        .map((ambulance) => (
                          <TableRow key={ambulance.id}>
                            <TableCell className="font-medium">
                              <Link href="/ambulance/details" className="hover:underline">
                                {ambulance.id}
                              </Link>
                            </TableCell>
                            <TableCell>{ambulance.registrationNumber}</TableCell>
                            <TableCell className="hidden md:table-cell">
                              {ambulance.model}
                              <br />
                              <span className="text-xs text-muted-foreground">{ambulance.year}</span>
                            </TableCell>
                            <TableCell>{ambulance.type}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{ambulance.status}</Badge>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">{ambulance.driver}</TableCell>
                            <TableCell className="hidden lg:table-cell">{ambulance.location}</TableCell>
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
                                    <Link href="/ambulance/details" className="flex items-center">
                                      <Edit className="mr-2 h-4 w-4" />
                                      View Details
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Settings className="mr-2 h-4 w-4" />
                                    Maintenance Log
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem>Update Status</DropdownMenuItem>
                                  <DropdownMenuItem>Assign Driver</DropdownMenuItem>
                                  <DropdownMenuItem>View History</DropdownMenuItem>
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
