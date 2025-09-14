"use client";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Upload } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function AddPatientPage() {
  const [appointmentDate, setAppointmentDate] = useState<Date | undefined>(new Date());
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center flex-wrap gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/patients">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">Add Patient</h1>
          <p className="text-muted-foreground">Register a new patient in your clinic.</p>
        </div>
      </div>

      <Tabs defaultValue="personal" className="space-y-4">
        <TabsList>
          <TabsTrigger value="personal">Personal Information</TabsTrigger>
          <TabsTrigger value="medical">Medical Information</TabsTrigger>
          <TabsTrigger value="insurance">Insurance & Billing</TabsTrigger>
          <TabsTrigger value="consent">Consent & Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Enter the patient's personal details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="first-name">First Name</Label>
                    <Input id="first-name" placeholder="Enter first name" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="middle-name">Middle Name (Optional)</Label>
                    <Input id="middle-name" placeholder="Enter middle name" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="last-name">Last Name</Label>
                    <Input id="last-name" placeholder="Enter last name" />
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="dob">Date of Birth</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={`w-full justify-start text-left font-normal `}>
                          <span>{appointmentDate ? appointmentDate.toDateString() : "Pick a date"}</span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={appointmentDate} onSelect={setAppointmentDate} />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Select>
                      <SelectTrigger id="gender">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                        <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="marital-status">Marital Status</Label>
                    <Select>
                      <SelectTrigger id="marital-status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Single</SelectItem>
                        <SelectItem value="married">Married</SelectItem>
                        <SelectItem value="divorced">Divorced</SelectItem>
                        <SelectItem value="widowed">Widowed</SelectItem>
                        <SelectItem value="separated">Separated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea id="address" placeholder="Enter address" />
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input id="city" placeholder="Enter city" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input id="state" placeholder="Enter state" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="zip">Zip Code</Label>
                    <Input id="zip" placeholder="Enter zip code" />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Contact Information</h3>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="Enter email address" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" placeholder="Enter phone number" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="alt-phone">Alternative Phone (Optional)</Label>
                    <Input id="alt-phone" placeholder="Enter alternative phone" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="preferred-contact">Preferred Contact Method</Label>
                  <RadioGroup defaultValue="phone" className="flex flex-col space-y-1">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="phone" id="phone-contact" />
                      <Label htmlFor="phone-contact">Phone</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="email" id="email-contact" />
                      <Label htmlFor="email-contact">Email</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="sms" id="sms-contact" />
                      <Label htmlFor="sms-contact">SMS</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Emergency Contact</h3>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="emergency-name">Contact Name</Label>
                    <Input id="emergency-name" placeholder="Enter emergency contact name" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="emergency-relation">Relationship</Label>
                    <Input id="emergency-relation" placeholder="Enter relationship" />
                  </div>
                </div>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="emergency-phone">Phone Number</Label>
                    <Input id="emergency-phone" placeholder="Enter emergency contact phone" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="emergency-email">Email (Optional)</Label>
                    <Input id="emergency-email" type="email" placeholder="Enter emergency contact email" />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Profile Photo</h3>
                <div className="flex items-center gap-4">
                  <div className="h-24 w-24 shrink-0 rounded-full bg-muted flex items-center justify-center">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <input type="file" id="profile-photo" className="hidden" />
                    <Button variant="outline" onClick={() => document.getElementById("profile-photo")?.click()}>Upload Photo</Button>
                    <p className="text-sm text-muted-foreground">Upload a profile photo. JPG, PNG or GIF. Max 2MB.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="medical" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Medical Information</CardTitle>
              <CardDescription>Enter the patient's medical history and details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="blood-type">Blood Type</Label>
                    <Select>
                      <SelectTrigger id="blood-type">
                        <SelectValue placeholder="Select blood type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="a-positive">A+</SelectItem>
                        <SelectItem value="a-negative">A-</SelectItem>
                        <SelectItem value="b-positive">B+</SelectItem>
                        <SelectItem value="b-negative">B-</SelectItem>
                        <SelectItem value="ab-positive">AB+</SelectItem>
                        <SelectItem value="ab-negative">AB-</SelectItem>
                        <SelectItem value="o-positive">O+</SelectItem>
                        <SelectItem value="o-negative">O-</SelectItem>
                        <SelectItem value="unknown">Unknown</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="height">Height (cm)</Label>
                    <Input id="height" type="number" placeholder="Enter height" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="weight">Weight (kg)</Label>
                    <Input id="weight" type="number" placeholder="Enter weight" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="allergies">Allergies</Label>
                  <Textarea id="allergies" placeholder="List any allergies (medications, food, etc.)" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="current-medications">Current Medications</Label>
                  <Textarea id="current-medications" placeholder="List any current medications" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="chronic-conditions">Chronic Conditions</Label>
                  <Textarea id="chronic-conditions" placeholder="List any chronic conditions" />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Medical History</h3>
                <div className="space-y-2">
                  <Label htmlFor="past-surgeries">Past Surgeries</Label>
                  <Textarea id="past-surgeries" placeholder="List any past surgeries with dates" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hospitalizations">Previous Hospitalizations</Label>
                  <Textarea id="hospitalizations" placeholder="List any previous hospitalizations with dates" />
                </div>

                <div className="space-y-2">
                  <Label>Family Medical History</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="diabetes" />
                      <Label htmlFor="diabetes">Diabetes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="heart-disease" />
                      <Label htmlFor="heart-disease">Heart Disease</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="hypertension" />
                      <Label htmlFor="hypertension">Hypertension</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="cancer" />
                      <Label htmlFor="cancer">Cancer</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="asthma" />
                      <Label htmlFor="asthma">Asthma</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="mental-health" />
                      <Label htmlFor="mental-health">Mental Health Conditions</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="family-history-notes">Additional Family History Notes</Label>
                  <Textarea id="family-history-notes" placeholder="Enter any additional family medical history" />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Lifestyle Information</h3>
                <div className="space-y-2">
                  <Label htmlFor="smoking">Smoking Status</Label>
                  <Select>
                    <SelectTrigger id="smoking">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="never">Never Smoked</SelectItem>
                      <SelectItem value="former">Former Smoker</SelectItem>
                      <SelectItem value="current">Current Smoker</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="alcohol">Alcohol Consumption</Label>
                  <Select>
                    <SelectTrigger id="alcohol">
                      <SelectValue placeholder="Select consumption" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="occasional">Occasional</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="heavy">Heavy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="exercise">Exercise Frequency</Label>
                  <Select>
                    <SelectTrigger id="exercise">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="occasional">Occasional</SelectItem>
                      <SelectItem value="regular">Regular</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="diet">Dietary Habits</Label>
                  <Textarea id="diet" placeholder="Describe dietary habits" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insurance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Insurance & Billing Information</CardTitle>
              <CardDescription>Enter the patient's insurance and payment details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Primary Insurance</h3>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="insurance-provider">Insurance Provider</Label>
                    <Input id="insurance-provider" placeholder="Enter insurance provider" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="policy-number">Policy Number</Label>
                    <Input id="policy-number" placeholder="Enter policy number" />
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="group-number">Group Number</Label>
                    <Input id="group-number" placeholder="Enter group number" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="policy-holder">Policy Holder Name</Label>
                    <Input id="policy-holder" placeholder="Enter policy holder name" />
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="relationship">Relationship to Patient</Label>
                    <Select>
                      <SelectTrigger id="relationship">
                        <SelectValue placeholder="Select relationship" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="self">Self</SelectItem>
                        <SelectItem value="spouse">Spouse</SelectItem>
                        <SelectItem value="parent">Parent</SelectItem>
                        <SelectItem value="child">Child</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="insurance-phone">Insurance Phone Number</Label>
                    <Input id="insurance-phone" placeholder="Enter insurance phone number" />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Secondary Insurance</h3>
                  <Switch id="has-secondary" />
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="secondary-provider">Insurance Provider</Label>
                    <Input id="secondary-provider" placeholder="Enter insurance provider" disabled />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="secondary-policy">Policy Number</Label>
                    <Input id="secondary-policy" placeholder="Enter policy number" disabled />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Billing Preferences</h3>
                <div className="space-y-2">
                  <Label htmlFor="billing-method">Preferred Billing Method</Label>
                  <Select>
                    <SelectTrigger id="billing-method">
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="insurance">Insurance Only</SelectItem>
                      <SelectItem value="self-pay">Self-Pay</SelectItem>
                      <SelectItem value="mixed">Insurance + Self-Pay</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Payment Methods</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="credit-card" />
                      <Label htmlFor="credit-card">Credit Card</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="debit-card" />
                      <Label htmlFor="debit-card">Debit Card</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="cash" />
                      <Label htmlFor="cash">Cash</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="check" />
                      <Label htmlFor="check">Check</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="online" />
                      <Label htmlFor="online">Online Payment</Label>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Consent & Documents</CardTitle>
              <CardDescription>Manage patient consent forms and documents.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Required Consent Forms</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-md flex-wrap gap-3">
                    <div>
                      <h4 className="font-medium">HIPAA Consent Form</h4>
                      <p className="text-sm text-muted-foreground">Patient consent for use and disclosure of health information</p>
                    </div>
                    <input type="file" id="hipaa-consent" className="hidden" />
                    <Button variant="outline" onClick={() => document.getElementById("hipaa-consent")?.click()}>Upload</Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-md flex-wrap gap-3">
                    <div>
                      <h4 className="font-medium">Treatment Consent</h4>
                      <p className="text-sm text-muted-foreground">Consent to receive medical treatment</p>
                    </div>
                    <input type="file" id="treatment-consent" className="hidden" />
                    <Button variant="outline" onClick={() => document.getElementById("treatment-consent")?.click()}>Upload</Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-md flex-wrap gap-3">
                    <div>
                      <h4 className="font-medium">Financial Agreement</h4>
                      <p className="text-sm text-muted-foreground">Agreement to pay for services</p>
                    </div>
                    <input type="file" id="financial-agreement" className="hidden" />
                    <Button variant="outline" onClick={() => document.getElementById("financial-agreement")?.click()}>Upload</Button>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Additional Documents</h3>
                <div className="space-y-2">
                  <Label htmlFor="document-type">Document Type</Label>
                  <Select>
                    <SelectTrigger id="document-type">
                      <SelectValue placeholder="Select document type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="id">Identification</SelectItem>
                      <SelectItem value="insurance-card">Insurance Card</SelectItem>
                      <SelectItem value="medical-records">Previous Medical Records</SelectItem>
                      <SelectItem value="lab-results">Lab Results</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <Button variant="outline">Upload Document</Button>
                  <p className="text-sm text-muted-foreground">Upload additional patient documents. PDF, JPG, or PNG. Max 10MB.</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Communication Preferences</h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="appointment-reminders" />
                    <Label htmlFor="appointment-reminders">Receive appointment reminders</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox id="lab-notifications" />
                    <Label htmlFor="lab-notifications">Receive lab result notifications</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox id="prescription-notifications" />
                    <Label htmlFor="prescription-notifications">Receive prescription notifications</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox id="newsletter" />
                    <Label htmlFor="newsletter">Receive clinic newsletter and updates</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-4">
        <Button variant="outline">Cancel</Button>
        <Button>Register Patient</Button>
      </div>
    </div>
  );
}
