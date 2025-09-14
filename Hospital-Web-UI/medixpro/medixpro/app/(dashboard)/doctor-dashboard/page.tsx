import { ArrowUpRight, CalendarClock, ClipboardList, FileText, Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DoctorAppointments } from "@/components/doctor/doctor-appointments";
import { DoctorCalendar } from "@/components/doctor/doctor-upcoming";
import { DoctorPatients } from "@/components/doctor/doctor-patients";
import { DoctorTasks } from "@/components/doctor/doctor-tasks";
import { PatientNotes } from "@/components/doctor/patient-notes";
import { RecentPrescriptions } from "@/components/doctor/recent-prescriptions";
import { DoctorStats } from "@/components/doctor/doctor-stats";

export default function DoctorDashboardPage() {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <main className="flex-1 space-y-6">
        <div className="flex flex-col space-y-2">
          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">Welcome back, Dr. Sarah</h2>
          <p className="text-muted-foreground">Here's what's happening with your patients today.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {/* Appointments Card */}
      <div className="bg-card rounded-lg overflow-hidden border border-blue-100 dark:border-blue-900/60">
        <div className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-lg">
                <CalendarClock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="font-medium text-slate-600 dark:text-slate-300">Appointments</span>
            </div>
            <span className="text-sm text-red-500 font-medium">3 urgent</span>
          </div>
          
          <div className="mt-4">
            <div className="text-3xl font-bold text-slate-800 dark:text-white">12</div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Today's consultations</p>
          </div>
          
          <div className="mt-6">
            <button className="flex items-center justify-between w-full text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline">
              <span>View Schedule</span>
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Reports Card */}
      <div className="bg-card rounded-lg overflow-hidden border border-emerald-100 dark:border-emerald-900/60">
        <div className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="bg-emerald-100 dark:bg-emerald-900/50 p-2 rounded-lg">
                <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="font-medium text-slate-600 dark:text-slate-300">Pending Reports</span>
            </div>
            <span className="text-sm text-emerald-500 font-medium">2 ready</span>
          </div>
          
          <div className="mt-4">
            <div className="text-3xl font-bold text-slate-800 dark:text-white">7</div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Lab results awaiting review</p>
          </div>
          
          <div className="mt-6">
            <button className="flex items-center justify-between w-full text-sm text-emerald-600 dark:text-emerald-400 font-medium hover:underline">
              <span>Review Reports</span>
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Patients Card */}
      <div className="bg-card rounded-lg overflow-hidden border border-amber-100 dark:border-amber-900/60">
        <div className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="bg-amber-100 dark:bg-amber-900/50 p-2 rounded-lg">
                <Users className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="font-medium text-slate-600 dark:text-slate-300">Active Patients</span>
            </div>
            <span className="text-sm text-amber-500 font-medium">8 new</span>
          </div>
          
          <div className="mt-4">
            <div className="text-3xl font-bold text-slate-800 dark:text-white">143</div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Total patient count this week</p>
          </div>
          
          <div className="mt-6">
            <button className="flex items-center justify-between w-full text-sm text-amber-600 dark:text-amber-400 font-medium hover:underline">
              <span>Patient Records</span>
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Tasks Card */}
      <div className="bg-card rounded-lg overflow-hidden border border-rose-100 dark:border-rose-900/60">
        <div className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="bg-rose-100 dark:bg-rose-900/50 p-2 rounded-lg">
                <ClipboardList className="h-5 w-5 text-rose-600 dark:text-rose-400" />
              </div>
              <span className="font-medium text-slate-600 dark:text-slate-300">Pending Tasks</span>
            </div>
            <span className="text-sm text-rose-500 font-medium">2 high priority</span>
          </div>
          
          <div className="mt-4">
            <div className="text-3xl font-bold text-slate-800 dark:text-white">5</div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Tasks requiring attention</p>
          </div>
          
          <div className="mt-6">
            <button className="flex items-center justify-between w-full text-sm text-rose-600 dark:text-rose-400 font-medium hover:underline">
              <span>View Tasks</span>
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

        <Tabs defaultValue="schedule" className="space-y-4">
          <TabsList className="grid grid-cols-4 md:w-[400px]">
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="patients">Patients</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="stats">Stats</TabsTrigger>
          </TabsList>

          <TabsContent value="schedule" className="space-y-4">
            <div className="md:grid max-md:space-y-4 gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="col-span-4">
                <CardHeader>
                  <CardTitle>Today's Schedule</CardTitle>
                  <CardDescription>You have 12 appointments scheduled for today</CardDescription>
                </CardHeader>
                <CardContent>
                  <DoctorAppointments />
                </CardContent>
              </Card>

              <Card className="col-span-3">
                <CardHeader>
                  <CardTitle>Upcoming Appointments</CardTitle>
                  <CardDescription>Your upcoming appointments for the week</CardDescription>
                </CardHeader>
                <CardContent>
                  <DoctorCalendar />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="patients" className="space-y-4">
            <div className="md:grid max-md:space-y-4 gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="col-span-4">
                <CardHeader>
                  <CardTitle>Today's Patients</CardTitle>
                  <CardDescription>Patients you're seeing today</CardDescription>
                </CardHeader>
                <CardContent className="!pt-0">
                  <DoctorPatients />
                </CardContent>
              </Card>

              <Card className="col-span-3">
                <CardHeader>
                  <CardTitle>Recent Patient Notes</CardTitle>
                  <CardDescription>Your latest clinical notes</CardDescription>
                </CardHeader>
                <CardContent className="!pt-0">
                  <PatientNotes />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            <div className="md:grid max-md:space-y-4 gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="col-span-4">
                <CardHeader>
                  <CardTitle>Pending Tasks</CardTitle>
                  <CardDescription>Tasks requiring your attention</CardDescription>
                </CardHeader>
                <CardContent>
                  <DoctorTasks />
                </CardContent>
              </Card>

              <Card className="col-span-3">
                <CardHeader>
                  <CardTitle>Recent Prescriptions</CardTitle>
                  <CardDescription>Prescriptions you've written recently</CardDescription>
                </CardHeader>
                <CardContent>
                  <RecentPrescriptions />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>Your clinical performance and patient outcomes</CardDescription>
              </CardHeader>
              <CardContent>
                <DoctorStats />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
