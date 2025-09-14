"use client"

import { useState } from "react"
import { Star, Filter, MessageSquare, ThumbsUp, Flag, MoreHorizontal, Search, CheckCircle, XCircle, MoreVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

// Mock data for patient reviews
const patientReviews = [
  {
    id: "1",
    patientId: "p1",
    patientName: "Michael Thompson",
    rating: 5,
    date: "2023-04-15",
    title: "Excellent care and facilities",
    content:
      "I had an amazing experience at the clinic. The staff was friendly and professional, and the facilities were clean and modern. The wait time was minimal, and I received excellent care.",
    helpful: 18,
    status: "approved",
    category: "General",
    serviceType: "Outpatient",
  },
  {
    id: "2",
    patientId: "p2",
    patientName: "Emily Wilson",
    rating: 3,
    date: "2023-04-10",
    title: "Good doctors but long wait times",
    content:
      "The doctors and nurses were very professional and knowledgeable. However, I had to wait over an hour past my scheduled appointment time, which was frustrating. Better scheduling would improve the experience.",
    helpful: 7,
    status: "approved",
    category: "Wait Times",
    serviceType: "Consultation",
  },
  {
    id: "3",
    patientId: "p3",
    patientName: "Jennifer Adams",
    rating: 5,
    date: "2023-04-08",
    title: "Outstanding pediatric care",
    content:
      "The pediatric department is exceptional. The doctors and nurses were so good with my child, making what could have been a scary experience fun and comfortable. The play area in the waiting room was also a nice touch.",
    helpful: 22,
    status: "approved",
    category: "Pediatrics",
    serviceType: "Specialist",
  },
  {
    id: "4",
    patientId: "p4",
    patientName: "David Martinez",
    rating: 2,
    date: "2023-04-05",
    title: "Billing issues and poor communication",
    content:
      "While the medical care was adequate, I had numerous issues with billing. I was charged for services I didn't receive, and it took multiple calls to resolve. The communication between departments seems lacking.",
    helpful: 15,
    status: "pending",
    category: "Billing",
    serviceType: "Emergency",
  },
  {
    id: "5",
    patientId: "p5",
    patientName: "Lisa Brown",
    rating: 4,
    date: "2023-04-02",
    title: "Great emergency care",
    content:
      "I had to visit the emergency department, and I was impressed with how quickly I was seen and treated. The staff was professional and compassionate during a stressful time. The only improvement would be more updates during the waiting period.",
    helpful: 9,
    status: "approved",
    category: "Emergency",
    serviceType: "Emergency",
  },
  {
    id: "6",
    patientId: "p6",
    patientName: "Robert Johnson",
    rating: 1,
    date: "2023-03-28",
    title: "Unprofessional staff and dirty facilities",
    content:
      "I was extremely disappointed with my visit. The reception staff was rude, and I noticed several cleanliness issues in the waiting area and examination room. I will not be returning to this clinic.",
    helpful: 3,
    status: "flagged",
    category: "Cleanliness",
    serviceType: "Outpatient",
  },
]
const pendingReviews = [
  {
    id: "7",
    patientId: "p7",
    patientName: "Michael Wilson",
    rating: 3,
    date: "2023-04-10",
    title: "Mixed experience with follow-up care",
    content: "The initial consultation was good, but the follow-up care was inconsistent. Different doctors gave conflicting advice, which was confusing.",
    helpful: 5,
    status: "pending",
    category: "Follow-up Care",
    serviceType: "Outpatient",
  },
  {
    id: "8",
    patientId: "p8",
    patientName: "Sarah Thompson",
    rating: 4,
    date: "2023-04-08",
    title: "Efficient service but long wait times",
    content: "The medical staff was very professional and thorough, but the wait times were longer than expected. The facility was clean and well-maintained.",
    helpful: 8,
    status: "pending",
    category: "Wait Times",
    serviceType: "Specialist",
  }
]

const flaggedReviews = [
  {
    id: "9",
    patientId: "p9",
    patientName: "James Anderson",
    rating: 1,
    date: "2023-04-01",
    title: "Worst experience ever",
    content: "This place is a complete disaster. The staff is incompetent and the facilities are filthy. I would never recommend this clinic to anyone.",
    helpful: 2,
    status: "flagged",
    category: "Staff",
    serviceType: "Emergency",
  },
  {
    id: "10",
    patientId: "p10",
    patientName: "Emily Davis",
    rating: 2,
    date: "2023-03-25",
    title: "Unacceptable treatment",
    content: "The doctor was extremely rude and dismissive of my concerns. I felt completely ignored and disrespected during my visit.",
    helpful: 4,
    status: "flagged",
    category: "Professionalism",
    serviceType: "Outpatient",
  }
]

// Rating distribution calculation
const ratingDistribution = [
  { rating: 5, count: patientReviews.filter((r) => r.rating === 5).length },
  { rating: 4, count: patientReviews.filter((r) => r.rating === 4).length },
  { rating: 3, count: patientReviews.filter((r) => r.rating === 3).length },
  { rating: 2, count: patientReviews.filter((r) => r.rating === 2).length },
  { rating: 1, count: patientReviews.filter((r) => r.rating === 1).length },
]

const totalReviews = patientReviews.length
const averageRating = (patientReviews.reduce((acc, review) => acc + review.rating, 0) / totalReviews).toFixed(1)

// Categories for filtering
const categories = Array.from(new Set(patientReviews.map((review) => review.category)))
const serviceTypes = Array.from(new Set(patientReviews.map((review) => review.serviceType)))

export default function PatientReviewsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterRating, setFilterRating] = useState<string>("all")
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [filterService, setFilterService] = useState<string>("all")
  const [showApproved, setShowApproved] = useState(true)
  const [showPending, setShowPending] = useState(true)
  const [showFlagged, setShowFlagged] = useState(true)

  // Filter reviews based on search term, rating, category, service type, and status
  const filteredReviews = patientReviews.filter((review) => {
    const matchesSearch =
      review.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.title.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesRating = filterRating === "all" || review.rating === Number.parseInt(filterRating)
    const matchesCategory = filterCategory === "all" || review.category === filterCategory
    const matchesService = filterService === "all" || review.serviceType === filterService

    const matchesStatus =
      (showApproved && review.status === "approved") ||
      (showPending && review.status === "pending") ||
      (showFlagged && review.status === "flagged")

    return matchesSearch && matchesRating && matchesCategory && matchesService && matchesStatus
  })

  return (
    <div className="container mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-2xl lg:text-3xl font-bold tracking-tight">Patient Reviews</h2>
          <p className="text-muted-foreground">Manage and moderate patient feedback about the clinic</p>
        </div>
        <div className="flex items-center flex-wrap gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button size="sm">
            <MessageSquare className="h-4 w-4 mr-2" />
            Respond to Feedback
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <TabsList>
            <TabsTrigger value="all">All Reviews</TabsTrigger>
            <TabsTrigger value="pending">Pending Moderation</TabsTrigger>
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
              <CardDescription>Overview of patient reviews and ratings</CardDescription>
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
            <div className="flex flex-wrap items-center gap-2">
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

              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterService} onValueChange={setFilterService}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Service Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Services</SelectItem>
                  {serviceTypes.map((service) => (
                    <SelectItem key={service} value={service}>
                      {service}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="ml-auto text-sm text-muted-foreground">
              Showing {filteredReviews.length} of {totalReviews} reviews
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-4 p-4 bg-muted rounded-lg">
            <span className="text-sm font-medium">Show status:</span>
            <div className="flex items-center space-x-2">
              <Switch id="approved" checked={showApproved} onCheckedChange={setShowApproved} />
              <Label htmlFor="approved" className="text-sm">
                Approved
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="pending" checked={showPending} onCheckedChange={setShowPending} />
              <Label htmlFor="pending" className="text-sm">
                Pending
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="flagged" checked={showFlagged} onCheckedChange={setShowFlagged} />
              <Label htmlFor="flagged" className="text-sm">
                Flagged
              </Label>
            </div>
          </div>

          <div className="space-y-4">
            {filteredReviews.map((review) => (
              <Card key={review.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-start flex-wrap gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={`/user-3.png?height=40&width=40&query=${review.patientName}`}
                          alt={review.patientName}
                        />
                        <AvatarFallback>
                          {review.patientName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">{review.title}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
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
                          <Badge
                            variant={
                              review.status === "approved"
                                ? "outline"
                                : review.status === "pending"
                                  ? "secondary"
                                  : "destructive"
                            }
                            className="text-xs"
                          >
                            {review.status.charAt(0).toUpperCase() + review.status.slice(1)}
                          </Badge>
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
                        {review.status === "pending" && (
                          <DropdownMenuItem>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            <span>Approve</span>
                          </DropdownMenuItem>
                        )}
                        {review.status !== "flagged" && (
                          <DropdownMenuItem>
                            <Flag className="mr-2 h-4 w-4" />
                            <span>Flag review</span>
                          </DropdownMenuItem>
                        )}
                        {review.status === "flagged" && (
                          <DropdownMenuItem>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            <span>Unflag review</span>
                          </DropdownMenuItem>
                        )}
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
                      <div className="text-sm text-muted-foreground mb-1">Review by {review.patientName}</div>
                      <p>{review.content}</p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between flex-wrap gap-3">
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
                  <div className="flex items-center flex-wrap gap-2 text-sm text-muted-foreground">
                    <span>Category: {review.category}</span>
                    <Separator orientation="vertical" className="h-4" />
                    <span>Service: {review.serviceType}</span>
                  </div>
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
                        <div className="text-sm text-muted-foreground mb-1">Review by {review.patientName}</div>
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
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Category: {review.category}</span>
                      <Separator orientation="vertical" className="h-4" />
                      <span>Service: {review.serviceType}</span>
                    </div>
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
                        <div className="text-sm text-muted-foreground mb-1">Review by {review.patientName}</div>
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
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Category: {review.category}</span>
                      <Separator orientation="vertical" className="h-4" />
                      <span>Service: {review.serviceType}</span>
                    </div>
                  </CardFooter>
                </Card>
              ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
