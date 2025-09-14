import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  ArrowLeft,
  Search,
  Filter,
  MoreHorizontal,
  Plus,
  Download,
  FileText,
  Eye,
  Edit,
  Trash,
  Star,
  TrendingUp,
  TrendingDown,
  ThumbsUp,
  MessageSquare,
} from "lucide-react"
import Link from "next/link"

// Mock data for performance reviews
const performanceReviews = [
  {
    id: 1,
    staffName: "Dr. Sarah Johnson",
    staffId: "1",
    staffAvatar: "/mystical-forest-spirit.png",
    staffInitials: "SJ",
    department: "Medical",
    role: "Cardiologist",
    reviewDate: "2023-04-15",
    reviewPeriod: "Q1 2023",
    overallRating: 4.8,
    reviewStatus: "Completed",
    reviewedBy: "Dr. William Smith",
    patientSatisfaction: 4.9,
    teamCollaboration: 4.7,
    clinicalSkills: 4.9,
    timeManagement: 4.6,
    documentation: 4.7,
    strengths: ["Exceptional diagnostic skills", "Patient communication", "Research contributions"],
    areasForImprovement: ["Time management during consultations"],
    goals: ["Publish research paper", "Mentor junior staff", "Attend advanced cardiac imaging workshop"],
  },
  {
    id: 2,
    staffName: "Dr. Michael Chen",
    staffId: "2",
    staffAvatar: "",
    staffInitials: "MC",
    department: "Medical",
    role: "Neurologist",
    reviewDate: "2023-04-12",
    reviewPeriod: "Q1 2023",
    overallRating: 4.5,
    reviewStatus: "Completed",
    reviewedBy: "Dr. William Smith",
    patientSatisfaction: 4.6,
    teamCollaboration: 4.3,
    clinicalSkills: 4.8,
    timeManagement: 4.4,
    documentation: 4.4,
    strengths: ["Diagnostic accuracy", "Patient education", "Complex case management"],
    areasForImprovement: ["Team communication", "Documentation timeliness"],
    goals: ["Improve documentation workflow", "Lead department case reviews", "Complete advanced certification"],
  },
  {
    id: 3,
    staffName: "Emma Rodriguez",
    staffId: "3",
    staffAvatar: "",
    staffInitials: "ER",
    department: "Nursing",
    role: "Head Nurse",
    reviewDate: "2023-04-10",
    reviewPeriod: "Q1 2023",
    overallRating: 4.7,
    reviewStatus: "Completed",
    reviewedBy: "Dr. Sarah Johnson",
    patientSatisfaction: 4.8,
    teamCollaboration: 4.9,
    clinicalSkills: 4.6,
    timeManagement: 4.7,
    documentation: 4.5,
    strengths: ["Team leadership", "Patient care", "Staff mentoring"],
    areasForImprovement: ["Work delegation", "Self-care and burnout prevention"],
    goals: ["Implement new nursing protocols", "Complete leadership training", "Improve department efficiency"],
  },
  {
    id: 4,
    staffName: "Robert Davis",
    staffId: "4",
    staffAvatar: "",
    staffInitials: "RD",
    department: "Laboratory",
    role: "Lab Technician",
    reviewDate: "",
    reviewPeriod: "Q1 2023",
    overallRating: 0,
    reviewStatus: "Pending",
    reviewedBy: "",
    patientSatisfaction: 0,
    teamCollaboration: 0,
    clinicalSkills: 0,
    timeManagement: 0,
    documentation: 0,
    strengths: [],
    areasForImprovement: [],
    goals: [],
  },
  {
    id: 5,
    staffName: "Jennifer Kim",
    staffId: "5",
    staffAvatar: "",
    staffInitials: "JK",
    department: "Pharmacy",
    role: "Pharmacist",
    reviewDate: "2023-04-05",
    reviewPeriod: "Q1 2023",
    overallRating: 4.3,
    reviewStatus: "Completed",
    reviewedBy: "David Wilson",
    patientSatisfaction: 4.5,
    teamCollaboration: 4.2,
    clinicalSkills: 4.6,
    timeManagement: 4.0,
    documentation: 4.2,
    strengths: ["Medication knowledge", "Patient counseling", "Attention to detail"],
    areasForImprovement: ["Workflow efficiency", "Interdepartmental communication"],
    goals: ["Implement new inventory system", "Complete continuing education", "Improve patient wait times"],
  },
]

