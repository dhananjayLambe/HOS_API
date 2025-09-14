import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Clock, DollarSign, Edit, FileText, Filter, MoreHorizontal, Plus, Search, Stethoscope, Tag } from "lucide-react";
import Link from "next/link";

export default function ServicesPage() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">Services Offered</h2>
          <p className="text-muted-foreground">Manage all services provided by your clinic</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/services/add">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Service
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Services</CardTitle>
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">86</div>
            <p className="text-xs text-muted-foreground">Across 12 departments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Most Popular</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">General Checkup</div>
            <p className="text-xs text-muted-foreground">248 appointments this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45 min</div>
            <p className="text-xs text-muted-foreground">Across all services</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$128,450</div>
            <p className="text-xs text-muted-foreground">+12% from last month</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Service Directory</CardTitle>
              <CardDescription>Browse and manage all services offered by your clinic</CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Search services..." className="w-full pl-8 md:w-[250px]" />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto">
                    <Filter className="mr-2 h-4 w-4" />
                    Filter
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[200px]">
                  <DropdownMenuLabel>Filter By</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <span>Price: Low to High</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <span>Price: High to Low</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <span>Duration: Shortest</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <span>Duration: Longest</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <span>Popularity</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Select defaultValue="all">
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem value="cardiology">Cardiology</SelectItem>
                  <SelectItem value="neurology">Neurology</SelectItem>
                  <SelectItem value="pediatrics">Pediatrics</SelectItem>
                  <SelectItem value="orthopedics">Orthopedics</SelectItem>
                  <SelectItem value="dermatology">Dermatology</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="all">All Services</TabsTrigger>
              <TabsTrigger value="diagnostic">Diagnostic</TabsTrigger>
              <TabsTrigger value="treatment">Treatment</TabsTrigger>
              <TabsTrigger value="preventive">Preventive</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-8">
              {departmentServices.map((dept) => (
                <div key={dept.id} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold">{dept.name}</h3>
                    <Badge variant="outline" className="text-xs">
                      {dept.services.length} Services
                    </Badge>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {dept.services.map((service) => (
                      <ServiceCard key={service.id} service={service} />
                    ))}
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="diagnostic" className="space-y-8">
              {departmentServices.map((dept) => {
                const diagnosticServices = dept.services.filter((s) => s.type === "Diagnostic");
                if (diagnosticServices.length === 0) return null;

                return (
                  <div key={`${dept.id}-diagnostic`} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-semibold">{dept.name}</h3>
                      <Badge variant="outline" className="text-xs">
                        {diagnosticServices.length} Services
                      </Badge>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {diagnosticServices.map((service) => (
                        <ServiceCard key={service.id} service={service} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </TabsContent>

            <TabsContent value="treatment" className="space-y-8">
              {departmentServices.map((dept) => {
                const treatmentServices = dept.services.filter((s) => s.type === "Treatment");
                if (treatmentServices.length === 0) return null;

                return (
                  <div key={`${dept.id}-treatment`} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-semibold">{dept.name}</h3>
                      <Badge variant="outline" className="text-xs">
                        {treatmentServices.length} Services
                      </Badge>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {treatmentServices.map((service) => (
                        <ServiceCard key={service.id} service={service} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </TabsContent>

            <TabsContent value="preventive" className="space-y-8">
              {departmentServices.map((dept) => {
                const preventiveServices = dept.services.filter((s) => s.type === "Preventive");
                if (preventiveServices.length === 0) return null;

                return (
                  <div key={`${dept.id}-preventive`} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-semibold">{dept.name}</h3>
                      <Badge variant="outline" className="text-xs">
                        {preventiveServices.length} Services
                      </Badge>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {preventiveServices.map((service) => (
                        <ServiceCard key={service.id} service={service} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function ServiceCard({ service }: { service: any }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{service.name}</CardTitle>
            <CardDescription className="text-xs mt-1">{service.description}</CardDescription>
          </div>
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
                <Edit className="mr-2 h-4 w-4" />
                <span>Edit Service</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <FileText className="mr-2 h-4 w-4" />
                <span>View Details</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                <span>Deactivate</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge variant="secondary" className="text-xs">
            <Clock className="mr-1 h-3 w-3" />
            {service.duration}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            <DollarSign className="mr-1 h-3 w-3" />
            {service.price}
          </Badge>
          <Badge variant="outline" className="text-xs">
            <Tag className="mr-1 h-3 w-3" />
            {service.type}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

const departmentServices = [
  {
    id: "dept-1",
    name: "Cardiology",
    services: [
      {
        id: "service-1",
        name: "Electrocardiogram (ECG)",
        description: "Recording of the electrical activity of the heart",
        duration: "30 min",
        price: "$120",
        type: "Diagnostic",
      },
      {
        id: "service-2",
        name: "Echocardiogram",
        description: "Ultrasound of the heart to assess structure and function",
        duration: "45 min",
        price: "$250",
        type: "Diagnostic",
      },
      {
        id: "service-3",
        name: "Cardiac Stress Test",
        description: "Measures heart function during physical activity",
        duration: "60 min",
        price: "$350",
        type: "Diagnostic",
      },
      {
        id: "service-4",
        name: "Cardiac Consultation",
        description: "Comprehensive heart health assessment",
        duration: "45 min",
        price: "$180",
        type: "Preventive",
      },
    ],
  },
  {
    id: "dept-2",
    name: "Neurology",
    services: [
      {
        id: "service-5",
        name: "Electroencephalogram (EEG)",
        description: "Recording of electrical activity in the brain",
        duration: "60 min",
        price: "$280",
        type: "Diagnostic",
      },
      {
        id: "service-6",
        name: "Neurological Examination",
        description: "Comprehensive assessment of neurological function",
        duration: "45 min",
        price: "$200",
        type: "Diagnostic",
      },
      {
        id: "service-7",
        name: "Migraine Treatment",
        description: "Specialized treatment for chronic migraines",
        duration: "30 min",
        price: "$150",
        type: "Treatment",
      },
    ],
  },
  {
    id: "dept-3",
    name: "Pediatrics",
    services: [
      {
        id: "service-8",
        name: "Well-Child Visit",
        description: "Routine check-up for children's health and development",
        duration: "30 min",
        price: "$100",
        type: "Preventive",
      },
      {
        id: "service-9",
        name: "Childhood Immunizations",
        description: "Standard vaccinations for children",
        duration: "15 min",
        price: "$80",
        type: "Preventive",
      },
      {
        id: "service-10",
        name: "Pediatric Allergy Testing",
        description: "Identification of allergies in children",
        duration: "45 min",
        price: "$180",
        type: "Diagnostic",
      },
      {
        id: "service-11",
        name: "Pediatric Asthma Treatment",
        description: "Management and treatment of childhood asthma",
        duration: "30 min",
        price: "$120",
        type: "Treatment",
      },
    ],
  },
  {
    id: "dept-4",
    name: "Orthopedics",
    services: [
      {
        id: "service-12",
        name: "Joint Injection",
        description: "Injection of medication into joints to reduce pain and inflammation",
        duration: "30 min",
        price: "$150",
        type: "Treatment",
      },
      {
        id: "service-13",
        name: "Fracture Care",
        description: "Treatment and management of bone fractures",
        duration: "45 min",
        price: "$220",
        type: "Treatment",
      },
      {
        id: "service-14",
        name: "Orthopedic Consultation",
        description: "Evaluation of musculoskeletal conditions",
        duration: "30 min",
        price: "$160",
        type: "Diagnostic",
      },
    ],
  },
  {
    id: "dept-5",
    name: "Dermatology",
    services: [
      {
        id: "service-15",
        name: "Skin Cancer Screening",
        description: "Examination for early detection of skin cancer",
        duration: "30 min",
        price: "$120",
        type: "Preventive",
      },
      {
        id: "service-16",
        name: "Acne Treatment",
        description: "Specialized treatment for acne and related conditions",
        duration: "30 min",
        price: "$140",
        type: "Treatment",
      },
      {
        id: "service-17",
        name: "Mole Removal",
        description: "Removal of suspicious or cosmetically undesirable moles",
        duration: "45 min",
        price: "$200",
        type: "Treatment",
      },
    ],
  },
];
