import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Save, Trash } from "lucide-react";
import Link from "next/link";
import { use } from "react";

export default function StaffEditPage({ params }: { params: Promise<{ id: string }> }) {
  const {id} = use(params)

  // In a real application, you would fetch the staff data from an API
  // For this example, we'll use a mock staff member
  const staff = {
    id: id,
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
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center flex-wrap gap-2">
        <Button variant="outline" size="icon" asChild>
          <Link href={`/staff/${id}`}>
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to Staff Profile</span>
          </Link>
        </Button>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">Edit Staff Profile</h1>
      </div>

      <form className="space-y-6">
        <Tabs defaultValue="personal" className="w-full">
          <TabsList>
            <TabsTrigger value="personal">Personal Info</TabsTrigger>
            <TabsTrigger value="professional">Professional</TabsTrigger>
            <TabsTrigger value="qualifications">Qualifications</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
          </TabsList>

          <Card className="mt-4">
            <TabsContent value="personal" className="m-0">
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Update the staff member's personal details and contact information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" defaultValue={staff.name} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" defaultValue={staff.email} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" defaultValue={staff.phone} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select defaultValue={staff.status}>
                      <SelectTrigger id="status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="On Leave">On Leave</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" defaultValue={staff.address} />
                </div>

                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input id="city" defaultValue={staff.city} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input id="state" defaultValue={staff.state} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zip">ZIP Code</Label>
                    <Input id="zip" defaultValue={staff.zip} />
                  </div>
                </div>
              </CardContent>
            </TabsContent>

            <TabsContent value="professional" className="m-0">
              <CardHeader>
                <CardTitle>Professional Information</CardTitle>
                <CardDescription>Update the staff member's role, department, and professional details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="role">Role/Position</Label>
                    <Input id="role" defaultValue={staff.role} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Select defaultValue={staff.department}>
                      <SelectTrigger id="department">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Medical">Medical</SelectItem>
                        <SelectItem value="Nursing">Nursing</SelectItem>
                        <SelectItem value="Administration">Administration</SelectItem>
                        <SelectItem value="Laboratory">Laboratory</SelectItem>
                        <SelectItem value="Pharmacy">Pharmacy</SelectItem>
                        <SelectItem value="Radiology">Radiology</SelectItem>
                        <SelectItem value="Therapy">Therapy</SelectItem>
                        <SelectItem value="Support">Support</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="experience">Years of Experience</Label>
                    <Input id="experience" type="number" defaultValue={staff.experience} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hireDate">Hire Date</Label>
                    <Input id="hireDate" type="date" defaultValue={staff.hireDate} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Professional Biography</Label>
                  <Textarea id="bio" rows={5} defaultValue={staff.bio} />
                </div>

                <div className="space-y-2">
                  <Label>Specializations</Label>
                  <div className="space-y-2">
                    {staff.specializations.map((specialization, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input defaultValue={specialization} />
                        <Button variant="ghost" size="icon" type="button">
                          <Trash className="h-4 w-4" />
                          <span className="sr-only">Remove specialization</span>
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" type="button" className="mt-2">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Specialization
                    </Button>
                  </div>
                </div>
              </CardContent>
            </TabsContent>

            <TabsContent value="qualifications" className="m-0">
              <CardHeader>
                <CardTitle>Qualifications</CardTitle>
                <CardDescription>Update the staff member's education and certifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Education</Label>
                    <Button variant="outline" type="button" size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Education
                    </Button>
                  </div>

                  {staff.education.map((edu, index) => (
                    <Card key={index}>
                      <CardContent className="pt-6">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor={`degree-${index}`}>Degree/Program</Label>
                            <Input id={`degree-${index}`} defaultValue={edu.degree} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`institution-${index}`}>Institution</Label>
                            <Input id={`institution-${index}`} defaultValue={edu.institution} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`year-${index}`}>Year</Label>
                            <Input id={`year-${index}`} defaultValue={edu.year} />
                          </div>
                          <div className="flex items-end">
                            <Button variant="ghost" type="button" className="text-destructive">
                              <Trash className="mr-2 h-4 w-4" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Certifications</Label>
                    <Button variant="outline" type="button" size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Certification
                    </Button>
                  </div>

                  {staff.certifications.map((cert, index) => (
                    <Card key={index}>
                      <CardContent className="pt-6">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor={`cert-name-${index}`}>Certification Name</Label>
                            <Input id={`cert-name-${index}`} defaultValue={cert.name} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`issuer-${index}`}>Issuing Organization</Label>
                            <Input id={`issuer-${index}`} defaultValue={cert.issuer} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`cert-year-${index}`}>Year Obtained</Label>
                            <Input id={`cert-year-${index}`} defaultValue={cert.year} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`expires-${index}`}>Expiration Year</Label>
                            <Input id={`expires-${index}`} defaultValue={cert.expires} />
                          </div>
                          <div className="flex items-end">
                            <Button variant="ghost" type="button" className="text-destructive">
                              <Trash className="mr-2 h-4 w-4" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </TabsContent>

            <TabsContent value="schedule" className="m-0">
              <CardHeader>
                <CardTitle>Work Schedule</CardTitle>
                <CardDescription>Update the staff member's weekly schedule</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(staff.schedule).map(([day, hours]) => (
                  <div key={day} className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="space-y-2 md:col-span-1">
                      <Label htmlFor={`schedule-${day}`} className="capitalize">
                        {day}
                      </Label>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Input id={`schedule-${day}`} defaultValue={hours} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </TabsContent>
          </Card>
        </Tabs>

        <div className="flex justify-end gap-2">
          <Button variant="outline" asChild>
            <Link href={`/staff/${id}`}>Cancel</Link>
          </Button>
          <Button type="submit">
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
