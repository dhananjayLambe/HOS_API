import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Ambulance, Calendar, Clock, FileText, Gauge, MoreHorizontal, PenToolIcon as Tool, User, Wrench } from "lucide-react";
import Link from "next/link";

// Sample data for ambulance details
const ambulanceDetails = {
  id: "AMB-002",
  registrationNumber: "ABC-5678",
  model: "Mercedes Sprinter",
  type: "Advanced Life Support",
  year: "2022",
  status: "Available",
  driver: "Sarah Wilson",
  lastMaintenance: "2023-04-02",
  nextMaintenance: "2023-07-02",
  location: "East Wing",
  purchaseDate: "2022-01-15",
  fuelType: "Diesel",
  mileage: "12,450 km",
  insuranceExpiry: "2024-01-15",
  capacity: "2 stretchers, 3 seated",
};

// Sample maintenance history
const maintenanceHistory = [
  {
    id: "M001",
    date: "2023-04-02",
    type: "Regular Service",
    description: "Oil change, filter replacement, brake inspection",
    technician: "John Mechanic",
    cost: "$350",
    status: "Completed",
  },
  {
    id: "M002",
    date: "2023-01-10",
    type: "Tire Replacement",
    description: "Replaced all four tires with winter tires",
    technician: "Mike Tire",
    cost: "$800",
    status: "Completed",
  },
  {
    id: "M003",
    date: "2022-10-15",
    type: "Regular Service",
    description: "Oil change, filter replacement, general inspection",
    technician: "John Mechanic",
    cost: "$320",
    status: "Completed",
  },
  {
    id: "M004",
    date: "2022-07-22",
    type: "Brake Repair",
    description: "Front brake pads replacement and rotor resurfacing",
    technician: "Robert Brake",
    cost: "$450",
    status: "Completed",
  },
];

// Sample equipment inventory
const equipmentInventory = [
  {
    id: "E001",
    name: "Defibrillator",
    model: "Philips HeartStart FR3",
    serialNumber: "PHI-12345",
    lastInspection: "2023-03-15",
    nextInspection: "2023-06-15",
    status: "Operational",
  },
  {
    id: "E002",
    name: "Oxygen Tank",
    model: "OxyFlow 5000",
    serialNumber: "OF-67890",
    lastInspection: "2023-04-01",
    nextInspection: "2023-07-01",
    status: "Operational",
  },
  {
    id: "E003",
    name: "Stretcher",
    model: "Stryker Power-PRO XT",
    serialNumber: "SPX-54321",
    lastInspection: "2023-03-20",
    nextInspection: "2023-06-20",
    status: "Operational",
  },
  {
    id: "E004",
    name: "Suction Unit",
    model: "VacuMed 3000",
    serialNumber: "VM-13579",
    lastInspection: "2023-02-28",
    nextInspection: "2023-05-28",
    status: "Needs Inspection",
  },
  {
    id: "E005",
    name: "Blood Pressure Monitor",
    model: "Omron Pro",
    serialNumber: "OP-24680",
    lastInspection: "2023-03-10",
    nextInspection: "2023-06-10",
    status: "Operational",
  },
];

// Sample call assignments
const callAssignments = [
  {
    id: "CA001",
    date: "2023-04-18",
    time: "14:30",
    patient: "John Doe",
    location: "123 Main St, Anytown",
    reason: "Chest Pain",
    duration: "45 min",
    status: "Completed",
  },
  {
    id: "CA002",
    date: "2023-04-15",
    time: "09:15",
    patient: "Jane Smith",
    location: "456 Oak Ave, Somewhere",
    reason: "Traffic Accident",
    duration: "1 hr 20 min",
    status: "Completed",
  },
  {
    id: "CA003",
    date: "2023-04-10",
    time: "18:45",
    patient: "Robert Johnson",
    location: "789 Pine Rd, Elsewhere",
    reason: "Stroke Symptoms",
    duration: "55 min",
    status: "Completed",
  },
  {
    id: "CA004",
    date: "2023-04-05",
    time: "11:30",
    patient: "Emily Davis",
    location: "321 Elm St, Nowhere",
    reason: "Allergic Reaction",
    duration: "40 min",
    status: "Completed",
  },
];