// Mock data for patient feedback
const patientFeedback = [
  {
    id: 1,
    staffName: "Dr. Sarah Johnson",
    staffId: "1",
    patientName: "John Smith",
    date: "2023-03-28",
    rating: 5,
    comment:
      "Dr. Johnson was extremely thorough and took the time to explain my condition and treatment options. I felt very well cared for.",
    category: "Care Quality",
  },
  {
    id: 2,
    staffName: "Dr. Sarah Johnson",
    staffId: "1",
    patientName: "Mary Williams",
    date: "2023-03-15",
    rating: 5,
    comment: "Excellent doctor who really listens. She answered all my questions and made me feel comfortable.",
    category: "Communication",
  },
  {
    id: 3,
    staffName: "Dr. Michael Chen",
    staffId: "2",
    patientName: "Robert Brown",
    date: "2023-03-22",
    rating: 4,
    comment: "Dr. Chen was knowledgeable and professional. The wait time was a bit long, but the care was worth it.",
    category: "Care Quality",
  },
  {
    id: 4,
    staffName: "Emma Rodriguez",
    staffId: "3",
    patientName: "Sarah Johnson",
    date: "2023-03-18",
    rating: 5,
    comment: "Nurse Rodriguez was compassionate and efficient. She made a stressful situation much easier to handle.",
    category: "Patient Support",
  },
  {
    id: 5,
    staffName: "Jennifer Kim",
    staffId: "5",
    patientName: "David Lee",
    date: "2023-03-25",
    rating: 4,
    comment: "The pharmacist was very helpful in explaining my medications and potential side effects.",
    category: "Medication Information",
  },
]

