"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp, Bell, Calendar, Check, CheckCircle, ChevronRight, Clock, DollarSign, Download, FileText, Heart, Info, Mail, MapPin, MessageSquare, Phone, Star, ThumbsUp, User, Users, X, Pill, Bed, Package } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, LineChart, Pie, PieChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#ffc658"];

const patientAdmissionsData = [
  { month: "Jan", admissions: 120 },
  { month: "Feb", admissions: 135 },
  { month: "Mar", admissions: 150 },
  { month: "Apr", admissions: 165 },
  { month: "May", admissions: 180 },
  { month: "Jun", admissions: 195 },
  { month: "Jul", admissions: 210 },
  { month: "Aug", admissions: 225 },
  { month: "Sep", admissions: 240 },
  { month: "Oct", admissions: 255 },
  { month: "Nov", admissions: 270 },
  { month: "Dec", admissions: 285 },
];

const departmentData = [
  { name: "Cardiology", patients: 45 },
  { name: "Neurology", patients: 38 },
  { name: "Orthopedics", patients: 32 },
  { name: "Pediatrics", patients: 28 },
  { name: "Oncology", patients: 25 },
  { name: "Emergency", patients: 20 },
];

const revenueData = [
  { service: "Consultations", value: 100 },
  { service: "Diagnostics", value: 85 },
  { service: "Surgeries", value: 90 },
  { service: "Therapies", value: 75 },
  { service: "Medications", value: 80 },
  { service: "Emergency", value: 95 },
];

const appointmentStatusData = [
  { name: "Completed", value: 45 },
  { name: "Scheduled", value: 30 },
  { name: "Cancelled", value: 15 },
  { name: "No Show", value: 10 },
];

const financialData = [
  { month: "Jan", revenue: 120000, expenses: 80000 },
  { month: "Feb", revenue: 135000, expenses: 85000 },
  { month: "Mar", revenue: 150000, expenses: 90000 },
  { month: "Apr", revenue: 165000, expenses: 95000 },
  { month: "May", revenue: 180000, expenses: 100000 },
  { month: "Jun", revenue: 195000, expenses: 105000 },
];

const paymentData = [
  { name: "Credit Card", value: 45 },
  { name: "Insurance", value: 30 },
  { name: "Cash", value: 15 },
  { name: "Bank Transfer", value: 10 },
];