export default function AmbulanceDetailsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
          <Link href="/ambulance/list" className="text-muted-foreground hover:text-foreground">
            Ambulances
          </Link>
          <span className="text-muted-foreground">/</span>
          <h2 className="text-2xl font-bold leading-tight mb-2">{ambulanceDetails.id}</h2>
          <Badge className="ml-2">{ambulanceDetails.status}</Badge>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline">
            <Tool className="mr-2 h-4 w-4" />
            Schedule Maintenance
          </Button>
          <Button>
            <Wrench className="mr-2 h-4 w-4" />
            Update Status
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{ambulanceDetails.status}</div>
              <Ambulance className="size-8 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">Last updated: Today, 9:30 AM</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Last Maintenance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{ambulanceDetails.lastMaintenance}</div>
              <Calendar className="size-8 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">Next: {ambulanceDetails.nextMaintenance}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">42</div>
              <FileText className="size-8 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">4 calls this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Current Driver</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{ambulanceDetails.driver}</div>
              <User className="size-8 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">Assigned since: April 1, 2023</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="equipment">Equipment</TabsTrigger>
          <TabsTrigger value="calls">Call Assignments</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Ambulance Overview</CardTitle>
              <CardDescription>General information and specifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="mb-4 text-lg font-medium">General Information</h3>
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    <dt className="font-medium text-muted-foreground">ID:</dt>
                    <dd>{ambulanceDetails.id}</dd>
                    <dt className="font-medium text-muted-foreground">Registration:</dt>
                    <dd>{ambulanceDetails.registrationNumber}</dd>
                    <dt className="font-medium text-muted-foreground">Model:</dt>
                    <dd>{ambulanceDetails.model}</dd>
                    <dt className="font-medium text-muted-foreground">Year:</dt>
                    <dd>{ambulanceDetails.year}</dd>
                    <dt className="font-medium text-muted-foreground">Type:</dt>
                    <dd>{ambulanceDetails.type}</dd>
                    <dt className="font-medium text-muted-foreground">Purchase Date:</dt>
                    <dd>{ambulanceDetails.purchaseDate}</dd>
                    <dt className="font-medium text-muted-foreground">Insurance Expiry:</dt>
                    <dd>{ambulanceDetails.insuranceExpiry}</dd>
                  </dl>
                </div>
                <div>
                  <h3 className="mb-4 text-lg font-medium">Technical Specifications</h3>
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    <dt className="font-medium text-muted-foreground">Fuel Type:</dt>
                    <dd>{ambulanceDetails.fuelType}</dd>
                    <dt className="font-medium text-muted-foreground">Mileage:</dt>
                    <dd>{ambulanceDetails.mileage}</dd>
                    <dt className="font-medium text-muted-foreground">Capacity:</dt>
                    <dd>{ambulanceDetails.capacity}</dd>
                    <dt className="font-medium text-muted-foreground">Current Location:</dt>
                    <dd>{ambulanceDetails.location}</dd>
                    <dt className="font-medium text-muted-foreground">Current Driver:</dt>
                    <dd>{ambulanceDetails.driver}</dd>
                    <dt className="font-medium text-muted-foreground">Last Maintenance:</dt>
                    <dd>{ambulanceDetails.lastMaintenance}</dd>
                    <dt className="font-medium text-muted-foreground">Next Maintenance:</dt>
                    <dd>{ambulanceDetails.nextMaintenance}</dd>
                  </dl>
                </div>
              </div>

              <div className="mt-8">
                <h3 className="mb-4 text-lg font-medium">Usage Statistics</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Total Distance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="text-2xl font-bold">12,450 km</div>
                        <Gauge className="size-8 text-muted-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground">+450 km this month</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Average Response Time</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="text-2xl font-bold">8.2 min</div>
                        <Clock className="size-8 text-muted-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground">-0.5 min from last month</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Fuel Efficiency</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="text-2xl font-bold">9.8 L/100km</div>
                        <Gauge className="size-8 text-muted-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground">Within normal range</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="maintenance" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance History</CardTitle>
              <CardDescription>Record of all maintenance activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table className="whitespace-nowrap">
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="hidden md:table-cell">Description</TableHead>
                      <TableHead className="hidden lg:table-cell">Technician</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="whitespace-nowrap">
                    {maintenanceHistory.map((maintenance) => (
                      <TableRow key={maintenance.id}>
                        <TableCell className="font-medium">{maintenance.id}</TableCell>
                        <TableCell>{maintenance.date}</TableCell>
                        <TableCell>{maintenance.type}</TableCell>
                        <TableCell className="hidden max-w-[300px] truncate md:table-cell">{maintenance.description}</TableCell>
                        <TableCell className="hidden lg:table-cell">{maintenance.technician}</TableCell>
                        <TableCell>{maintenance.cost}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{maintenance.status}</Badge>
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
                              <DropdownMenuItem>View Details</DropdownMenuItem>
                              <DropdownMenuItem>Edit Record</DropdownMenuItem>
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

              <div className="mt-6">
                <h3 className="mb-4 text-lg font-medium">Upcoming Maintenance</h3>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Regular Service</CardTitle>
                    <CardDescription>Scheduled for {ambulanceDetails.nextMaintenance}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc pl-5 text-sm">
                      <li className="mb-1">Oil and filter change</li>
                      <li className="mb-1">Brake inspection</li>
                      <li className="mb-1">Tire rotation and pressure check</li>
                      <li className="mb-1">Fluid levels check and top-up</li>
                      <li className="mb-1">General safety inspection</li>
                    </ul>
                    <div className="mt-4 flex justify-end">
                      <Button variant="outline" size="sm">
                        Reschedule
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="equipment" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Equipment Inventory</CardTitle>
              <CardDescription>List of all equipment on board</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table className="whitespace-nowrap">
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Equipment</TableHead>
                      <TableHead className="hidden md:table-cell">Model</TableHead>
                      <TableHead className="hidden lg:table-cell">Serial Number</TableHead>
                      <TableHead>Last Inspection</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="whitespace-nowrap">
                    {equipmentInventory.map((equipment) => (
                      <TableRow key={equipment.id}>
                        <TableCell className="font-medium">{equipment.id}</TableCell>
                        <TableCell>{equipment.name}</TableCell>
                        <TableCell className="hidden md:table-cell">{equipment.model}</TableCell>
                        <TableCell className="hidden lg:table-cell">{equipment.serialNumber}</TableCell>
                        <TableCell>
                          {equipment.lastInspection}
                          <br />
                          <span className="text-xs text-muted-foreground">Next: {equipment.nextInspection}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={equipment.status === "Operational" ? "default" : "outline"}>{equipment.status}</Badge>
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
                              <DropdownMenuItem>View Details</DropdownMenuItem>
                              <DropdownMenuItem>Record Inspection</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>Replace Equipment</DropdownMenuItem>
                              <DropdownMenuItem>Report Issue</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-6 flex justify-end">
                <Button>
                  <span className="mr-2">+</span>
                  Add Equipment
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="calls" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Call Assignments</CardTitle>
              <CardDescription>History of calls this ambulance has been assigned to</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table className="whitespace-nowrap">
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead className="hidden md:table-cell">Location</TableHead>
                      <TableHead className="hidden lg:table-cell">Reason</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="whitespace-nowrap">
                    {callAssignments.map((call) => (
                      <TableRow key={call.id}>
                        <TableCell className="font-medium">{call.id}</TableCell>
                        <TableCell>
                          {call.date}
                          <br />
                          <span className="text-xs text-muted-foreground">{call.time}</span>
                        </TableCell>
                        <TableCell>{call.patient}</TableCell>
                        <TableCell className="hidden max-w-[200px] truncate md:table-cell">{call.location}</TableCell>
                        <TableCell className="hidden lg:table-cell">{call.reason}</TableCell>
                        <TableCell>{call.duration}</TableCell>
                        <TableCell>
                          <Badge>{call.status}</Badge>
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
                              <DropdownMenuLabel>
                                Actions</DropdownMenuLabel>
                              <DropdownMenuItem>
                                <Link href={`/ambulance/calls/AC001`}>
                                  View Call Details
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Link href={`/patients/1`}>
                                  View Patient
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