export default function StaffPerformancePage() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild className="h-8 w-8">
          <Link href="/staff">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Staff Performance</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4.6</div>
            <p className="text-xs text-muted-foreground">Out of 5.0 across all staff</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reviews Completed</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {performanceReviews.filter((review) => review.reviewStatus === "Completed").length}
            </div>
            <p className="text-xs text-muted-foreground">Out of {performanceReviews.length} total reviews</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Patient Satisfaction</CardTitle>
            <ThumbsUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4.7</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-500">↑ 0.3</span> from previous period
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Feedback Received</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patientFeedback.length}</div>
            <p className="text-xs text-muted-foreground">Patient comments this period</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder="Search staff..." className="w-[200px] pl-8 md:w-[300px]" />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Review
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Performance Review</DialogTitle>
                  <DialogDescription>Complete a new performance review for a staff member.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="staff-member">Staff Member</Label>
                    <select
                      id="staff-member"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Select staff member</option>
                      {performanceReviews.map((review) => (
                        <option key={review.staffId} value={review.staffId}>
                          {review.staffName} - {review.role}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="review-period">Review Period</Label>
                    <select
                      id="review-period"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="Q1 2023">Q1 2023 (Jan-Mar)</option>
                      <option value="Q2 2023">Q2 2023 (Apr-Jun)</option>
                      <option value="Q3 2023">Q3 2023 (Jul-Sep)</option>
                      <option value="Q4 2023">Q4 2023 (Oct-Dec)</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="review-date">Review Date</Label>
                      <Input id="review-date" type="date" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="reviewer">Reviewer</Label>
                      <Input id="reviewer" placeholder="Enter reviewer name" />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Performance Ratings</Label>
                    <div className="grid gap-4 rounded-md border p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="patient-satisfaction">Patient Satisfaction</Label>
                          <select
                            id="patient-satisfaction"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="">Select rating</option>
                            <option value="5">5 - Excellent</option>
                            <option value="4">4 - Very Good</option>
                            <option value="3">3 - Good</option>
                            <option value="2">2 - Fair</option>
                            <option value="1">1 - Poor</option>
                          </select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="team-collaboration">Team Collaboration</Label>
                          <select
                            id="team-collaboration"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="">Select rating</option>
                            <option value="5">5 - Excellent</option>
                            <option value="4">4 - Very Good</option>
                            <option value="3">3 - Good</option>
                            <option value="2">2 - Fair</option>
                            <option value="1">1 - Poor</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="clinical-skills">Clinical Skills</Label>
                          <select
                            id="clinical-skills"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="">Select rating</option>
                            <option value="5">5 - Excellent</option>
                            <option value="4">4 - Very Good</option>
                            <option value="3">3 - Good</option>
                            <option value="2">2 - Fair</option>
                            <option value="1">1 - Poor</option>
                          </select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="time-management">Time Management</Label>
                          <select
                            id="time-management"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="">Select rating</option>
                            <option value="5">5 - Excellent</option>
                            <option value="4">4 - Very Good</option>
                            <option value="3">3 - Good</option>
                            <option value="2">2 - Fair</option>
                            <option value="1">1 - Poor</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="documentation">Documentation</Label>
                        <select
                          id="documentation"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="">Select rating</option>
                          <option value="5">5 - Excellent</option>
                          <option value="4">4 - Very Good</option>
                          <option value="3">3 - Good</option>
                          <option value="2">2 - Fair</option>
                          <option value="1">1 - Poor</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="strengths">Strengths</Label>
                    <Textarea
                      id="strengths"
                      placeholder="Enter key strengths and accomplishments"
                      className="min-h-[80px]"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="improvements">Areas for Improvement</Label>
                    <Textarea
                      id="improvements"
                      placeholder="Enter areas that need improvement"
                      className="min-h-[80px]"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="goals">Goals for Next Period</Label>
                    <Textarea
                      id="goals"
                      placeholder="Enter goals and objectives for the next review period"
                      className="min-h-[80px]"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline">Cancel</Button>
                  <Button>Save Review</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        <Tabs defaultValue="reviews" className="w-full">
          <TabsList>
            <TabsTrigger value="reviews">Performance Reviews</TabsTrigger>
            <TabsTrigger value="feedback">Patient Feedback</TabsTrigger>
            <TabsTrigger value="metrics">Key Metrics</TabsTrigger>
          </TabsList>
          <TabsContent value="reviews" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table className="whitespace-nowrap">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff</TableHead>
                      <TableHead>Review Period</TableHead>
                      <TableHead>Review Date</TableHead>
                      <TableHead>Overall Rating</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="whitespace-nowrap">
                    {performanceReviews.map((review) => (
                      <TableRow key={review.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={review.staffAvatar || "/user-2.png"} alt={review.staffName} />
                              <AvatarFallback>{review.staffInitials}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{review.staffName}</div>
                              <div className="text-xs text-muted-foreground">{review.role}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{review.reviewPeriod}</TableCell>
                        <TableCell>
                          {review.reviewDate ? new Date(review.reviewDate).toLocaleDateString() : "-"}
                        </TableCell>
                        <TableCell>
                          {review.reviewStatus === "Completed" ? (
                            <div className="flex items-center">
                              <span className="mr-2">{review.overallRating}</span>
                              <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-4 w-4 ${
                                      i < Math.floor(review.overallRating)
                                        ? "fill-yellow-400 text-yellow-400"
                                        : i < review.overallRating
                                          ? "fill-yellow-400 text-yellow-400 fill-opacity-50"
                                          : "text-gray-300"
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={review.reviewStatus === "Completed" ? "default" : "outline"}>
                            {review.reviewStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              {review.reviewStatus === "Completed" && (
                                <DropdownMenuItem>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                              )}
                              {review.reviewStatus === "Pending" && (
                                <DropdownMenuItem>
                                  <FileText className="mr-2 h-4 w-4" />
                                  Complete Review
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive focus:text-destructive">
                                <Trash className="mr-2 h-4 w-4" />
                                Delete
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
          <TabsContent value="feedback" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table className="whitespace-nowrap">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Comment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="whitespace-nowrap">
                    {patientFeedback.map((feedback) => (
                      <TableRow key={feedback.id}>
                        <TableCell>
                          <div className="font-medium">{feedback.staffName}</div>
                        </TableCell>
                        <TableCell>{feedback.patientName}</TableCell>
                        <TableCell>{new Date(feedback.date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < feedback.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{feedback.category}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{feedback.comment}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="metrics" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Department Performance</CardTitle>
                  <CardDescription>Average ratings by department</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Medical</span>
                        <span>4.7</span>
                      </div>
                      <div className="mt-2 h-2 w-full rounded-full bg-gray-100">
                        <div className="h-2 rounded-full bg-blue-600" style={{ width: "94%" }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Nursing</span>
                        <span>4.7</span>
                      </div>
                      <div className="mt-2 h-2 w-full rounded-full bg-gray-100">
                        <div className="h-2 rounded-full bg-green-600" style={{ width: "94%" }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Laboratory</span>
                        <span>4.5</span>
                      </div>
                      <div className="mt-2 h-2 w-full rounded-full bg-gray-100">
                        <div className="h-2 rounded-full bg-amber-600" style={{ width: "90%" }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Pharmacy</span>
                        <span>4.3</span>
                      </div>
                      <div className="mt-2 h-2 w-full rounded-full bg-gray-100">
                        <div className="h-2 rounded-full bg-red-600" style={{ width: "86%" }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Administration</span>
                        <span>4.4</span>
                      </div>
                      <div className="mt-2 h-2 w-full rounded-full bg-gray-100">
                        <div className="h-2 rounded-full bg-purple-600" style={{ width: "88%" }}></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                  <CardDescription>Key performance indicators</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Patient Satisfaction</span>
                        <div className="flex items-center">
                          <span className="mr-2">4.7</span>
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        </div>
                      </div>
                      <div className="mt-2 h-2 w-full rounded-full bg-gray-100">
                        <div className="h-2 rounded-full bg-blue-600" style={{ width: "94%" }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Team Collaboration</span>
                        <div className="flex items-center">
                          <span className="mr-2">4.5</span>
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        </div>
                      </div>
                      <div className="mt-2 h-2 w-full rounded-full bg-gray-100">
                        <div className="h-2 rounded-full bg-green-600" style={{ width: "90%" }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Clinical Skills</span>
                        <div className="flex items-center">
                          <span className="mr-2">4.7</span>
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        </div>
                      </div>
                      <div className="mt-2 h-2 w-full rounded-full bg-gray-100">
                        <div className="h-2 rounded-full bg-blue-600" style={{ width: "94%" }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Time Management</span>
                        <div className="flex items-center">
                          <span className="mr-2">4.4</span>
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        </div>
                      </div>
                      <div className="mt-2 h-2 w-full rounded-full bg-gray-100">
                        <div className="h-2 rounded-full bg-amber-600" style={{ width: "88%" }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Documentation</span>
                        <div className="flex items-center">
                          <span className="mr-2">4.5</span>
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        </div>
                      </div>
                      <div className="mt-2 h-2 w-full rounded-full bg-gray-100">
                        <div className="h-2 rounded-full bg-green-600" style={{ width: "90%" }}></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
