"use client";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Briefcase, Building2, Calendar1, Clock, DollarSign, GraduationCap, Key, Mail, MapPin, Phone, Save, Shield, Upload, User, UserPlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function AddStaffPage() {
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>(new Date());
  const [issueDate, setIssueDate] = useState<Date | undefined>(new Date());
  const [expiryDate, setExpiryDate] = useState<Date | undefined>(new Date());
  const [joiningDate, setJoiningDate] = useState<Date | undefined>(new Date());
  const [contractStartDate, setContractStartDate] = useState<Date | undefined>(new Date());
  const [contractEndDate, setContractEndDate] = useState<Date | undefined>(new Date());
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center flex-wrap gap-2">
        <Button variant="outline" size="icon" asChild>
          <Link href="/staff">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">Add New Staff</h1>
          <p className="text-muted-foreground">Create a new staff member profile</p>
        </div>
      </div>

      <Tabs defaultValue="personal" className="w-full">
        <TabsList>
          <TabsTrigger value="personal">Personal Info</TabsTrigger>
          <TabsTrigger value="professional">Professional</TabsTrigger>
          <TabsTrigger value="employment">Employment</TabsTrigger>
          <TabsTrigger value="access">Access & Roles</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Enter the staff member's basic personal information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0">
                <div className="flex h-32 w-32 items-center justify-center rounded-md border border-dashed">
                  <label htmlFor="photo" className="flex flex-col items-center space-y-2">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <input type="file" id="photo" className="hidden" />
                    <span className="text-xs text-muted-foreground">Upload photo</span>
                  </label>
                </div>
                <div className="grid flex-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="first-name">First Name</Label>
                    <Input id="first-name" placeholder="Enter first name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last-name">Last Name</Label>
                    <Input id="last-name" placeholder="Enter last name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date-of-birth">Date of Birth</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={`w-full justify-start text-left font-normal `}>
                          <span>{dateOfBirth ? dateOfBirth.toDateString() : "Pick a date"}</span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={dateOfBirth} onSelect={setDateOfBirth} />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
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
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input id="email" type="email" placeholder="Enter email address" className="pl-8" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input id="phone" type="tel" placeholder="Enter phone number" className="pl-8" />
                  </div>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <div className="relative">
                    <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input id="address" placeholder="Enter address" className="pl-8" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" placeholder="Enter city" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State/Province</Label>
                  <Input id="state" placeholder="Enter state or province" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postal-code">Postal Code</Label>
                  <Input id="postal-code" placeholder="Enter postal code" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Select>
                    <SelectTrigger id="country">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="us">United States</SelectItem>
                      <SelectItem value="ca">Canada</SelectItem>
                      <SelectItem value="uk">United Kingdom</SelectItem>
                      <SelectItem value="au">Australia</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergency-contact">Emergency Contact</Label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input id="emergency-contact-name" placeholder="Contact name" />
                  <Input id="emergency-contact-phone" placeholder="Contact phone" />
                  <Input id="emergency-contact-relation" placeholder="Relationship" className="sm:col-span-2" />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" asChild>
                <Link href="/staff">Cancel</Link>
              </Button>
              <Button>
                <Save className="mr-2 h-4 w-4" />
                Save & Continue
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="professional" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Professional Information</CardTitle>
              <CardDescription>Enter the staff member's professional qualifications and credentials</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="profession">Profession</Label>
                  <div className="relative">
                    <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input id="profession" placeholder="e.g. Doctor, Nurse, etc." className="pl-8" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specialization">Specialization</Label>
                  <div className="relative">
                    <Briefcase className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input id="specialization" placeholder="e.g. Cardiology, Pediatrics, etc." className="pl-8" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Qualifications & Degrees</Label>
                <div className="grid gap-4">
                  <div className="grid gap-4 rounded-md border p-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="degree">Degree/Certification</Label>
                        <div className="relative">
                          <GraduationCap className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input id="degree" placeholder="e.g. MD, RN, etc." className="pl-8" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="institution">Institution</Label>
                        <Input id="institution" placeholder="University/College name" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="year">Year Completed</Label>
                        <Input id="year" type="number" placeholder="YYYY" />
                      </div>
                      <div className="flex items-end">
                        <Button variant="outline" className="w-full">
                          Add More
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Licenses & Certifications</Label>
                <div className="grid gap-4">
                  <div className="grid gap-4 rounded-md border p-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="license-type">License Type</Label>
                        <Input id="license-type" placeholder="e.g. Medical License" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="license-number">License Number</Label>
                        <Input id="license-number" placeholder="Enter license number" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="issue-date">Issue Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className={`w-full justify-start text-left font-normal `}>
                              <span>{issueDate ? issueDate.toDateString() : "Pick a date"}</span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={issueDate} onSelect={setIssueDate} />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="expiry-date">Expiry Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className={`w-full justify-start text-left font-normal `}>
                              <span>{expiryDate ? expiryDate.toDateString() : "Pick a date"}</span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={expiryDate} onSelect={setExpiryDate} />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="issuing-authority">Issuing Authority</Label>
                        <Input id="issuing-authority" placeholder="Enter issuing authority" />
                      </div>
                      <div className="flex items-end sm:col-span-2">
                        <Button variant="outline" className="w-full">
                          Add More
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="professional-bio">Professional Bio</Label>
                <Textarea id="professional-bio" placeholder="Enter professional biography and experience" className="min-h-[120px]" />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between flex-wrap gap-2">
              <Button variant="outline">Previous</Button>
              <Button>
                <Save className="mr-2 h-4 w-4" />
                Save & Continue
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="employment" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Employment Details</CardTitle>
              <CardDescription>Enter the staff member's employment information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="employee-id">Employee ID</Label>
                  <Input id="employee-id" placeholder="Enter employee ID" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <div className="relative">
                    <Building2 className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Select>
                      <SelectTrigger id="department" className="pl-8">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="medical">Medical</SelectItem>
                        <SelectItem value="nursing">Nursing</SelectItem>
                        <SelectItem value="admin">Administration</SelectItem>
                        <SelectItem value="lab">Laboratory</SelectItem>
                        <SelectItem value="pharmacy">Pharmacy</SelectItem>
                        <SelectItem value="radiology">Radiology</SelectItem>
                        <SelectItem value="therapy">Therapy</SelectItem>
                        <SelectItem value="support">Support</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Position/Role</Label>
                  <Input id="position" placeholder="Enter position or role" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reporting-to">Reporting To</Label>
                  <Select>
                    <SelectTrigger id="reporting-to">
                      <SelectValue placeholder="Select supervisor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dr-johnson">Dr. Sarah Johnson</SelectItem>
                      <SelectItem value="dr-chen">Dr. Michael Chen</SelectItem>
                      <SelectItem value="emma-r">Emma Rodriguez</SelectItem>
                      <SelectItem value="robert-d">Robert Davis</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="join-date">Join Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={`w-full justify-start text-left font-normal `}>
                        <span>{joiningDate ? joiningDate.toDateString() : "Pick a date"}</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={joiningDate} onSelect={setJoiningDate} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employment-type">Employment Type</Label>
                  <Select>
                    <SelectTrigger id="employment-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full-time">Full-time</SelectItem>
                      <SelectItem value="part-time">Part-time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="temporary">Temporary</SelectItem>
                      <SelectItem value="intern">Intern</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="work-schedule">Work Schedule</Label>
                  <div className="relative">
                    <Clock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Select>
                      <SelectTrigger id="work-schedule" className="pl-8">
                        <SelectValue placeholder="Select schedule" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="regular">Regular (9AM-5PM)</SelectItem>
                        <SelectItem value="morning">Morning Shift</SelectItem>
                        <SelectItem value="evening">Evening Shift</SelectItem>
                        <SelectItem value="night">Night Shift</SelectItem>
                        <SelectItem value="rotating">Rotating Shifts</SelectItem>
                        <SelectItem value="custom">Custom Schedule</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="work-hours">Work Hours (Weekly)</Label>
                  <Input id="work-hours" type="number" placeholder="e.g. 40" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Contract Details</Label>
                <div className="rounded-md border p-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="contract-start">Contract Start</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={`w-full justify-start text-left font-normal `}>
                            <span>{contractStartDate ? contractStartDate.toDateString() : "Pick a date"}</span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={contractStartDate} onSelect={setContractStartDate} />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contract-end">Contract End (if applicable)</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={`w-full justify-start text-left font-normal `}>
                            <span>{contractEndDate ? contractEndDate.toDateString() : "Pick a date"}</span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={contractEndDate} onSelect={setContractEndDate} />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="contract-details">Contract Notes</Label>
                      <Textarea id="contract-details" placeholder="Enter any additional contract details" className="min-h-[80px]" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Compensation & Benefits</Label>
                <div className="rounded-md border p-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="salary">Salary/Wage</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input id="salary" placeholder="Enter amount" className="pl-8" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="payment-frequency">Payment Frequency</Label>
                      <Select>
                        <SelectTrigger id="payment-frequency">
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hourly">Hourly</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="biweekly">Bi-weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="annually">Annually</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Benefits</Label>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox id="health-insurance" />
                          <Label htmlFor="health-insurance" className="font-normal">
                            Health Insurance
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="dental-insurance" />
                          <Label htmlFor="dental-insurance" className="font-normal">
                            Dental Insurance
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="vision-insurance" />
                          <Label htmlFor="vision-insurance" className="font-normal">
                            Vision Insurance
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="retirement-plan" />
                          <Label htmlFor="retirement-plan" className="font-normal">
                            Retirement Plan
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="paid-time-off" />
                          <Label htmlFor="paid-time-off" className="font-normal">
                            Paid Time Off
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="professional-development" />
                          <Label htmlFor="professional-development" className="font-normal">
                            Professional Development
                          </Label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between flex-wrap gap-2">
              <Button variant="outline">Previous</Button>
              <Button>
                <Save className="mr-2 h-4 w-4" />
                Save & Continue
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="access" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Access & Roles</CardTitle>
              <CardDescription>Set up system access and role permissions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <div className="relative">
                    <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input id="username" placeholder="Enter username" className="pl-8" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-access">Email for Access</Label>
                  <div className="relative">
                    <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input id="email-access" type="email" placeholder="Enter email address" className="pl-8" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Temporary Password</Label>
                  <div className="relative">
                    <Key className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input id="password" type="password" placeholder="Enter temporary password" className="pl-8" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <Key className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input id="confirm-password" type="password" placeholder="Confirm password" className="pl-8" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>System Role</Label>
                <div className="rounded-md border p-2 xl:p-4">
                  <RadioGroup defaultValue="staff">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="flex items-center space-x-3 rounded-md border p-3">
                        <RadioGroupItem value="admin" id="admin-role" />
                        <div className="space-y-1">
                          <Label htmlFor="admin-role" className="font-medium">
                            Administrator
                          </Label>
                          <p className="text-xs text-muted-foreground">Full access to all system features and settings</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 rounded-md border p-3">
                        <RadioGroupItem value="manager" id="manager-role" />
                        <div className="space-y-1">
                          <Label htmlFor="manager-role" className="font-medium">
                            Manager
                          </Label>
                          <p className="text-xs text-muted-foreground">Access to manage staff, schedules, and reports</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 rounded-md border p-3">
                        <RadioGroupItem value="doctor" id="doctor-role" />
                        <div className="space-y-1">
                          <Label htmlFor="doctor-role" className="font-medium">
                            Doctor
                          </Label>
                          <p className="text-xs text-muted-foreground">Access to patient records, appointments, and prescriptions</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 rounded-md border p-3">
                        <RadioGroupItem value="nurse" id="nurse-role" />
                        <div className="space-y-1">
                          <Label htmlFor="nurse-role" className="font-medium">
                            Nurse
                          </Label>
                          <p className="text-xs text-muted-foreground">Access to patient care, vitals, and treatment plans</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 rounded-md border p-3">
                        <RadioGroupItem value="receptionist" id="receptionist-role" />
                        <div className="space-y-1">
                          <Label htmlFor="receptionist-role" className="font-medium">
                            Receptionist
                          </Label>
                          <p className="text-xs text-muted-foreground">Access to appointments, patient registration, and billing</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 rounded-md border p-3">
                        <RadioGroupItem value="staff" id="staff-role" />
                        <div className="space-y-1">
                          <Label htmlFor="staff-role" className="font-medium">
                            Staff
                          </Label>
                          <p className="text-xs text-muted-foreground">Basic access to assigned modules only</p>
                        </div>
                      </div>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Module Permissions</Label>
                  <Button variant="outline" size="sm">
                    <Shield className="mr-2 h-4 w-4" />
                    Use Role Default
                  </Button>
                </div>
                <div className="rounded-md border p-4">
                  <div className="space-y-4">
                    <div>
                      <div className="mb-2 font-medium">Patients</div>
                      <div className="grid gap-2 sm:grid-cols-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox id="patients-view" />
                          <Label htmlFor="patients-view" className="font-normal">
                            View
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="patients-add" />
                          <Label htmlFor="patients-add" className="font-normal">
                            Add
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="patients-edit" />
                          <Label htmlFor="patients-edit" className="font-normal">
                            Edit
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="patients-delete" />
                          <Label htmlFor="patients-delete" className="font-normal">
                            Delete
                          </Label>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 font-medium">Appointments</div>
                      <div className="grid gap-2 sm:grid-cols-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox id="appointments-view" />
                          <Label htmlFor="appointments-view" className="font-normal">
                            View
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="appointments-add" />
                          <Label htmlFor="appointments-add" className="font-normal">
                            Add
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="appointments-edit" />
                          <Label htmlFor="appointments-edit" className="font-normal">
                            Edit
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="appointments-delete" />
                          <Label htmlFor="appointments-delete" className="font-normal">
                            Delete
                          </Label>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 font-medium">Prescriptions</div>
                      <div className="grid gap-2 sm:grid-cols-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox id="prescriptions-view" />
                          <Label htmlFor="prescriptions-view" className="font-normal">
                            View
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="prescriptions-add" />
                          <Label htmlFor="prescriptions-add" className="font-normal">
                            Add
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="prescriptions-edit" />
                          <Label htmlFor="prescriptions-edit" className="font-normal">
                            Edit
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="prescriptions-delete" />
                          <Label htmlFor="prescriptions-delete" className="font-normal">
                            Delete
                          </Label>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 font-medium">Billing</div>
                      <div className="grid gap-2 sm:grid-cols-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox id="billing-view" />
                          <Label htmlFor="billing-view" className="font-normal">
                            View
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="billing-add" />
                          <Label htmlFor="billing-add" className="font-normal">
                            Add
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="billing-edit" />
                          <Label htmlFor="billing-edit" className="font-normal">
                            Edit
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="billing-delete" />
                          <Label htmlFor="billing-delete" className="font-normal">
                            Delete
                          </Label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Account Settings</Label>
                <div className="rounded-md border p-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="force-password-change" defaultChecked />
                      <Label htmlFor="force-password-change" className="font-normal">
                        Force password change on first login
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="two-factor-auth" />
                      <Label htmlFor="two-factor-auth" className="font-normal">
                        Enable two-factor authentication
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="account-active" defaultChecked />
                      <Label htmlFor="account-active" className="font-normal">
                        Account active
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between flex-wrap gap-2">
              <Button variant="outline">Previous</Button>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Create Staff Account
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
