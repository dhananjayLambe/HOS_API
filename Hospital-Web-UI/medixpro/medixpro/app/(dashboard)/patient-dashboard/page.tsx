"use client";

import { useState } from "react";
import { Bell, Calendar, FileText, Heart, MessageSquare, PieChart, PillIcon as Pills, User } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Shell } from "@/components/shell";
import { Line, CartesianGrid, Tooltip, YAxis, XAxis, ResponsiveContainer, LineChart } from "recharts";

export default function PatientDashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <Shell>
      <div className="flex flex-col gap-8 pb-10">
        {/* Header Section */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl xl:text-3xl font-bold">Welcome back, Sarah</h2>
            <p className="text-muted-foreground">Your health dashboard - manage your care all in one place</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="h-9">
              <MessageSquare className="mr-2 h-4 w-4" />
              Message Doctor
            </Button>
            <Button size="sm" className="h-9">
              <Calendar className="mr-2 h-4 w-4" />
              Book Appointment
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Appointment Card */}
          <div className="bg-card rounded-xl  overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Next Appointment</h3>
                <div className="bg-blue-100 dark:bg-blue-900/50 p-1.5 rounded-full">
                  <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">Tomorrow</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">10:30 AM with Dr. Johnson</p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center">
                  View details
                  <svg className="ml-1 h-4 w-4" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Medications Card */}
          <div className="bg-card rounded-xl  overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Medications</h3>
                <div className="bg-green-100 dark:bg-green-900/50 p-1.5 rounded-full">
                  <Pills className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">3 Active</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Next dose in 2 hours</p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button className="text-sm font-medium text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 flex items-center">
                  View all medications
                  <svg className="ml-1 h-4 w-4" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Test Results Card */}
          <div className="bg-card rounded-xl  overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Test Results</h3>
                <div className="bg-purple-100 dark:bg-purple-900/50 p-1.5 rounded-full">
                  <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">2 New</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Blood work from 05/12</p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button className="text-sm font-medium text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 flex items-center">
                  View results
                  <svg className="ml-1 h-4 w-4" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Billing Card */}
          <div className="bg-card rounded-xl  overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Billing</h3>
                <div className="bg-rose-100 dark:bg-rose-900/50 p-1.5 rounded-full">
                  <PieChart className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">$45.00</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Due in 15 days</p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button className="text-sm font-medium text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 flex items-center">
                  Make payment
                  <svg className="ml-1 h-4 w-4" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-4" onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="medications">Medications</TabsTrigger>
            <TabsTrigger value="records">Records</TabsTrigger>
            <TabsTrigger value="vitals">Vitals</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Health Summary Card */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Health Summary</CardTitle>
                  <CardDescription>Your recent health metrics and goals</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Heart className="h-5 w-5 text-rose-500" />
                        <span className="font-medium">Heart Rate</span>
                      </div>
                      <span className="font-bold">72 BPM</span>
                    </div>
                    <Progress value={72} className="h-2" />
                    <p className="text-xs text-muted-foreground">Normal range: 60-100 BPM</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <svg className="h-5 w-5 text-blue-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M8 2V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M16 2V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M3 8H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M19 4H5C3.89543 4 3 4.89543 3 6V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V6C21 4.89543 20.1046 4 19 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M8 11H8.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M12 11H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M16 11H16.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M8 15H8.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M12 15H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M16 15H16.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="font-medium">Blood Pressure</span>
                      </div>
                      <span className="font-bold">118/78 mmHg</span>
                    </div>
                    <Progress value={78} className="h-2" />
                    <p className="text-xs text-muted-foreground">Normal range: Below 120/80 mmHg</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <svg className="h-5 w-5 text-amber-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 2L4 6V12C4 15.31 7.58 20 12 22C16.42 20 20 15.31 20 12V6L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M12 11C13.1046 11 14 10.1046 14 9C14 7.89543 13.1046 7 12 7C10.8954 7 10 7.89543 10 9C10 10.1046 10.8954 11 12 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M12 11V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="font-medium">Glucose Level</span>
                      </div>
                      <span className="font-bold">98 mg/dL</span>
                    </div>
                    <Progress value={65} className="h-2" />
                    <p className="text-xs text-muted-foreground">Normal range: 70-140 mg/dL</p>
                  </div>
                </CardContent>
              </Card>

              {/* Upcoming Appointments Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Appointments</CardTitle>
                  <CardDescription>Your scheduled visits</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src="/compassionate-doctor-consultation.png" alt="Dr. Johnson" />
                          <AvatarFallback>JJ</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">Dr. Johnson</p>
                          <p className="text-xs text-muted-foreground">Cardiology</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        Tomorrow
                      </Badge>
                    </div>
                    <div className="mt-3 text-sm">
                      <p>May 15, 2023 • 10:30 AM</p>
                      <p className="text-muted-foreground">Annual checkup</p>
                    </div>
                  </div>

                  <div className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src="/confident-female-doctor.png" alt="Dr. Martinez" />
                          <AvatarFallback>EM</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">Dr. Martinez</p>
                          <p className="text-xs text-muted-foreground">Dermatology</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                        Next Week
                      </Badge>
                    </div>
                    <div className="mt-3 text-sm">
                      <p>May 22, 2023 • 2:15 PM</p>
                      <p className="text-muted-foreground">Skin examination</p>
                    </div>
                  </div>

                  <Button variant="outline" className="w-full">
                    View All Appointments
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Medication Reminders */}
              <Card>
                <CardHeader>
                  <CardTitle>Medication Reminders</CardTitle>
                  <CardDescription>Your daily medication schedule</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                        <Pills className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="font-medium">Lisinopril</p>
                        <p className="text-xs text-muted-foreground">10mg • Once daily</p>
                      </div>
                    </div>
                    <Badge>8:00 AM</Badge>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                        <Pills className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="font-medium">Metformin</p>
                        <p className="text-xs text-muted-foreground">500mg • Twice daily</p>
                      </div>
                    </div>
                    <Badge>2:00 PM</Badge>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
                        <Pills className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="font-medium">Atorvastatin</p>
                        <p className="text-xs text-muted-foreground">20mg • Once daily</p>
                      </div>
                    </div>
                    <Badge>8:00 PM</Badge>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
                        <Pills className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="font-medium">Atorvastatin</p>
                        <p className="text-xs text-muted-foreground">20mg • Once daily</p>
                      </div>
                    </div>
                    <Badge>8:00 PM</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Messages */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Messages</CardTitle>
                  <CardDescription>Communications from your care team</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src="/compassionate-doctor-consultation.png" alt="Dr. Johnson" />
                        <AvatarFallback>JJ</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">Dr. Johnson</p>
                          <Badge variant="outline" className="text-xs">
                            New
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">2 hours ago</p>
                      </div>
                    </div>
                    <p className="mt-2 text-sm">Your recent test results look good. Let's discuss them at your next appointment.</p>
                  </div>

                  <div className="rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src="/compassionate-caregiver.png" alt="Nurse Williams" />
                        <AvatarFallback>NW</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">Nurse Williams</p>
                        <p className="text-xs text-muted-foreground">Yesterday</p>
                      </div>
                    </div>
                    <p className="mt-2 text-sm">Just a reminder to bring your medication list to your appointment tomorrow.</p>
                  </div>

                  <Button variant="outline" className="w-full">
                    View All Messages
                  </Button>
                </CardContent>
              </Card>

              {/* Health Tips */}
              <Card>
                <CardHeader>
                  <CardTitle>Health Tips</CardTitle>
                  <CardDescription>Personalized recommendations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg bg-white/80 p-3 dark:bg-gray-950/50">
                    <div className="flex items-center gap-2">
                      <Heart className="h-5 w-5 text-rose-500" />
                      <p className="font-medium">Heart Health</p>
                    </div>
                    <p className="mt-2 text-sm">Try to get 30 minutes of moderate exercise at least 5 days a week to improve your cardiovascular health.</p>
                  </div>

                  <div className="rounded-lg bg-white/80 p-3 dark:bg-gray-950/50">
                    <div className="flex items-center gap-2">
                      <svg className="h-5 w-5 text-amber-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <p className="font-medium">Stress Management</p>
                    </div>
                    <p className="mt-2 text-sm">Practice deep breathing exercises for 5 minutes daily to help reduce stress and lower blood pressure.</p>
                  </div>

                  <div className="rounded-lg bg-white/80 p-3 dark:bg-gray-950/50">
                    <div className="flex items-center gap-2">
                      <svg className="h-5 w-5 text-green-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M8 14C8 14 9.5 16 12 16C14.5 16 16 14 16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M9 9H9.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M15 9H15.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <p className="font-medium">Nutrition</p>
                    </div>
                    <p className="mt-2 text-sm">Based on your profile, increasing your intake of omega-3 fatty acids could help improve your cholesterol levels.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Appointments Tab */}
          <TabsContent value="appointments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Your Appointments</CardTitle>
                <CardDescription>Manage your upcoming and past appointments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  <div>
                    <h3 className="mb-4 text-lg font-medium">Upcoming</h3>
                    <div className="space-y-4">
                      {/* Appointment cards would go here */}
                      <div className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center">
                        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          <Calendar className="h-8 w-8" />
                        </div>
                        <div className="flex-grow space-y-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">Annual Checkup</h4>
                            <Badge>Tomorrow</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">May 15, 2023 • 10:30 AM</p>
                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-4 w-4" />
                            <span>Dr. Johnson (Cardiology)</span>
                          </div>
                        </div>
                        <div className="flex flex-shrink-0 gap-2">
                          <Button variant="outline" size="sm">
                            Reschedule
                          </Button>
                          <Button size="sm">Details</Button>
                        </div>
                      </div>

                      <div className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center">
                        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                          <Calendar className="h-8 w-8" />
                        </div>
                        <div className="flex-grow space-y-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">Skin Examination</h4>
                            <Badge variant="outline">Next Week</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">May 22, 2023 • 2:15 PM</p>
                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-4 w-4" />
                            <span>Dr. Martinez (Dermatology)</span>
                          </div>
                        </div>
                        <div className="flex flex-shrink-0 gap-2">
                          <Button variant="outline" size="sm">
                            Reschedule
                          </Button>
                          <Button size="sm">Details</Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-4 text-lg font-medium">Past</h3>
                    <div className="space-y-4">
                      {/* Past appointment cards would go here */}
                      <div className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center opacity-70">
                        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                          <Calendar className="h-8 w-8" />
                        </div>
                        <div className="flex-grow space-y-1">
                          <h4 className="font-medium">Blood Work</h4>
                          <p className="text-sm text-muted-foreground">April 30, 2023 • 9:00 AM</p>
                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-4 w-4" />
                            <span>Dr. Patel (Internal Medicine)</span>
                          </div>
                        </div>
                        <div className="flex flex-shrink-0 gap-2">
                          <Button variant="outline" size="sm">
                            View Results
                          </Button>
                          <Button variant="outline" size="sm">
                            Notes
                          </Button>
                        </div>
                      </div>

                      <div className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center opacity-70">
                        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                          <Calendar className="h-8 w-8" />
                        </div>
                        <div className="flex-grow space-y-1">
                          <h4 className="font-medium">Dental Cleaning</h4>
                          <p className="text-sm text-muted-foreground">March 15, 2023 • 11:30 AM</p>
                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-4 w-4" />
                            <span>Dr. Garcia (Dentistry)</span>
                          </div>
                        </div>
                        <div className="flex flex-shrink-0 gap-2">
                          <Button variant="outline" size="sm">
                            View Results
                          </Button>
                          <Button variant="outline" size="sm">
                            Notes
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Medications Tab */}
          <TabsContent value="medications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Your Medications</CardTitle>
                <CardDescription>Current prescriptions and medication history</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Active Medications</h3>

                    <div className="rounded-lg border p-4">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                            <Pills className="h-6 w-6" />
                          </div>
                          <div>
                            <h4 className="font-medium">Lisinopril</h4>
                            <p className="text-sm text-muted-foreground">10mg • Once daily • Morning</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                            Active
                          </Badge>
                          <Button variant="ghost" size="icon">
                            <Bell className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Prescribed by:</span>
                          <span>Dr. Johnson</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Start date:</span>
                          <span>January 15, 2023</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Refills remaining:</span>
                          <span>3</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Next refill date:</span>
                          <span>June 15, 2023</span>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button variant="outline" size="sm">
                          Request Refill
                        </Button>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-lg border p-4">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                            <Pills className="h-6 w-6" />
                          </div>
                          <div>
                            <h4 className="font-medium">Metformin</h4>
                            <p className="text-sm text-muted-foreground">500mg • Twice daily • Morning and Evening</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                            Active
                          </Badge>
                          <Button variant="ghost" size="icon">
                            <Bell className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Prescribed by:</span>
                          <span>Dr. Patel</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Start date:</span>
                          <span>February 10, 2023</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Refills remaining:</span>
                          <span>2</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Next refill date:</span>
                          <span>May 25, 2023</span>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button variant="outline" size="sm">
                          Request Refill
                        </Button>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Medication History</h3>
                    <div className="rounded-lg border p-4 opacity-70">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                            <Pills className="h-6 w-6" />
                          </div>
                          <div>
                            <h4 className="font-medium">Amoxicillin</h4>
                            <p className="text-sm text-muted-foreground">500mg • Three times daily • With meals</p>
                          </div>
                        </div>
                        <Badge variant="outline">Completed</Badge>
                      </div>
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Prescribed by:</span>
                          <span>Dr. Martinez</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Start date:</span>
                          <span>December 5, 2022</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">End date:</span>
                          <span>December 15, 2022</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Records Tab */}
          <TabsContent value="records" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Medical Records</CardTitle>
                <CardDescription>Your health history and documents</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Recent Test Results</h3>

                    <div className="rounded-lg border p-4">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                            <FileText className="h-6 w-6" />
                          </div>
                          <div>
                            <h4 className="font-medium">Blood Work Results</h4>
                            <p className="text-sm text-muted-foreground">Complete Blood Count (CBC)</p>
                          </div>
                        </div>
                        <Badge>New</Badge>
                      </div>
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Date:</span>
                          <span>May 5, 2023</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Ordered by:</span>
                          <span>Dr. Johnson</span>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button variant="outline" size="sm">
                          Download PDF
                        </Button>
                        <Button size="sm">View Results</Button>
                      </div>
                    </div>

                    <div className="rounded-lg border p-4">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                            <FileText className="h-6 w-6" />
                          </div>
                          <div>
                            <h4 className="font-medium">Lipid Panel</h4>
                            <p className="text-sm text-muted-foreground">Cholesterol and Triglycerides</p>
                          </div>
                        </div>
                        <Badge>New</Badge>
                      </div>
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Date:</span>
                          <span>May 5, 2023</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Ordered by:</span>
                          <span>Dr. Johnson</span>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button variant="outline" size="sm">
                          Download PDF
                        </Button>
                        <Button size="sm">View Results</Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Medical History</h3>

                    <div className="space-y-4">
                      <div className="rounded-lg border p-4">
                        <h4 className="font-medium">Allergies</h4>
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                              Penicillin
                            </Badge>
                            <span className="text-sm text-muted-foreground">Severe - Anaphylaxis</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                              Peanuts
                            </Badge>
                            <span className="text-sm text-muted-foreground">Moderate - Hives</span>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-lg border p-4">
                        <h4 className="font-medium">Conditions</h4>
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center justify-between">
                            <span>Hypertension</span>
                            <span className="text-sm text-muted-foreground">Diagnosed: 2020</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Type 2 Diabetes</span>
                            <span className="text-sm text-muted-foreground">Diagnosed: 2021</span>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-lg border p-4">
                        <h4 className="font-medium">Procedures</h4>
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center justify-between">
                            <span>Appendectomy</span>
                            <span className="text-sm text-muted-foreground">2015</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vitals Tab */}
          <TabsContent value="vitals" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Health Vitals</CardTitle>
                <CardDescription>Track your health metrics over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Blood Pressure</h3>
                      <Button variant="outline" size="sm">
                        Add Reading
                      </Button>
                    </div>

                    <div className="h-[200px] rounded-lg border bg-gradient-to-r from-blue-50 to-indigo-50 p-4 dark:from-blue-950/40 dark:to-indigo-900/20">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={[
                          { date: "May 1", systolic: 120, diastolic: 80 },
                          { date: "May 5", systolic: 118, diastolic: 78 },
                          { date: "May 10", systolic: 115, diastolic: 75 },
                          { date: "May 15", systolic: 122, diastolic: 82 },
                          { date: "May 20", systolic: 118, diastolic: 78 }
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis   dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Line type="monotone" dataKey="systolic" stroke="#2563eb" name="Systolic" />
                          <Line type="monotone" dataKey="diastolic" stroke="#7c3aed" name="Diastolic" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="rounded-lg border p-4 text-center">
                        <p className="text-sm text-muted-foreground">Latest Reading</p>
                        <p className="text-2xl font-bold">118/78</p>
                        <p className="text-xs text-muted-foreground">May 10, 2023</p>
                      </div>
                      <div className="rounded-lg border p-4 text-center">
                        <p className="text-sm text-muted-foreground">Average (30 days)</p>
                        <p className="text-2xl font-bold">120/80</p>
                        <p className="text-xs text-green-600 dark:text-green-400">Normal</p>
                      </div>
                      <div className="rounded-lg border p-4 text-center">
                        <p className="text-sm text-muted-foreground">Goal</p>
                        <p className="text-2xl font-bold">{"<"}120/80</p>
                        <p className="text-xs text-green-600 dark:text-green-400">On Track</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Weight</h3>
                      <Button variant="outline" size="sm">
                        Add Reading
                      </Button>
                    </div>

                    <div className="h-[200px] rounded-lg border bg-gradient-to-r from-green-50 to-teal-50 p-4 dark:from-green-950/40 dark:to-teal-900/20">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={[
                          { date: "May 1", weight: 170 },
                          { date: "May 5", weight: 169 },
                          { date: "May 10", weight: 168.5 },
                          { date: "May 15", weight: 168 },
                          { date: "May 20", weight: 167.5 }
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Line type="monotone" dataKey="weight" stroke="#059669" name="Weight (lbs)" />
                        </LineChart>
                      </ResponsiveContainer>
                      
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="rounded-lg border p-4 text-center">
                        <p className="text-sm text-muted-foreground">Latest Reading</p>
                        <p className="text-2xl font-bold">168 lbs</p>
                        <p className="text-xs text-muted-foreground">May 8, 2023</p>
                      </div>
                      <div className="rounded-lg border p-4 text-center">
                        <p className="text-sm text-muted-foreground">Change (30 days)</p>
                        <p className="text-2xl font-bold">-2.5 lbs</p>
                        <p className="text-xs text-green-600 dark:text-green-400">Decreasing</p>
                      </div>
                      <div className="rounded-lg border p-4 text-center">
                        <p className="text-sm text-muted-foreground">Goal</p>
                        <p className="text-2xl font-bold">160 lbs</p>
                        <p className="text-xs text-amber-600 dark:text-amber-400">8 lbs to go</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Blood Glucose</h3>
                      <Button variant="outline" size="sm">
                        Add Reading
                      </Button>
                    </div>

                    <div className="h-[200px] rounded-lg border bg-gradient-to-r from-amber-50 to-orange-50 p-4 dark:from-amber-950/40 dark:to-orange-900/20">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={[
                            { date: "May 1", glucose: 105 },
                            { date: "May 5", glucose: 98 },
                            { date: "May 10", glucose: 102 },
                            { date: "May 15", glucose: 95 },
                            { date: "May 20", glucose: 100 }
                          ]}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Line type="monotone" dataKey="glucose" stroke="#d97706" name="Glucose (mg/dL)" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="rounded-lg border p-4 text-center">
                        <p className="text-sm text-muted-foreground">Latest Reading</p>
                        <p className="text-2xl font-bold">98 mg/dL</p>
                        <p className="text-xs text-muted-foreground">May 12, 2023</p>
                      </div>
                      <div className="rounded-lg border p-4 text-center">
                        <p className="text-sm text-muted-foreground">Average (30 days)</p>
                        <p className="text-2xl font-bold">105 mg/dL</p>
                        <p className="text-xs text-green-600 dark:text-green-400">Normal</p>
                      </div>
                      <div className="rounded-lg border p-4 text-center">
                        <p className="text-sm text-muted-foreground">Goal</p>
                        <p className="text-2xl font-bold">{"<"}140 mg/dL</p>
                        <p className="text-xs text-green-600 dark:text-green-400">On Track</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Shell>
  );
}
