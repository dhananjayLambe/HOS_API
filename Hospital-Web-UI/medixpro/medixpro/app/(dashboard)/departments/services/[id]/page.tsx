import { ArrowLeft, Calendar, Clock, DollarSign, Edit, FileText, LineChart, MessageSquare, Pencil, Plus, Printer, Share2, Star, Users } from "lucide-react";
import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { use } from "react";

export default function ServiceDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  // In a real application, you would fetch the service details based on the ID
  // For this example, we'll use mock data
  const {id} = use(params)
  const service = {
    id: id,
    name: "MRI Scan",
    department: "Radiology",
    type: "Diagnostic",
    duration: 45,
    price: 850,
    description: "Magnetic Resonance Imaging (MRI) is a non-invasive imaging technology that produces three-dimensional detailed anatomical images. It is often used for disease detection, diagnosis, and treatment monitoring.",
    preparation: "You may be asked not to eat or drink for 4-6 hours before the scan. If you have any metal implants, please inform the staff beforehand.",
    availability: [
      { day: "Monday", slots: ["09:00 AM - 11:00 AM", "02:00 PM - 04:00 PM"] },
      { day: "Tuesday", slots: ["09:00 AM - 11:00 AM", "02:00 PM - 04:00 PM"] },
      { day: "Wednesday", slots: ["09:00 AM - 11:00 AM", "02:00 PM - 04:00 PM"] },
      { day: "Thursday", slots: ["09:00 AM - 11:00 AM", "02:00 PM - 04:00 PM"] },
      { day: "Friday", slots: ["09:00 AM - 11:00 AM", "02:00 PM - 04:00 PM"] },
    ],
    providers: [
      { id: "1", name: "Dr. Sarah Johnson", role: "Radiologist", image: "/abstract-jr.png" },
      { id: "2", name: "Dr. Michael Chen", role: "Radiologist", image: "/abstract-geometric-lt.png" },
      { id: "3", name: "Dr. Emily Rodriguez", role: "Neuroradiologist", image: "/stylized-initials.png" },
    ],
    relatedServices: [
      { id: "2", name: "CT Scan", department: "Radiology", price: 650 },
      { id: "3", name: "X-Ray", department: "Radiology", price: 150 },
      { id: "4", name: "Ultrasound", department: "Radiology", price: 250 },
    ],
    reviews: [
      {
        id: "1",
        patient: "John D.",
        rating: 4.5,
        comment: "Very thorough examination, staff was professional and caring.",
      },
      {
        id: "2",
        patient: "Sarah M.",
        rating: 5,
        comment: "Excellent service, the doctor explained everything clearly.",
      },
      {
        id: "3",
        patient: "Robert K.",
        rating: 4,
        comment: "Good experience overall, but had to wait a bit longer than expected.",
      },
    ],
    stats: {
      appointmentsThisMonth: 124,
      averageRating: 4.5,
      revenueThisMonth: 105400,
      growthRate: 8.5,
    },
    equipment: [
      { name: "Siemens MAGNETOM Vida 3T", status: "Operational", lastMaintenance: "2023-03-15" },
      { name: "GE Healthcare SIGNA Pioneer 3.0T", status: "Operational", lastMaintenance: "2023-02-28" },
    ],
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link href="/departments/services">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">{service.name}</h1>
          <Badge variant="outline" className="ml-2">
            {service.type}
          </Badge>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline">
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button variant="outline">
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
          <Button asChild>
            <Link href={`/departments/services/${id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Service
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Service Information</CardTitle>
            <CardDescription>Detailed information about {service.name}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Department</div>
                <div>{service.department}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Service Type</div>
                <div>{service.type}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Duration</div>
                <div className="flex items-center">
                  <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                  {service.duration} minutes
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Price</div>
                <div className="flex items-center">
                  <DollarSign className="mr-2 h-4 w-4 text-muted-foreground" />${service.price}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Description</div>
              <p>{service.description}</p>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Patient Preparation</div>
              <p>{service.preparation}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Service Statistics</CardTitle>
            <CardDescription>Performance metrics for this month</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-muted-foreground">Appointments</div>
                <div className="text-sm font-medium">{service.stats.appointmentsThisMonth}</div>
              </div>
              <Progress value={75} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-muted-foreground">Average Rating</div>
                <div className="flex items-center text-sm font-medium">
                  <Star className="mr-1 h-4 w-4 fill-primary text-primary" />
                  {service.stats.averageRating}/5
                </div>
              </div>
              <Progress value={90} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-muted-foreground">Revenue</div>
                <div className="text-sm font-medium">${service.stats.revenueThisMonth}</div>
              </div>
              <Progress value={80} className="h-2" />
            </div>
            <div className="flex items-center justify-between rounded-md bg-muted p-3">
              <div className="text-sm font-medium">Growth Rate</div>
              <div className="text-sm font-medium text-green-500">+{service.stats.growthRate}%</div>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full">
              <LineChart className="mr-2 h-4 w-4" />
              View Detailed Analytics
            </Button>
          </CardFooter>
        </Card>
      </div>

      <Tabs defaultValue="availability" className="w-full">
        <TabsList>
          <TabsTrigger value="availability">Availability</TabsTrigger>
          <TabsTrigger value="providers">Service Providers</TabsTrigger>
          <TabsTrigger value="equipment">Equipment</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
        </TabsList>
        <TabsContent value="availability" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle>Service Availability</CardTitle>
                <CardDescription>When this service is available for booking</CardDescription>
              </div>
              <Button asChild>
                <Link href={`/departments/services/${id}/availability`}>
                  <Calendar className="mr-2 h-4 w-4" />
                  Manage Schedule
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <Table className="whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead>Day</TableHead>
                    <TableHead>Available Slots</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="whitespace-nowrap">
                  {service.availability.map((day) => (
                    <TableRow key={day.day}>
                      <TableCell className="font-medium">{day.day}</TableCell>
                      <TableCell>
                        {day.slots.map((slot, index) => (
                          <Badge key={index} variant="outline" className="mr-2 mb-2">
                            {slot}
                          </Badge>
                        ))}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="providers" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle>Service Providers</CardTitle>
                <CardDescription>Staff who can perform this service</CardDescription>
              </div>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Provider
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {service.providers.map((provider) => (
                  <Card key={provider.id}>
                    <CardContent className="pt-6">
                      <div className="flex flex-col items-center text-center">
                        <Avatar className="h-20 w-20">
                          <AvatarImage src={provider.image || "/user-2.png"} alt={provider.name} />
                          <AvatarFallback>{provider.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <h3 className="mt-4 text-lg font-medium">{provider.name}</h3>
                        <p className="text-sm text-muted-foreground">{provider.role}</p>
                        <div className="mt-4 flex gap-2">
                          <Button variant="outline" size="sm">
                            <Users className="mr-2 h-4 w-4" />
                            View Profile
                          </Button>
                          <Button variant="outline" size="sm">
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Contact
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="equipment" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Equipment</CardTitle>
              <CardDescription>Equipment used for this service</CardDescription>
            </CardHeader>
            <CardContent>
              <Table className="whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipment Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Maintenance</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="whitespace-nowrap">
                  {service.equipment.map((item) => (
                    <TableRow key={item.name}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <Badge variant={item.status === "Operational" ? "outline" : "destructive"}>{item.status}</Badge>
                      </TableCell>
                      <TableCell>{item.lastMaintenance}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon">
                          <FileText className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="reviews" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle>Patient Reviews</CardTitle>
                <CardDescription>What patients are saying about this service</CardDescription>
              </div>
              <div className="flex items-center">
                <Star className="mr-1 h-4 w-4 fill-primary text-primary" />
                <span className="font-medium">{service.stats.averageRating}</span>
                <span className="ml-1 text-muted-foreground">/ 5</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {service.reviews.map((review) => (
                  <div key={review.id} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{review.patient}</div>
                      <div className="flex items-center">
                        <Star className="mr-1 h-4 w-4 fill-primary text-primary" />
                        <span>{review.rating}</span>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{review.comment}</p>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">
                View All Reviews
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight mb-2">Related Services</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {service.relatedServices.map((relatedService) => (
            <Card key={relatedService.id}>
              <CardHeader>
                <CardTitle className="text-lg">{relatedService.name}</CardTitle>
                <CardDescription>{relatedService.department}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <DollarSign className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>${relatedService.price}</span>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/departments/services/${relatedService.id}`}>View Details</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
