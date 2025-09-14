import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Award, Briefcase, Building, Calendar, ClipboardList, Clock, FileText, GraduationCap, Mail, MapPin, Phone, Stethoscope, UserCheck, Users } from "lucide-react";
import Link from "next/link";
import { use } from "react";

// Mock data for staff members to ensure we can find the staff by ID
const staffMembers = [
  {
    id: "1",
    name: "Dr. Sarah Johnson",
    initials: "SJ",
    role: "Cardiologist",
    department: "Medical",
    email: "sarah.j@clinic.com",
    phone: "555-0101",
    status: "Active",
    avatar: "/mystical-forest-spirit.png",
    experience: 12,
    hireDate: "2012-05-15",
    address: "123 Medical Center Drive, Suite 456",
    city: "San Francisco",
    state: "CA",
    zip: "94143",
    education: [
      {
        degree: "Doctor of Medicine",
        institution: "Stanford University School of Medicine",
        year: "2008",
      },
      {
        degree: "Residency in Internal Medicine",
        institution: "UCSF Medical Center",
        year: "2011",
      },
      {
        degree: "Fellowship in Cardiology",
        institution: "Mayo Clinic",
        year: "2014",
      },
    ],
    certifications: [
      {
        name: "Board Certified in Cardiology",
        issuer: "American Board of Internal Medicine",
        year: "2015",
        expires: "2025",
      },
      {
        name: "Advanced Cardiac Life Support (ACLS)",
        issuer: "American Heart Association",
        year: "2020",
        expires: "2022",
      },
    ],
    schedule: {
      monday: "9:00 AM - 5:00 PM",
      tuesday: "9:00 AM - 5:00 PM",
      wednesday: "9:00 AM - 1:00 PM",
      thursday: "9:00 AM - 5:00 PM",
      friday: "9:00 AM - 5:00 PM",
      saturday: "Off",
      sunday: "Off",
    },
    specializations: ["Interventional Cardiology", "Echocardiography", "Preventive Cardiology"],
    bio: "Dr. Sarah Johnson is a board-certified cardiologist with over 12 years of experience in diagnosing and treating cardiovascular conditions. She specializes in interventional cardiology and echocardiography, with a focus on preventive care. Dr. Johnson is dedicated to providing compassionate, patient-centered care and staying at the forefront of cardiac medicine.",
  },
  {
    id: "2",
    name: "Dr. Michael Chen",
    initials: "MC",
    role: "Neurologist",
    department: "Medical",
    email: "michael.c@clinic.com",
    phone: "555-0102",
    status: "Active",
    avatar: "",
    experience: 8,
    hireDate: "2015-06-22",
    address: "456 Health Sciences Blvd",
    city: "San Francisco",
    state: "CA",
    zip: "94143",
    education: [
      {
        degree: "Doctor of Medicine",
        institution: "Johns Hopkins School of Medicine",
        year: "2010",
      },
      {
        degree: "Residency in Neurology",
        institution: "Massachusetts General Hospital",
        year: "2014",
      },
    ],
    certifications: [
      {
        name: "Board Certified in Neurology",
        issuer: "American Board of Psychiatry and Neurology",
        year: "2016",
        expires: "2026",
      },
    ],
    schedule: {
      monday: "8:00 AM - 4:00 PM",
      tuesday: "8:00 AM - 4:00 PM",
      wednesday: "8:00 AM - 4:00 PM",
      thursday: "8:00 AM - 4:00 PM",
      friday: "8:00 AM - 12:00 PM",
      saturday: "Off",
      sunday: "Off",
    },
    specializations: ["Stroke Treatment", "Headache Disorders", "Neurodegenerative Diseases"],
    bio: "Dr. Michael Chen is a board-certified neurologist specializing in stroke treatment and neurodegenerative diseases. With 8 years of experience, he is dedicated to providing comprehensive neurological care using the latest diagnostic and treatment approaches.",
  },
  // Additional staff members would be here
];

