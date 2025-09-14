import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, Building2, Calendar, Edit, Mail, MapPin, Phone, Users } from "lucide-react"
import Link from "next/link"
import { use } from "react"

export default function DepartmentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  // In a real application, you would fetch the department data based on the ID
  const {id} = use(params)
  const departmentId = Number.parseInt(id)
  const department = departments.find((d) => d.id === departmentId) || departments[0]

  return (  
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Link href="/departments">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">{department.name}</h2>
        <Badge
          className={
            department.status === "Active"
              ? "bg-green-100 text-green-800 hover:bg-green-100"
              : "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
          }
        >
          {department.status}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Staff Members</CardTitle>
            <Users className="size-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{department.staffCount}</div>
            <p className="text-xs text-muted-foreground">+2 from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Services Offered</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="size-8 text-muted-foreground"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{department.services}</div>
            <p className="text-xs text-muted-foreground">+3 new services added</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Appointments</CardTitle>
            <Calendar className="size-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">128</div>
            <p className="text-xs text-muted-foreground">+14% from last month</p>
          </CardContent>
        </Card>
      </div>

      <div className="md:grid gap-4 max-md:space-y-4 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Department Information</CardTitle>
            <CardDescription>Details about the {department.name} department</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Established: January 2015</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Location: East Wing, 3rd Floor</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Contact: +1 (555) 123-4567</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Email: {department.name.toLowerCase()}@clinic.com</span>
            </div>
            <div className="pt-4">
              <h4 className="mb-2 text-sm font-medium">Department Capacity</h4>
              <Progress value={75} className="h-2" />
              <p className="mt-1 text-xs text-muted-foreground">75% of maximum capacity</p>
            </div>
            <div className="flex gap-2 pt-4 flex-wrap">
              <Link href={`/departments/${department.id}/edit`}>
                <Button variant="outline" size="sm">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Department
                </Button>
              </Link>
              <Link href={`/departments/${department.id}/staff`}>
                <Button size="sm">
                  <Users className="mr-2 h-4 w-4" />
                  Manage Staff
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Department Overview</CardTitle>
            <CardDescription>Key information and statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="about">
              <TabsList className="mb-4">
                <TabsTrigger value="about">About</TabsTrigger>
                <TabsTrigger value="staff">Key Staff</TabsTrigger>
                <TabsTrigger value="services">Services</TabsTrigger>
              </TabsList>
              <TabsContent value="about" className="space-y-4">
                <p>
                  The {department.name} department at our clinic is dedicated to providing exceptional care in the field
                  of {department.name.toLowerCase()} medicine. Our team of specialists works collaboratively to deliver
                  comprehensive treatment plans tailored to each patient's unique needs.
                </p>
                <p>
                  Established in 2015, the department has grown to become a center of excellence, equipped with
                  state-of-the-art technology and facilities. We pride ourselves on staying at the forefront of medical
                  advancements and implementing evidence-based practices.
                </p>
                <h4 className="font-medium pt-2">Department Goals</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Provide exceptional patient care with compassion and expertise</li>
                  <li>Advance medical knowledge through research and innovation</li>
                  <li>Train the next generation of medical professionals</li>
                  <li>Engage with the community to promote health and wellness</li>
                </ul>
              </TabsContent>
              <TabsContent value="staff">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src="/thoughtful-gaze.png" alt={department.head} />
                      <AvatarFallback>
                        {department.head
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="text-sm font-medium">{department.head}</h4>
                      <p className="text-xs text-muted-foreground">Department Head</p>
                    </div>
                  </div>

                  {[1, 2, 3].map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={`/thoughtful-gaze.png?height=40&width=40&query=portrait${i + 1}`}
                          alt={`Staff ${i + 1}`}
                        />
                        <AvatarFallback>S{i + 1}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="text-sm font-medium">Dr. {["Alex Parker", "Jamie Smith", "Taylor Jones"][i]}</h4>
                        <p className="text-xs text-muted-foreground">
                          {["Senior Specialist", "Specialist", "Resident"][i]}
                        </p>
                      </div>
                    </div>
                  ))}

                  <Link href={`/departments/${department.id}/staff`}>
                    <Button variant="outline" className="w-full mt-2">
                      <Users className="mr-2 h-4 w-4" />
                      View All Staff
                    </Button>
                  </Link>
                </div>
              </TabsContent>
              <TabsContent value="services">
                <div className="space-y-4">
                  {[
                    "Comprehensive Consultations",
                    "Diagnostic Procedures",
                    "Therapeutic Interventions",
                    "Follow-up Care",
                    "Emergency Services",
                  ].map((service, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <div>
                        <h4 className="text-sm font-medium">{service}</h4>
                        <p className="text-xs text-muted-foreground">
                          {["30-60 min", "45-90 min", "60-120 min", "15-30 min", "As needed"][i]}
                        </p>
                      </div>
                      <Badge variant="outline">{["$150", "$250", "$350", "$100", "Varies"][i]}</Badge>
                    </div>
                  ))}

                  <Link href={`/departments/services`}>
                    <Button variant="outline" className="w-full mt-2">
                      View All Services
                    </Button>
                  </Link>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
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
