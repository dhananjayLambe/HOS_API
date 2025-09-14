"use client"

import { useState } from "react"
import Link from "next/link"
import { Star, Filter, MessageSquare, ThumbsUp, Flag, MoreHorizontal, Search, MoreVertical, XCircle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"

// Mock data for doctor reviews
const doctorReviews = [
  {
    id: "1",
    doctorId: "d1",
    doctorName: "Dr. Sarah Johnson",
    doctorSpecialty: "Cardiologist",
    patientName: "Michael Thompson",
    rating: 5,
    date: "2023-04-15",
    title: "Excellent care and attention",
    content:
      "Dr. Johnson was extremely thorough and took the time to explain everything in detail. She answered all my questions and made me feel at ease during my appointment.",
    helpful: 24,
    responded: true,
    response:
      "Thank you for your kind words, Michael. It was a pleasure to help you with your health concerns. Looking forward to your follow-up visit.",
    verified: true,
    department: "Cardiology",
  },
  {
    id: "2",
    doctorId: "d2",
    doctorName: "Dr. Robert Chen",
    doctorSpecialty: "Neurologist",
    patientName: "Emily Wilson",
    rating: 4,
    date: "2023-04-10",
    title: "Very knowledgeable doctor",
    content:
      "Dr. Chen was very knowledgeable and professional. The only reason I'm not giving 5 stars is because I had to wait a bit longer than expected for my appointment.",
    helpful: 12,
    responded: false,
    response: "",
    verified: true,
    department: "Neurology",
  },
  {
    id: "3",
    doctorId: "d3",
    doctorName: "Dr. Maria Garcia",
    doctorSpecialty: "Pediatrician",
    patientName: "Jennifer Adams",
    rating: 5,
    date: "2023-04-08",
    title: "Amazing with children",
    content:
      "Dr. Garcia is absolutely amazing with children. My son is usually terrified of doctors, but she made him feel comfortable and even laugh during the examination. Highly recommend!",
    helpful: 31,
    responded: true,
    response:
      "Thank you for your feedback, Jennifer! I'm so glad your son had a positive experience. Making children comfortable is always my priority.",
    verified: true,
    department: "Pediatrics",
  },
  {
    id: "4",
    doctorId: "d4",
    doctorName: "Dr. James Wilson",
    doctorSpecialty: "Orthopedic Surgeon",
    patientName: "David Martinez",
    rating: 3,
    date: "2023-04-05",
    title: "Good doctor but poor follow-up",
    content:
      "Dr. Wilson is knowledgeable and the surgery went well, but the follow-up care was lacking. I had difficulty getting responses to my post-surgery questions.",
    helpful: 8,
    responded: false,
    response: "",
    verified: true,
    department: "Orthopedics",
  },
  {
    id: "5",
    doctorId: "d1",
    doctorName: "Dr. Sarah Johnson",
    doctorSpecialty: "Cardiologist",
    patientName: "Lisa Brown",
    rating: 5,
    date: "2023-04-02",
    title: "Life-saving care",
    content:
      "Dr. Johnson literally saved my life. She identified a serious heart condition that other doctors had missed. Her attention to detail and expertise are unmatched.",
    helpful: 45,
    responded: true,
    response:
      "Thank you for your kind words, Lisa. I'm very glad we were able to identify and address your condition. Your health is our priority.",
    verified: true,
    department: "Cardiology",
  },
]
const pendingReviews = [
  {
    id: "6",
    doctorId: "d2",
    doctorName: "Dr. Michael Chen",
    doctorSpecialty: "Neurologist",
    patientName: "Robert Taylor",
    rating: 4,
    date: "2023-04-10",
    title: "Thorough examination",
    content: "Dr. Chen was very thorough in his examination and explained everything clearly. However, the wait time was longer than expected.",
    helpful: 12,
    responded: false,
    response: "",
    verified: true,
    department: "Neurology",
    status: "pending"
  },
  {
    id: "7",
    doctorId: "d3",
    doctorName: "Dr. Emily Garcia",
    doctorSpecialty: "Pediatrician",
    patientName: "Susan White",
    rating: 5,
    date: "2023-04-09",
    title: "Excellent pediatric care",
    content: "Dr. Garcia is wonderful with my children. She takes the time to explain everything and makes them feel comfortable.",
    helpful: 18,
    responded: false,
    response: "",
    verified: true,
    department: "Pediatrics",
    status: "pending"
  }
]

const flaggedReviews = [
  {
    id: "8",
    doctorId: "d4",
    doctorName: "Dr. James Wilson",
    doctorSpecialty: "Orthopedic Surgeon",
    patientName: "Thomas Clark",
    rating: 1,
    date: "2023-04-07",
    title: "Terrible experience",
    content: "The doctor was extremely rude and dismissive. He didn't listen to my concerns and rushed through the appointment.",
    helpful: 3,
    responded: false,
    response: "",
    verified: true,
    department: "Orthopedics",
    status: "flagged"
  },
  {
    id: "9",
    doctorId: "d1",
    doctorName: "Dr. Sarah Johnson",
    doctorSpecialty: "Cardiologist",
    patientName: "Patricia Lee",
    rating: 2,
    date: "2023-04-06",
    title: "Unprofessional behavior",
    content: "The doctor was late to the appointment and seemed distracted throughout. She didn't address my concerns properly.",
    helpful: 5,
    responded: false,
    response: "",
    verified: true,
    department: "Cardiology",
    status: "flagged"
  }
]

// Rating distribution calculation
const ratingDistribution = [
  { rating: 5, count: doctorReviews.filter((r) => r.rating === 5).length },
  { rating: 4, count: doctorReviews.filter((r) => r.rating === 4).length },
  { rating: 3, count: doctorReviews.filter((r) => r.rating === 3).length },
  { rating: 2, count: doctorReviews.filter((r) => r.rating === 2).length },
  { rating: 1, count: doctorReviews.filter((r) => r.rating === 1).length },
]

const totalReviews = doctorReviews.length
const averageRating = (doctorReviews.reduce((acc, review) => acc + review.rating, 0) / totalReviews).toFixed(1)

export default function DoctorReviewsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterRating, setFilterRating] = useState<string>("all")
  const [filterDepartment, setFilterDepartment] = useState<string>("all")

  // Filter reviews based on search term, rating, and department
  const filteredReviews = doctorReviews.filter((review) => {
    const matchesSearch =
      review.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.title.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesRating = filterRating === "all" || review.rating === Number.parseInt(filterRating)
    const matchesDepartment = filterDepartment === "all" || review.department === filterDepartment

    return matchesSearch && matchesRating && matchesDepartment
  })

  // Get unique departments for filter
  const departments = Array.from(new Set(doctorReviews.map((review) => review.department)))

  return (
    <div className="container mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Doctor Reviews</h1>
          <p className="text-muted-foreground">Manage and respond to patient reviews of doctors</p>
        </div>
        <div className="flex items-center flex-wrap gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button size="sm">
            <MessageSquare className="h-4 w-4 mr-2" />
            Respond to Reviews
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <TabsList>
            <TabsTrigger value="all">All Reviews</TabsTrigger>
            <TabsTrigger value="pending">Pending Response</TabsTrigger>
            <TabsTrigger value="flagged">Flagged</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search reviews..."
                className="pl-8 w-[200px] md:w-[300px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        <TabsContent value="all" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Review Statistics</CardTitle>
              <CardDescription>Overview of doctor reviews and ratings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="text-5xl font-bold">{averageRating}</div>
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-5 w-5 ${
                          star <= Math.round(Number.parseFloat(averageRating))
                            ? "text-yellow-400 fill-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  <div className="text-sm text-muted-foreground">Based on {totalReviews} reviews</div>
                </div>

                <div className="col-span-2 space-y-2">
                  {ratingDistribution.map((item) => (
                    <div key={item.rating} className="flex items-center gap-2">
                      <div className="w-12 text-sm font-medium">{item.rating} stars</div>
                      <Progress value={(item.count / totalReviews) * 100} className="h-2" />
                      <div className="w-12 text-sm text-muted-foreground text-right">
                        {Math.round((item.count / totalReviews) * 100)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex items-center flex-wrap gap-2">
              <span className="text-sm font-medium">Filter by:</span>
              <Select value={filterRating} onValueChange={setFilterRating}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ratings</SelectItem>
                  <SelectItem value="5">5 Stars</SelectItem>
                  <SelectItem value="4">4 Stars</SelectItem>
                  <SelectItem value="3">3 Stars</SelectItem>
                  <SelectItem value="2">2 Stars</SelectItem>
                  <SelectItem value="1">1 Star</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="ml-auto text-sm text-muted-foreground">
              Showing {filteredReviews.length} of {totalReviews} reviews
            </div>
          </div>

          <div className="space-y-4">
            {filteredReviews.map((review) => (
              <Card key={review.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between  items-start">
                    <div className="flex items-start flex-wrap gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={`/user-3.png?height=40&width=40&query=${review.doctorName}`}
                          alt={review.doctorName}
                        />
                        <AvatarFallback>
                          {review.doctorName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">{review.title}</CardTitle>
                        <div className="flex items-center flex-wrap gap-2 mt-1">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-4 w-4 ${
                                  star <= review.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {new Date(review.date).toLocaleDateString()}
                          </span>
                          {review.verified && (
                            <Badge variant="outline" className="text-xs">
                              Verified Patient
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">More options</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <MessageSquare className="mr-2 h-4 w-4" />
                          <span>Respond</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Flag className="mr-2 h-4 w-4" />
                          <span>Flag review</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <span>Hide review</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">
                        Review for{" "}
                        <Link href={`/doctors/${review.doctorId}`} className="font-medium text-primary hover:underline">
                          {review.doctorName}
                        </Link>{" "}
                        ({review.doctorSpecialty}) by {review.patientName}
                      </div>
                      <p>{review.content}</p>
                    </div>

                    {review.responded && (
                      <div className="bg-muted p-3 rounded-md">
                        <div className="text-sm font-medium mb-1">Response from {review.doctorName}</div>
                        <p className="text-sm">{review.response}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm">
                      <ThumbsUp className="mr-1 h-4 w-4" />
                      Helpful ({review.helpful})
                    </Button>
                    {!review.responded && (
                      <Button variant="outline" size="sm">
                        <MessageSquare className="mr-1 h-4 w-4" />
                        Respond
                      </Button>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">Department: {review.department}</div>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <div className="grid gap-4">
            {pendingReviews
              .filter((review) => review.status === "pending")
              .map((review) => (
                <Card key={review.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                          Pending
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(review.date).toLocaleDateString()}
                        </span>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            <span>Approve review</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Flag className="mr-2 h-4 w-4" />
                            <span>Flag review</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <XCircle className="mr-2 h-4 w-4" />
                            <span>Reject review</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">
                          Review for{" "}
                          <Link href={`/doctors/${review.doctorId}`} className="font-medium text-primary hover:underline">
                            {review.doctorName}
                          </Link>{" "}
                          ({review.doctorSpecialty}) by {review.patientName}
                        </div>
                        <p>{review.content}</p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        <ThumbsUp className="mr-1 h-4 w-4" />
                        Helpful ({review.helpful})
                      </Button>
                      <Button variant="outline" size="sm">
                        <MessageSquare className="mr-1 h-4 w-4" />
                        Respond
                      </Button>
                    </div>
                    <div className="text-sm text-muted-foreground">Department: {review.department}</div>
                  </CardFooter>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="flagged" className="space-y-4">
          <div className="grid gap-4">
            {flaggedReviews
              .filter((review) => review.status === "flagged")
              .map((review) => (
                <Card key={review.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-red-100 text-red-800">
                          Flagged
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(review.date).toLocaleDateString()}
                        </span>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            <span>Approve review</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            <span>Unflag review</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <XCircle className="mr-2 h-4 w-4" />
                            <span>Hide review</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">
                          Review for{" "}
                          <Link href={`/doctors/${review.doctorId}`} className="font-medium text-primary hover:underline">
                            {review.doctorName}
                          </Link>{" "}
                          ({review.doctorSpecialty}) by {review.patientName}
                        </div>
                        <p>{review.content}</p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        <ThumbsUp className="mr-1 h-4 w-4" />
                        Helpful ({review.helpful})
                      </Button>
                      <Button variant="outline" size="sm">
                        <MessageSquare className="mr-1 h-4 w-4" />
                        Respond
                      </Button>
                    </div>
                    <div className="text-sm text-muted-foreground">Department: {review.department}</div>
                  </CardFooter>
                </Card>
              ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