export default function StaffProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const {id} = use(params)
  const staffId = id;

  // Find the staff member by ID from our mock data
  const staff = staffMembers.find((s) => s.id === staffId) || staffMembers[0];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" asChild>
          <Link href="/staff">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to Staff List</span>
          </Link>
        </Button>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">Staff Profile</h1>
      </div>

      <div className="md:grid max-md:space-y-6 gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader className="flex flex-col items-center text-center">
            <Avatar className="h-24 w-24">
              <AvatarImage src={staff.avatar || "/user-2.png?height=96&width=96&query=person"} alt={staff.name} />
              <AvatarFallback className="text-2xl">{staff.initials}</AvatarFallback>
            </Avatar>
            <CardTitle className="mt-4">{staff.name}</CardTitle>
            <CardDescription>{staff.role}</CardDescription>
            <Badge variant={staff.status === "Active" ? "default" : staff.status === "On Leave" ? "warning" : "secondary"} className="mt-2">
              {staff.status}
            </Badge>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm">{staff.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm">{staff.phone}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm">
                {staff.address}, {staff.city}, {staff.state} {staff.zip}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm">Joined {new Date(staff.hireDate).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm">{staff.experience} years experience</span>
            </div>
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm">{staff.department} Department</span>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <Tabs defaultValue="overview" className="w-full">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
                <CardTitle>Staff Information</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" asChild>
                    <Link href={`/staff/${staff.id}/schedule`}>
                      <Clock className="mr-2 h-4 w-4" />
                      Schedule
                    </Link>
                  </Button>
                  <Button asChild>
                    <Link href={`/staff/${staff.id}/edit`}>
                      <FileText className="mr-2 h-4 w-4" />
                      Edit Profile
                    </Link>
                  </Button>
                </div>
              </div>
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="qualifications">Qualifications</TabsTrigger>
                <TabsTrigger value="schedule">Schedule</TabsTrigger>
                <TabsTrigger value="patients">Patients</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent>
              <TabsContent value="overview" className="mt-0">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium">Biography</h3>
                    <p className="text-sm text-muted-foreground mt-2">{staff.bio}</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium">Specializations</h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {staff.specializations.map((specialization, index) => (
                        <Badge key={index} variant="outline" className="flex items-center gap-1">
                          <Stethoscope className="h-3 w-3" />
                          {specialization}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium">Contact Information</h3>
                    <div className="grid gap-2 mt-2">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm">{staff.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm">{staff.phone}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="qualifications" className="mt-0">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium">Education</h3>
                    <div className="space-y-3 mt-2">
                      {staff.education.map((edu, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <GraduationCap className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                          <div>
                            <p className="text-sm font-medium">{edu.degree}</p>
                            <p className="text-xs text-muted-foreground">
                              {edu.institution}, {edu.year}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium">Certifications</h3>
                    <div className="space-y-3 mt-2">
                      {staff.certifications.map((cert, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <Award className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                          <div>
                            <p className="text-sm font-medium">{cert.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {cert.issuer}, {cert.year} (Expires: {cert.expires})
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="schedule" className="mt-0">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium">Weekly Schedule</h3>
                    <div className="grid gap-2 mt-2">
                      {Object.entries(staff.schedule).map(([day, hours]) => (
                        <div key={day} className="flex items-center justify-between py-2 border-b">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="text-sm capitalize">{day}</span>
                          </div>
                          <span className="text-sm">{hours}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button asChild>
                      <Link href={`/staff/${staff.id}/schedule`}>
                        <Calendar className="mr-2 h-4 w-4" />
                        View Full Schedule
                      </Link>
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="patients" className="mt-0">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Assigned Patients</h3>
                    <Badge variant="outline">24 Total</Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between py-2 border-b">
                      <div className="flex items-center gap-2">
                        <ClipboardList className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm">Active Patients</span>
                      </div>
                      <Badge>18</Badge>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm">New Patients (This Month)</span>
                      </div>
                      <Badge variant="outline">3</Badge>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button asChild>
                      <Link href="/patients">
                        <UserCheck className="mr-2 h-4 w-4" />
                        View Patient List
                      </Link>
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
