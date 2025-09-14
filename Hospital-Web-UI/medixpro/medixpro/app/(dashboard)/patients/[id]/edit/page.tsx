"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { use, useState } from "react";

export default function PatientEditPage({ params }: { params: Promise<{ id: string }> }) {
  const [dob, setDob] = useState<Date | undefined>(new Date());
  // In a real app, you would fetch the patient data based on the ID
  const { id } = use(params);
  const patientId = id;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" asChild>
          <Link href="/patients">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">Edit Patient</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-1/4">
          <Card>
            <CardHeader>
              <CardTitle>Patient Profile</CardTitle>
              <CardDescription>Update the patient's profile picture and status</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <Avatar className="h-32 w-32">
                <AvatarImage src="/user-3.png" alt="Patient" />
                <AvatarFallback>PT</AvatarFallback>
              </Avatar>
              <Button variant="outline" className="w-full">
                Change Photo
              </Button>

              <div className="w-full space-y-2 pt-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="patient-status">Patient Status</Label>
                  <Switch id="patient-status" defaultChecked />
                </div>
                <p className="text-sm text-muted-foreground">Active patients can book appointments and receive care.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="w-full md:w-3/4">
          <Tabs defaultValue="personal">
            <TabsList>
              <TabsTrigger value="personal">Personal Information</TabsTrigger>
              <TabsTrigger value="medical">Medical Information</TabsTrigger>
              <TabsTrigger value="insurance">Insurance & Billing</TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="space-y-4 pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Details</CardTitle>
                  <CardDescription>Update the patient's personal information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first-name">First Name</Label>
                      <Input id="first-name" defaultValue="John" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last-name">Last Name</Label>
                      <Input id="last-name" defaultValue="Smith" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dob">Date of Birth</Label>
                      <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={`w-full justify-start text-left font-normal `}>
                          <span>{dob ? dob.toDateString() : "Pick a date"}</span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={dob} onSelect={setDob} />
                      </PopoverContent>
                    </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender</Label>
                      <Select defaultValue="male">
                        <SelectTrigger id="gender">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" defaultValue="john.smith@example.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input id="phone" defaultValue="+1 (555) 123-4567" />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea id="address" defaultValue="123 Main Street, Apt 4B" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input id="city" defaultValue="New York" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Input id="state" defaultValue="NY" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zip">Zip Code</Label>
                      <Input id="zip" defaultValue="10001" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="emergency-contact">Emergency Contact</Label>
                    <Input id="emergency-contact" defaultValue="Sarah Smith (Wife) - +1 (555) 987-6543" />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="medical" className="space-y-4 pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Medical Information</CardTitle>
                  <CardDescription>Update the patient's medical details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="blood-type">Blood Type</Label>
                    <Select defaultValue="a_positive">
                      <SelectTrigger id="blood-type">
                        <SelectValue placeholder="Select blood type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="a_positive">A+</SelectItem>
                        <SelectItem value="a_negative">A-</SelectItem>
                        <SelectItem value="b_positive">B+</SelectItem>
                        <SelectItem value="b_negative">B-</SelectItem>
                        <SelectItem value="ab_positive">AB+</SelectItem>
                        <SelectItem value="ab_negative">AB-</SelectItem>
                        <SelectItem value="o_positive">O+</SelectItem>
                        <SelectItem value="o_negative">O-</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="height">Height (cm)</Label>
                    <Input id="height" type="number" defaultValue="178" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="weight">Weight (kg)</Label>
                    <Input id="weight" type="number" defaultValue="82" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="allergies">Allergies</Label>
                    <Textarea id="allergies" defaultValue="Penicillin, Peanuts" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="chronic-conditions">Chronic Conditions</Label>
                    <Textarea id="chronic-conditions" defaultValue="Hypertension, Type 2 Diabetes" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="current-medications">Current Medications</Label>
                    <Textarea id="current-medications" defaultValue="Lisinopril 10mg daily, Metformin 500mg twice daily" />
                  </div>

                  <div className="space-y-2">
                    <Label>Smoking Status</Label>
                    <RadioGroup defaultValue="former">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="never" id="never" />
                        <Label htmlFor="never">Never Smoked</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="former" id="former" />
                        <Label htmlFor="former">Former Smoker</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="current" id="current" />
                        <Label htmlFor="current">Current Smoker</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="insurance" className="space-y-4 pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Insurance Information</CardTitle>
                  <CardDescription>Update the patient's insurance details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="insurance-provider">Insurance Provider</Label>
                      <Input id="insurance-provider" defaultValue="Blue Cross Blue Shield" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="policy-number">Policy Number</Label>
                      <Input id="policy-number" defaultValue="XYZ123456789" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="group-number">Group Number</Label>
                      <Input id="group-number" defaultValue="GRP987654" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="policy-holder">Policy Holder</Label>
                      <Input id="policy-holder" defaultValue="John Smith" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="insurance-notes">Additional Notes</Label>
                    <Textarea id="insurance-notes" defaultValue="Co-pay: $25 for primary care, $40 for specialists" />
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Billing Preferences</Label>
                    <RadioGroup defaultValue="insurance">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="insurance" id="insurance" />
                        <Label htmlFor="insurance">Bill Insurance First</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="self" id="self" />
                        <Label htmlFor="self">Self-Pay</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end mt-6 gap-2">
            <Button variant="outline" asChild>
              <Link href={`/patients/${patientId}`}>Cancel</Link>
            </Button>
            <Button>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