export default function WidgetsPage() {
  const [activeTab, setActiveTab] = useState("all");
  const ratingData = {
    average: 4.7,
    totalReviews: 1248,
    distribution: [
      { stars: 5, percentage: 76 },
      { stars: 4, percentage: 18 },
      { stars: 3, percentage: 4 },
      { stars: 2, percentage: 1 },
      { stars: 1, percentage: 1 },
    ],
  };
  return (
    <div className="container mx-auto">
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Widgets</h2>
          <p className="text-muted-foreground">A collection of UI components and widgets for building dashboards and interfaces.</p>
        </div>

        <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="charts">Charts</TabsTrigger>
            <TabsTrigger value="cards">Cards</TabsTrigger>
            <TabsTrigger value="stats">Stats</TabsTrigger>
            <TabsTrigger value="misc">Misc</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-8 mt-6">
            {/* Stats Section */}
            <section className="space-y-4">
              <h3 className="text-2xl font-semibold">Statistics Cards</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Stat Card 1 */}
                <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/50 border-blue-500/30  transition-all duration-300">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-blue-600">Total Patients</CardTitle>
                    <div className="p-2 rounded-full bg-blue-100">
                      <Users className="size-7 text-blue-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-600">2,853</div>
                    <p className="text-xs text-blue-500 mt-1">+18.2% from last month</p>
                  </CardContent>
                </Card>

                {/* Stat Card 2 */}
                <Card className="bg-gradient-to-br from-green-500/10 to-green-500/50 border-green-500/30  transition-all duration-300">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-green-600">New Appointments</CardTitle>
                    <div className="p-2 rounded-full bg-green-100">
                      <Calendar className="size-7 text-green-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600">148</div>
                    <p className="text-xs text-green-500 mt-1">+4.3% from yesterday</p>
                  </CardContent>
                </Card>

                {/* Stat Card 3 */}
                <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/50 border-purple-500/30  transition-all duration-300">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-purple-600">Revenue</CardTitle>
                    <div className="p-2 rounded-full bg-purple-100">
                      <DollarSign className="size-7 text-purple-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl text-purple-600 font-bold ">$24,563</div>
                    <p className="text-xs text-purple-500 mt-1">+10.5% from last week</p>
                  </CardContent>
                </Card>

                {/* Stat Card 4 */}
                <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/50 border-amber-500/30  transition-all duration-300">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-amber-600">Active Doctors</CardTitle>
                    <div className="p-2 rounded-full bg-amber-100">
                      <User className="size-7 text-amber-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-amber-600">32</div>
                    <p className="text-xs text-amber-500 mt-1">+2 new this month</p>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Progress Section */}
            <section className="space-y-4">
              <h3 className="text-2xl font-semibold">Progress Indicators</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Progress Card 1 */}
                <Card>
                  <CardHeader>
                    <CardTitle>Department Capacity</CardTitle>
                    <CardDescription>Current patient load by department</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">Cardiology</div>
                        <div className="text-sm text-muted-foreground">78%</div>
                      </div>
                      <Progress value={78} className="h-2 [&>*]:bg-green-500" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">Neurology</div>
                        <div className="text-sm text-muted-foreground">63%</div>
                      </div>
                      <Progress value={63} className="h-2 [&>*]:bg-green-500" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">Pediatrics</div>
                        <div className="text-sm text-muted-foreground">92%</div>
                      </div>
                      <Progress value={92} className="h-2 [&>*]:bg-green-500" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">Orthopedics</div>
                        <div className="text-sm text-muted-foreground">45%</div>
                      </div>
                      <Progress value={45} className="h-2 [&>*]:bg-green-500" />
                    </div>
                  </CardContent>
                </Card>

                {/* Circular Progress */}
                <Card>
                  <CardHeader>
                    <CardTitle>Treatment Progress</CardTitle>
                    <CardDescription>Patient recovery tracking</CardDescription>
                  </CardHeader>
                  <CardContent className="flex justify-around">
                    <div className="flex flex-col items-center">
                      <div className="relative size-32">
                        <svg className="size-32" viewBox="0 0 100 100">
                          <circle className="text-muted-foreground/20 stroke-current" strokeWidth="10" cx="50" cy="50" r="40" fill="transparent" />
                          <circle className="text-primary stroke-current" strokeWidth="10" strokeLinecap="round" cx="50" cy="50" r="40" fill="transparent" strokeDasharray="251.2" strokeDashoffset="50.24" transform="rotate(-90 50 50)" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center text-lg font-bold">80%</div>
                      </div>
                      <span className="mt-2 text-sm font-medium">Physical</span>
                    </div>

                    <div className="flex flex-col items-center">
                      <div className="relative size-32">
                        <svg className="size-32" viewBox="0 0 100 100">
                          <circle className="text-muted-foreground/20 stroke-current" strokeWidth="10" cx="50" cy="50" r="40" fill="transparent" />
                          <circle className="text-blue-500 stroke-current" strokeWidth="10" strokeLinecap="round" cx="50" cy="50" r="40" fill="transparent" strokeDasharray="251.2" strokeDashoffset="125.6" transform="rotate(-90 50 50)" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center text-lg font-bold">50%</div>
                      </div>
                      <span className="mt-2 text-sm font-medium">Mental</span>
                    </div>

                    <div className="flex flex-col items-center">
                      <div className="relative size-32">
                        <svg className="size-32" viewBox="0 0 100 100">
                          <circle className="text-muted-foreground/20 stroke-current" strokeWidth="10" cx="50" cy="50" r="40" fill="transparent" />
                          <circle className="text-green-500 stroke-current" strokeWidth="10" strokeLinecap="round" cx="50" cy="50" r="40" fill="transparent" strokeDasharray="251.2" strokeDashoffset="75.36" transform="rotate(-90 50 50)" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center text-lg font-bold">70%</div>
                      </div>
                      <span className="mt-2 text-sm font-medium">Overall</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Charts Section */}
            <section className="space-y-4">
              <h3 className="text-2xl font-semibold">Charts</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Chart Card 1 */}
                <Card>
                  <CardHeader>
                    <CardTitle>Patient Admissions</CardTitle>
                    <CardDescription>Monthly trend for the current year</CardDescription>
                  </CardHeader>
                  <CardContent className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={patientAdmissionsData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="admissions" fill="#8884d8" barSize={20} />
                        <Line type="monotone" dataKey="admissions" stroke="#ff7300" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Chart Card 2 */}
                <Card>
                  <CardHeader>
                    <CardTitle>Department Distribution</CardTitle>
                    <CardDescription>Patient distribution by department</CardDescription>
                  </CardHeader>
                  <CardContent className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={departmentData} dataKey="patients" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                          {departmentData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Reviews Section */}
            <section className="space-y-4">
              <h3 className="text-2xl font-semibold">Reviews & Ratings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Reviews Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Patient Reviews</CardTitle>
                    <CardDescription>Latest feedback from patients</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 ">
                    <div className="space-y-4">
                      <div className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src="/abstract-jr.png" alt="Patient" />
                              <AvatarFallback>JP</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">John Peterson</p>
                              <p className="text-xs text-muted-foreground">2 days ago</p>
                            </div>
                          </div>
                          <div className="flex text-amber-500">
                            <Star className="h-4 w-4 fill-current" />
                            <Star className="h-4 w-4 fill-current" />
                            <Star className="h-4 w-4 fill-current" />
                            <Star className="h-4 w-4 fill-current" />
                            <Star className="h-4 w-4" />
                          </div>
                        </div>
                        <p className="mt-2 text-sm">Dr. Smith was very professional and took the time to explain my condition thoroughly. The staff was also very friendly and helpful.</p>
                      </div>

                      <div className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src="/abstract-dl.png" alt="Patient" />
                              <AvatarFallback>SR</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">Sarah Rodriguez</p>
                              <p className="text-xs text-muted-foreground">5 days ago</p>
                            </div>
                          </div>
                          <div className="flex text-amber-500">
                            <Star className="h-4 w-4 fill-current" />
                            <Star className="h-4 w-4 fill-current" />
                            <Star className="h-4 w-4 fill-current" />
                            <Star className="h-4 w-4 fill-current" />
                            <Star className="h-4 w-4 fill-current" />
                          </div>
                        </div>
                        <p className="mt-2 text-sm">Excellent care from the entire team. The new facility is impressive and the wait time was minimal. Highly recommend this clinic!</p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" className="w-full">
                      View All Reviews
                    </Button>
                  </CardFooter>
                </Card>

                {/* Rating Summary Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>Rating Summary</CardTitle>
                    <CardDescription>Overall clinic performance</CardDescription>
                  </CardHeader>
                  <CardContent className=" rounded-lg shadow-md mx-auto">
                    {/* Summary Section */}
                    <div className="space-y-4 mb-6">
                      <div className="flex items-center mb-2">
                        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                          <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${ratingData.distribution.reduce((sum, item) => sum + (item.stars >= 4 ? item.percentage : 0), 0)}%` }}></div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{ratingData.distribution.reduce((sum, item) => sum + (item.stars >= 4 ? item.percentage : 0), 0)}% Positive</p>
                          <p className="text-sm text-gray-500">4-5 star ratings</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{ratingData.distribution.reduce((sum, item) => sum + (item.stars <= 3 ? item.percentage : 0), 0)}% Critical</p>
                          <p className="text-sm text-gray-500">1-3 star ratings</p>
                        </div>
                      </div>
                    </div>

                    {/* Detailed Breakdown */}
                    <div className="space-y-3 border-t pt-4">
                      <h3 className="font-medium mb-3">Rating Breakdown</h3>
                      {ratingData.distribution.map((item) => (
                        <div key={item.stars} className="flex items-center gap-2">
                          <div className="w-12 text-sm font-medium">{item.stars} stars</div>
                          <div className="flex-1">
                            <div className="bg-gray-200 dark:bg-gray-800 rounded-full h-2">
                              <div className={`h-2 rounded-full ${item.stars >= 4 ? "bg-green-500" : item.stars === 3 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${item.percentage}%` }}></div>
                            </div>
                          </div>
                          <div className="w-12 text-sm text-right font-medium">{item.percentage}%</div>
                        </div>
                      ))}
                      <p className="text-xs text-gray-500 pt-2 italic">Most customers are highly satisfied with our product</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Timeline Section */}
            <section className="space-y-4">
              <h3 className="text-2xl font-semibold">Timeline</h3>
              <div className="grid grid-cols-1 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Patient Treatment Timeline</CardTitle>
                    <CardDescription>Recent treatment history</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="relative border-l pl-6 ml-3 space-y-6">
                      <div className="relative">
                        <div className="absolute -left-8 mt-1.5 h-4 w-4 rounded-full border border-primary bg-background"></div>
                        <div className="flex flex-col">
                          <h4 className="text-base font-semibold">Initial Consultation</h4>
                          <p className="text-xs text-muted-foreground">Today, 9:30 AM</p>
                          <p className="mt-2 text-sm">Patient reported symptoms of persistent headache and dizziness. Blood pressure was elevated at 140/90.</p>
                        </div>
                      </div>

                      <div className="relative">
                        <div className="absolute -left-8 mt-1.5 h-4 w-4 rounded-full border border-primary bg-primary"></div>
                        <div className="flex flex-col">
                          <h4 className="text-base font-semibold">MRI Scan</h4>
                          <p className="text-xs text-muted-foreground">Yesterday, 2:15 PM</p>
                          <p className="mt-2 text-sm">MRI scan of the brain was performed. Results pending review by the radiologist.</p>
                        </div>
                      </div>

                      <div className="relative">
                        <div className="absolute -left-8 mt-1.5 h-4 w-4 rounded-full border border-primary bg-primary"></div>
                        <div className="flex flex-col">
                          <h4 className="text-base font-semibold">Blood Tests</h4>
                          <p className="text-xs text-muted-foreground">3 days ago, 11:00 AM</p>
                          <p className="mt-2 text-sm">Complete blood count and metabolic panel were ordered. Results showed slightly elevated white blood cell count.</p>
                        </div>
                      </div>

                      <div className="relative">
                        <div className="absolute -left-8 mt-1.5 h-4 w-4 rounded-full border border-primary bg-primary"></div>
                        <div className="flex flex-col">
                          <h4 className="text-base font-semibold">Medication Prescribed</h4>
                          <p className="text-xs text-muted-foreground">1 week ago, 4:45 PM</p>
                          <p className="mt-2 text-sm">Prescribed Lisinopril 10mg daily for hypertension. Patient advised to monitor blood pressure daily.</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" className="w-full">
                      View Complete History
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </section>

            {/* Team Cards Section */}
            <section className="space-y-4">
              <h3 className="text-2xl font-semibold">Team Cards</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Team Member Card 1 */}
                <Card>
                  <CardHeader className="text-center">
                    <div className="flex justify-center">
                      <Avatar className="h-24 w-24">
                        <AvatarImage src="/medical-professional-profile.png" alt="Dr. Jennifer Wilson" />
                        <AvatarFallback>JW</AvatarFallback>
                      </Avatar>
                    </div>
                    <CardTitle className="mt-4">Dr. Jennifer Wilson</CardTitle>
                    <CardDescription>Chief of Cardiology</CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    <div className="flex justify-center space-x-4 text-muted-foreground">
                      <Mail className="h-5 w-5" />
                      <Phone className="h-5 w-5" />
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Patients</span>
                        <span className="font-medium">248</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Experience</span>
                        <span className="font-medium">15 years</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Rating</span>
                        <span className="font-medium flex items-center">
                          4.9 <Star className="h-3 w-3 fill-amber-500 text-amber-500 ml-1" />
                        </span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" className="w-full">
                      View Profile
                    </Button>
                  </CardFooter>
                </Card>

                {/* Team Member Card 2 */}
                <Card>
                  <CardHeader className="text-center">
                    <div className="flex justify-center">
                      <Avatar className="h-24 w-24">
                        <AvatarImage src="/thoughtful-artist.png" alt="Dr. Michael Chen" />
                        <AvatarFallback>MC</AvatarFallback>
                      </Avatar>
                    </div>
                    <CardTitle className="mt-4">Dr. Michael Chen</CardTitle>
                    <CardDescription>Neurosurgeon</CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    <div className="flex justify-center space-x-4 text-muted-foreground">
                      <Mail className="h-5 w-5" />
                      <Phone className="h-5 w-5" />
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Patients</span>
                        <span className="font-medium">187</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Experience</span>
                        <span className="font-medium">12 years</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Rating</span>
                        <span className="font-medium flex items-center">
                          4.8 <Star className="h-3 w-3 fill-amber-500 text-amber-500 ml-1" />
                        </span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" className="w-full">
                      View Profile
                    </Button>
                  </CardFooter>
                </Card>

                {/* Team Member Card 3 */}
                <Card>
                  <CardHeader className="text-center">
                    <div className="flex justify-center">
                      <Avatar className="h-24 w-24">
                        <AvatarImage src="/contemplative-artist.png" alt="Dr. Sarah Johnson" />
                        <AvatarFallback>SJ</AvatarFallback>
                      </Avatar>
                    </div>
                    <CardTitle className="mt-4">Dr. Sarah Johnson</CardTitle>
                    <CardDescription>Pediatrician</CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    <div className="flex justify-center space-x-4 text-muted-foreground">
                      <Mail className="h-5 w-5" />
                      <Phone className="h-5 w-5" />
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Patients</span>
                        <span className="font-medium">312</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Experience</span>
                        <span className="font-medium">8 years</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Rating</span>
                        <span className="font-medium flex items-center">
                          4.7 <Star className="h-3 w-3 fill-amber-500 text-amber-500 ml-1" />
                        </span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" className="w-full">
                      View Profile
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </section>

            {/* Comments Section */}
            <section className="space-y-4">
              <h3 className="text-2xl font-semibold">Comments</h3>
              <div className="grid grid-cols-1 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Discussion Thread</CardTitle>
                    <CardDescription>Case #2458 - Patient consultation notes</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <div className="flex gap-4">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src="/medical-professional-profile.png" alt="Dr. Wilson" />
                          <AvatarFallback>JW</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium">Dr. Jennifer Wilson</span>
                              <span className="text-xs text-muted-foreground ml-2">Cardiology</span>
                            </div>
                            <span className="text-xs text-muted-foreground">2 hours ago</span>
                          </div>
                          <p className="text-sm">Patient shows signs of mitral valve regurgitation. Echocardiogram confirms moderate severity. Recommending medication management with follow-up in 3 months.</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                            <button className="flex items-center gap-1">
                              <ThumbsUp className="h-3 w-3" /> Like
                            </button>
                            <button className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" /> Reply
                            </button>
                            <button className="flex items-center gap-1">
                              <Bell className="h-3 w-3" /> Subscribe
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-4 pl-14">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src="/thoughtful-artist.png" alt="Dr. Chen" />
                          <AvatarFallback>MC</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium">Dr. Michael Chen</span>
                              <span className="text-xs text-muted-foreground ml-2">Neurology</span>
                            </div>
                            <span className="text-xs text-muted-foreground">1 hour ago</span>
                          </div>
                          <p className="text-sm">I noticed the patient also reported occasional headaches. Could be unrelated, but worth monitoring given their hypertension history.</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                            <button className="flex items-center gap-1">
                              <ThumbsUp className="h-3 w-3" /> Like
                            </button>
                            <button className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" /> Reply
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src="/abstract-jr.png" alt="Current User" />
                        <AvatarFallback>ME</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <Textarea placeholder="Add your comment..." className="resize-none" />
                        <div className="flex justify-end mt-2">
                          <Button size="sm">Post Comment</Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* FAQ Section */}
            <section className="space-y-4">
              <h3 className="text-2xl font-semibold">FAQ Accordion</h3>
              <div className="grid grid-cols-1 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Frequently Asked Questions</CardTitle>
                    <CardDescription>Common questions about our services</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="item-1">
                        <AccordionTrigger>What insurance plans do you accept?</AccordionTrigger>
                        <AccordionContent>We accept most major insurance plans including Medicare, Blue Cross Blue Shield, Aetna, Cigna, and UnitedHealthcare. Please contact our billing department for specific questions about your coverage.</AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="item-2">
                        <AccordionTrigger>How do I schedule an appointment?</AccordionTrigger>
                        <AccordionContent>You can schedule an appointment by calling our office during business hours, using our online patient portal, or through our mobile app. New patients will need to create an account and fill out some initial paperwork.</AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="item-3">
                        <AccordionTrigger>What should I bring to my first appointment?</AccordionTrigger>
                        <AccordionContent>Please bring your insurance card, a valid photo ID, a list of current medications, your medical history, and any relevant medical records or test results. Arriving 15 minutes early to complete paperwork is recommended.</AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="item-4">
                        <AccordionTrigger>How do I access my medical records?</AccordionTrigger>
                        <AccordionContent>You can access your medical records through our secure patient portal. If you need assistance, please contact our medical records department at (555) 123-4567 or email records@clinicname.com.</AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="item-5">
                        <AccordionTrigger>What are your hours of operation?</AccordionTrigger>
                        <AccordionContent>Our clinic is open Monday through Friday from 8:00 AM to 6:00 PM, and Saturday from 9:00 AM to 1:00 PM. We are closed on Sundays and major holidays. Emergency services are available 24/7.</AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Alert Cards Section */}
            <section className="space-y-4">
              <h3 className="text-2xl font-semibold">Alert Cards</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Success Alert */}
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-400">Appointment Confirmed</h3>
                      <div className="mt-2 text-sm text-green-400">
                        <p>Your appointment with Dr. Wilson has been confirmed for Monday, June 12 at 10:30 AM.</p>
                      </div>
                      <div className="mt-4">
                        <div className="-mx-2 -my-1.5 flex">
                          <button className="px-2 py-1.5 rounded-md text-sm font-medium text-green-500 hover:bg-green-100">View Details</button>
                          <button className="ml-3 px-2 py-1.5 rounded-md text-sm font-medium text-green-500 hover:bg-green-100">Dismiss</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Warning Alert */}
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <Info className="h-5 w-5 text-amber-500" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-amber-400">Prescription Expiring</h3>
                      <div className="mt-2 text-sm text-amber-400">
                        <p>Your prescription for Lisinopril will expire in 7 days. Please schedule a follow-up appointment for renewal.</p>
                      </div>
                      <div className="mt-4">
                        <div className="-mx-2 -my-1.5 flex">
                          <button className="px-2 py-1.5 rounded-md text-sm font-medium text-amber-400 hover:bg-amber-100">Schedule Now</button>
                          <button className="ml-3 px-2 py-1.5 rounded-md text-sm font-medium text-amber-400 hover:bg-amber-100">Remind Later</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Error Alert */}
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <X className="h-5 w-5 text-red-500" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-400">Payment Failed</h3>
                      <div className="mt-2 text-sm text-red-400">
                        <p>Your recent payment for Invoice #12345 was declined. Please update your payment information.</p>
                      </div>
                      <div className="mt-4">
                        <div className="-mx-2 -my-1.5 flex">
                          <button className="px-2 py-1.5 rounded-md text-sm font-medium text-red-400 hover:bg-red-100">Update Payment</button>
                          <button className="ml-3 px-2 py-1.5 rounded-md text-sm font-medium text-red-400 hover:bg-red-100">Contact Billing</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Info Alert */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <Info className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-400">System Maintenance</h3>
                      <div className="mt-2 text-sm text-blue-400">
                        <p>The patient portal will be unavailable for scheduled maintenance on Sunday, June 18 from 2:00 AM to 5:00 AM.</p>
                      </div>
                      <div className="mt-4">
                        <div className="-mx-2 -my-1.5 flex">
                          <button className="px-2 py-1.5 rounded-md text-sm font-medium text-blue-400 hover:bg-blue-100">Learn More</button>
                          <button className="ml-3 px-2 py-1.5 rounded-md text-sm font-medium text-blue-400 hover:bg-blue-100">Dismiss</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Calendar Widget */}
            <section className="space-y-4">
              <h3 className="text-2xl font-semibold">Calendar Widget</h3>
              <div className="grid grid-cols-1 gap-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>June 2023</CardTitle>
                      <div className="flex gap-1">
                        <Button variant="outline" size="icon" className="h-8 w-8 p-0">
                          <ChevronRight className="h-4 w-4 rotate-180" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8 p-0">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-7 gap-2 text-center text-sm">
                      <div className="text-muted-foreground">Sun</div>
                      <div className="text-muted-foreground">Mon</div>
                      <div className="text-muted-foreground">Tue</div>
                      <div className="text-muted-foreground">Wed</div>
                      <div className="text-muted-foreground">Thu</div>
                      <div className="text-muted-foreground">Fri</div>
                      <div className="text-muted-foreground">Sat</div>

                      <div className="text-muted-foreground py-2">28</div>
                      <div className="text-muted-foreground py-2">29</div>
                      <div className="text-muted-foreground py-2">30</div>
                      <div className="text-muted-foreground py-2">31</div>
                      <div className="py-2">1</div>
                      <div className="py-2">2</div>
                      <div className="py-2">3</div>

                      <div className="py-2">4</div>
                      <div className="py-2">5</div>
                      <div className="py-2">6</div>
                      <div className="py-2">7</div>
                      <div className="py-2">8</div>
                      <div className="py-2">9</div>
                      <div className="py-2">10</div>

                      <div className="py-2">11</div>
                      <div className="relative py-2">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-7 h-7 bg-primary rounded-full text-primary-foreground flex items-center justify-center">12</div>
                      </div>
                      <div className="py-2 relative">
                        13
                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 bg-blue-500 rounded-full"></div>
                      </div>
                      <div className="py-2">14</div>
                      <div className="py-2 relative">
                        15
                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 bg-green-500 rounded-full"></div>
                      </div>
                      <div className="py-2">16</div>
                      <div className="py-2">17</div>

                      <div className="py-2">18</div>
                      <div className="py-2">19</div>
                      <div className="py-2 relative">
                        20
                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 bg-red-500 rounded-full"></div>
                      </div>
                      <div className="py-2">21</div>
                      <div className="py-2">22</div>
                      <div className="py-2 relative">
                        23
                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 bg-blue-500 rounded-full"></div>
                      </div>
                      <div className="py-2">24</div>

                      <div className="py-2">25</div>
                      <div className="py-2">26</div>
                      <div className="py-2">27</div>
                      <div className="py-2">28</div>
                      <div className="py-2">29</div>
                      <div className="py-2">30</div>
                      <div className="text-muted-foreground py-2">1</div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <div className="w-full space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                        <span className="text-sm">Doctor Appointment</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-green-500"></div>
                        <span className="text-sm">Lab Test</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-red-500"></div>
                        <span className="text-sm">Surgery</span>
                      </div>
                    </div>
                  </CardFooter>
                </Card>
              </div>
            </section>

            {/* Quick Action Cards */}
            <section className="space-y-4">
              <h3 className="text-2xl font-semibold">Quick Action Cards</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-blue-500/10 border-blue-500/30">
                  <CardContent className="p-6 flex flex-col items-center text-center">
                    <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-600 mb-4">
                      <Calendar className="h-6 w-6" />
                    </div>
                    <h3 className="font-medium text-blue-400">Schedule Appointment</h3>
                    <p className="text-sm text-blue-400 mt-1 mb-4">Book a new appointment with a doctor</p>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white">Book Now</Button>
                  </CardContent>
                </Card>

                <Card className="bg-green-500/10 border-green-500/30">
                  <CardContent className="p-6 flex flex-col items-center text-center">
                    <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center text-green-600 mb-4">
                      <FileText className="h-6 w-6" />
                    </div>
                    <h3 className="font-medium text-green-500">Request Records</h3>
                    <p className="text-sm text-green-500 mt-1 mb-4">Request your medical records</p>
                    <Button className="bg-green-600 hover:bg-green-700 text-white">Request</Button>
                  </CardContent>
                </Card>

                <Card className="bg-purple-500/10 border-purple-500/30">
                  <CardContent className="p-6 flex flex-col items-center text-center">
                    <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-600 mb-4">
                      <Pill className="h-6 w-6" />
                    </div>
                    <h3 className="font-medium text-purple-400">Refill Prescription</h3>
                    <p className="text-sm text-purple-400 mt-1 mb-4">Request a prescription refill</p>
                    <Button className="bg-purple-600 hover:bg-purple-700 text-white">Refill</Button>
                  </CardContent>
                </Card>

                <Card className="bg-amber-500/10 border-amber-500/30">
                  <CardContent className="p-6 flex flex-col items-center text-center">
                    <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-600 mb-4">
                      <MessageSquare className="h-6 w-6" />
                    </div>
                    <h3 className="font-medium text-amber-400">Message Doctor</h3>
                    <p className="text-sm text-amber-400 mt-1 mb-4">Send a message to your doctor</p>
                    <Button className="bg-amber-600 hover:bg-amber-700 text-white">Message</Button>
                  </CardContent>
                </Card>
              </div>
            </section>
          </TabsContent>

          <TabsContent value="charts" className="space-y-8 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Patient Admissions</CardTitle>
                  <CardDescription>Monthly trend for the current year</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={patientAdmissionsData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="admissions" stroke="#8884d8" activeDot={{ r: 8 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Department Distribution</CardTitle>
                  <CardDescription>Patient distribution by department</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={departmentData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="patients" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Revenue by Service</CardTitle>
                  <CardDescription>Revenue breakdown by service category</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={revenueData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="service" />
                      <PolarRadiusAxis />
                      <Radar name="Revenue" dataKey="value" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Appointment Status</CardTitle>
                  <CardDescription>Distribution of appointment statuses</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={appointmentStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
                        {appointmentStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Monthly Financial Comparison</CardTitle>
                  <CardDescription>Revenue vs Expenses by month</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={financialData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="revenue" fill="#8884d8" />
                      <Line type="monotone" dataKey="expenses" stroke="#ff7300" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payment Methods</CardTitle>
                  <CardDescription>Revenue by payment method</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={paymentData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" label>
                        {paymentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="cards" className="space-y-8 mt-6">
            {/* Cards content will go here */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Team Member Card */}
              <Card>
                <CardHeader className="text-center">
                  <div className="flex justify-center">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src="/medical-professional-profile.png" alt="Dr. Jennifer Wilson" />
                      <AvatarFallback>JW</AvatarFallback>
                    </Avatar>
                  </div>
                  <CardTitle className="mt-4">Dr. Jennifer Wilson</CardTitle>
                  <CardDescription>Chief of Cardiology</CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="flex justify-center space-x-4 text-muted-foreground">
                    <Mail className="h-5 w-5" />
                    <Phone className="h-5 w-5" />
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Patients</span>
                      <span className="font-medium">248</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Experience</span>
                      <span className="font-medium">15 years</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Rating</span>
                      <span className="font-medium flex items-center">
                        4.9 <Star className="h-3 w-3 fill-amber-500 text-amber-500 ml-1" />
                      </span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full">
                    View Profile
                  </Button>
                </CardFooter>
              </Card>

              {/* Patient Card */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src="/abstract-jr.png" alt="John Doe" />
                        <AvatarFallback>JD</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base">John Doe</CardTitle>
                        <CardDescription>Patient ID: P-12345</CardDescription>
                      </div>
                    </div>
                    <Badge>Active</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">Age</div>
                    <div>42 years</div>
                    <div className="text-muted-foreground">Gender</div>
                    <div>Male</div>
                    <div className="text-muted-foreground">Blood Type</div>
                    <div>O+</div>
                    <div className="text-muted-foreground">Primary Doctor</div>
                    <div>Dr. Wilson</div>
                  </div>
                  <Separator />
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Upcoming Appointment</div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>June 15, 2023</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>10:30 AM</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <FileText className="h-4 w-4 mr-2" /> Records
                  </Button>
                  <Button size="sm" className="flex-1">
                    <MessageSquare className="h-4 w-4 mr-2" /> Contact
                  </Button>
                </CardFooter>
              </Card>

              {/* Appointment Card */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base">Upcoming Appointment</CardTitle>
                    <Badge variant="outline" className="text-blue-500 border-blue-200 bg-blue-50">
                      Confirmed
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src="/medical-professional-profile.png" alt="Dr. Wilson" />
                      <AvatarFallback>JW</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">Dr. Jennifer Wilson</div>
                      <div className="text-sm text-muted-foreground">Cardiology</div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Monday, June 12, 2023</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>10:30 AM - 11:15 AM</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>Main Clinic, Room 305</span>
                    </div>
                  </div>
                  <div className="text-sm">
                    <div className="font-medium">Reason for Visit</div>
                    <div className="text-muted-foreground">Follow-up consultation for hypertension</div>
                  </div>
                </CardContent>
                <CardFooter className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    Reschedule
                  </Button>
                  <Button variant="destructive" size="sm" className="flex-1">
                    Cancel
                  </Button>
                </CardFooter>
              </Card>

              {/* Quick Action Card */}
              <Card className="bg-blue-500/10 border-blue-500/30 flex items-center justify-center">
                <CardContent className="p-6 flex flex-col items-center text-center">
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-4">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <h3 className="font-medium text-blue-700">Schedule Appointment</h3>
                  <p className="text-sm text-blue-700 mt-1 mb-4">Book a new appointment with a doctor</p>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">Book Now</Button>
                </CardContent>
              </Card>

              {/* Medical Record Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Medical Record</CardTitle>
                  <CardDescription>Last updated: June 5, 2023</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Diagnosis</div>
                    <div className="text-sm">Essential (primary) hypertension</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Medications</div>
                    <div className="text-sm">Lisinopril 10mg daily</div>
                    <div className="text-sm">Amlodipine 5mg daily</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Allergies</div>
                    <div className="text-sm">Penicillin</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Recent Tests</div>
                    <div className="text-sm">Blood Panel (May 28, 2023)</div>
                    <div className="text-sm">ECG (May 28, 2023)</div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full">
                    <FileText className="h-4 w-4 mr-2" /> View Full Record
                  </Button>
                </CardFooter>
              </Card>

              {/* Prescription Card */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between">
                    <CardTitle>Prescription</CardTitle>
                    <Badge>Active</Badge>
                  </div>
                  <CardDescription>Prescription #RX-78945</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">Patient</div>
                    <div>John Doe</div>
                    <div className="text-muted-foreground">Prescribed By</div>
                    <div>Dr. Jennifer Wilson</div>
                    <div className="text-muted-foreground">Date</div>
                    <div>May 15, 2023</div>
                    <div className="text-muted-foreground">Expires</div>
                    <div>August 15, 2023</div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <div className="font-medium">Medications</div>
                    <div className="space-y-2">
                      <div className="text-sm">
                        <div className="font-medium">Lisinopril 10mg</div>
                        <div className="text-muted-foreground">Take 1 tablet by mouth once daily</div>
                        <div className="text-muted-foreground">Quantity: 30, Refills: 3</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Download className="h-4 w-4 mr-2" /> Download
                  </Button>
                  <Button size="sm" className="flex-1">
                    <Pill className="h-4 w-4 mr-2" /> Refill
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="stats" className="space-y-8 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Stat Card 1 */}
              <Card className="bg-blue-500/10 border-blue-500/30">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-blue-700">Total Patients</CardTitle>
                  <Users className="size-8 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-700">2,853</div>
                  <p className="text-xs text-blue-600">+18.2% from last month</p>
                </CardContent>
              </Card>

              {/* Stat Card 2 */}
              <Card className="bg-purple-500/10 border-purple-500/30">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-purple-700">New Appointments</CardTitle>
                  <Calendar className="size-8 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-700">148</div>
                  <p className="text-xs text-purple-600">+4.3% from yesterday</p>
                </CardContent>
              </Card>

              {/* Stat Card 3 */}
              <Card className="bg-green-500/10 border-green-500/30">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-green-700">Revenue</CardTitle>
                  <DollarSign className="size-8 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-700">$24,563</div>
                  <p className="text-xs text-green-600">+10.5% from last week</p>
                </CardContent>
              </Card>

              {/* Stat Card 4 */}
              <Card className="bg-amber-500/10 border-amber-500/30">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-amber-700">Active Doctors</CardTitle>
                  <User className="size-8 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-700">32</div>
                  <p className="text-xs text-amber-600">+2 new this month</p>
                </CardContent>
              </Card>

              {/* Stat Card with Progress */}
              <Card className="bg-rose-500/10 border-rose-500/30">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-rose-700">Bed Occupancy</CardTitle>
                  <Bed className="size-8 text-rose-500" />
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-2xl font-bold text-rose-700">78%</div>
                    <div className="text-xs text-green-600 flex items-center">
                      <ArrowUp className="h-3 w-3 mr-1" /> 2.5%
                    </div>
                  </div>
                  <Progress value={78} className="h-2 bg-rose-500/20 [&>*]:bg-rose-500" />
                  <p className="text-xs text-rose-600 mt-2">156/200 beds occupied</p>
                </CardContent>
              </Card>

              {/* Stat Card with Progress */}
              <Card className="bg-emerald-500/10 border-emerald-500/30">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-emerald-700">Appointment Completion</CardTitle>
                  <Check className="size-8 text-emerald-500" />
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-2xl font-bold text-emerald-700">92%</div>
                    <div className="text-xs text-green-600 flex items-center">
                      <ArrowUp className="h-3 w-3 mr-1" /> 1.2%
                    </div>
                  </div>
                  <Progress value={92} className="h-2 bg-emerald-500/20 [&>*]:bg-emerald-500" />
                  <p className="text-xs text-emerald-600 mt-2">138/150 appointments completed</p>
                </CardContent>
              </Card>

              {/* Stat Card with Progress */}
              <Card className="bg-orange-500/10 border-orange-500/30">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-orange-700">Inventory Status</CardTitle>
                  <Package className="size-8 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-2xl font-bold text-orange-700">63%</div>
                    <div className="text-xs text-red-600 flex items-center">
                      <ArrowDown className="h-3 w-3 mr-1" /> 4.8%
                    </div>
                  </div>
                  <Progress value={63} className="h-2 bg-orange-500/20 [&>*]:bg-orange-500" />
                  <p className="text-xs text-orange-600 mt-2">12 items below reorder level</p>
                </CardContent>
              </Card>

              {/* Stat Card with Progress */}
              <Card className="bg-pink-500/10 border-pink-500/30">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-pink-700">Patient Satisfaction</CardTitle>
                  <Heart className="size-8 text-pink-500" />
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-2xl font-bold text-pink-700">87%</div>
                    <div className="text-xs text-green-600 flex items-center">
                      <ArrowUp className="h-3 w-3 mr-1" /> 3.1%
                    </div>
                  </div>
                  <Progress value={87} className="h-2 bg-pink-500/20 [&>*]:bg-pink-500" />
                  <p className="text-xs text-pink-600 mt-2">Based on 432 patient surveys</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="misc" className="space-y-8 mt-6">
            {/* Misc content will go here */}
            <div className="grid grid-cols-1 gap-6">
              {/* FAQ Accordion */}
              <Card>
                <CardHeader>
                  <CardTitle>Frequently Asked Questions</CardTitle>
                  <CardDescription>Common questions about our services</CardDescription>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                      <AccordionTrigger>What insurance plans do you accept?</AccordionTrigger>
                      <AccordionContent>We accept most major insurance plans including Medicare, Blue Cross Blue Shield, Aetna, Cigna, and UnitedHealthcare. Please contact our billing department for specific questions about your coverage.</AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-2">
                      <AccordionTrigger>How do I schedule an appointment?</AccordionTrigger>
                      <AccordionContent>You can schedule an appointment by calling our office during business hours, using our online patient portal, or through our mobile app. New patients will need to create an account and fill out some initial paperwork.</AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-3">
                      <AccordionTrigger>What should I bring to my first appointment?</AccordionTrigger>
                      <AccordionContent>Please bring your insurance card, a valid photo ID, a list of current medications, your medical history, and any relevant medical records or test results. Arriving 15 minutes early to complete paperwork is recommended.</AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-4">
                      <AccordionTrigger>How do I access my medical records?</AccordionTrigger>
                      <AccordionContent>You can access your medical records through our secure patient portal. If you need assistance, please contact our medical records department at (555) 123-4567 or email records@clinicname.com.</AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-5">
                      <AccordionTrigger>What are your hours of operation?</AccordionTrigger>
                      <AccordionContent>Our clinic is open Monday through Friday from 8:00 AM to 6:00 PM, and Saturday from 9:00 AM to 1:00 PM. We are closed on Sundays and major holidays. Emergency services are available 24/7.</AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>

              {/* Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle>Patient Treatment Timeline</CardTitle>
                  <CardDescription>Recent treatment history</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative border-l pl-6 ml-3 space-y-6">
                    <div className="relative">
                      <div className="absolute -left-8 mt-1.5 h-4 w-4 rounded-full border border-primary bg-background"></div>
                      <div className="flex flex-col">
                        <h4 className="text-base font-semibold">Initial Consultation</h4>
                        <p className="text-xs text-muted-foreground">Today, 9:30 AM</p>
                        <p className="mt-2 text-sm">Patient reported symptoms of persistent headache and dizziness. Blood pressure was elevated at 140/90.</p>
                      </div>
                    </div>

                    <div className="relative">
                      <div className="absolute -left-8 mt-1.5 h-4 w-4 rounded-full border border-primary bg-primary"></div>
                      <div className="flex flex-col">
                        <h4 className="text-base font-semibold">MRI Scan</h4>
                        <p className="text-xs text-muted-foreground">Yesterday, 2:15 PM</p>
                        <p className="mt-2 text-sm">MRI scan of the brain was performed. Results pending review by the radiologist.</p>
                      </div>
                    </div>

                    <div className="relative">
                      <div className="absolute -left-8 mt-1.5 h-4 w-4 rounded-full border border-primary bg-primary"></div>
                      <div className="flex flex-col">
                        <h4 className="text-base font-semibold">Blood Tests</h4>
                        <p className="text-xs text-muted-foreground">3 days ago, 11:00 AM</p>
                        <p className="mt-2 text-sm">Complete blood count and metabolic panel were ordered. Results showed slightly elevated white blood cell count.</p>
                      </div>
                    </div>

                    <div className="relative">
                      <div className="absolute -left-8 mt-1.5 h-4 w-4 rounded-full border border-primary bg-primary"></div>
                      <div className="flex flex-col">
                        <h4 className="text-base font-semibold">Medication Prescribed</h4>
                        <p className="text-xs text-muted-foreground">1 week ago, 4:45 PM</p>
                        <p className="mt-2 text-sm">Prescribed Lisinopril 10mg daily for hypertension. Patient advised to monitor blood pressure daily.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full">
                    View Complete History
                  </Button>
                </CardFooter>
              </Card>

              {/* Alert Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Success Alert */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800">Appointment Confirmed</h3>
                      <div className="mt-2 text-sm text-green-700">
                        <p>Your appointment with Dr. Wilson has been confirmed for Monday, June 12 at 10:30 AM.</p>
                      </div>
                      <div className="mt-4">
                        <div className="-mx-2 -my-1.5 flex">
                          <button className="px-2 py-1.5 rounded-md text-sm font-medium text-green-800 hover:bg-green-100">View Details</button>
                          <button className="ml-3 px-2 py-1.5 rounded-md text-sm font-medium text-green-800 hover:bg-green-100">Dismiss</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Warning Alert */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <Info className="h-5 w-5 text-amber-500" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-amber-800">Prescription Expiring</h3>
                      <div className="mt-2 text-sm text-amber-700">
                        <p>Your prescription for Lisinopril will expire in 7 days. Please schedule a follow-up appointment for renewal.</p>
                      </div>
                      <div className="mt-4">
                        <div className="-mx-2 -my-1.5 flex">
                          <button className="px-2 py-1.5 rounded-md text-sm font-medium text-amber-800 hover:bg-amber-100">Schedule Now</button>
                          <button className="ml-3 px-2 py-1.5 rounded-md text-sm font-medium text-amber-800 hover:bg-amber-100">Remind Later</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
