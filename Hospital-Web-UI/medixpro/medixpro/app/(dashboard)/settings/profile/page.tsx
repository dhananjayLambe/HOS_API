import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  Languages,
  Bell,
  Shield,
  Lock,
  LogOut,
  Upload,
  Save,
  Trash2,
  Clock,
  Smartphone,
  Globe,
  FileText,
  AlertCircle,
} from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function ProfileSettingsPage() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild className="h-8 w-8">
          <Link href="/settings">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Profile Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your account settings and preferences</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[250px_1fr]">
        <Card className="h-fit bg-background">
          <CardContent className="p-6">
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src="/medical-professional-profile.png" alt="Dr. Sarah Johnson" />
                <AvatarFallback>SJ</AvatarFallback>
              </Avatar>
              <div className="text-center">
                <h2 className="text-xl font-semibold">Dr. Sarah Johnson</h2>
                <p className="text-sm text-muted-foreground">Chief Medical Officer</p>
              </div>
              <Badge className="bg-green-600 hover:bg-green-700">Active</Badge>
              <div className="grid w-full gap-2">
                <Button variant="outline" className="w-full">
                  <Upload className="mr-2 h-4 w-4" />
                  Change Photo
                </Button>
                <Button variant="outline" className="w-full text-destructive hover:bg-destructive/10">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove Photo
                </Button>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">Email</p>
                  <p className="text-muted-foreground">sarah.johnson@medixpro-clinic.com</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">Phone</p>
                  <p className="text-muted-foreground">+1 (555) 123-4567</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">Joined</p>
                  <p className="text-muted-foreground">March 15, 2020</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Shield className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">Role</p>
                  <p className="text-muted-foreground">System Administrator</p>
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            <Button variant="outline" className="w-full text-destructive hover:bg-destructive/10">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Tabs defaultValue="personal" className="w-full">
            <TabsList>
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="account">Account</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>

            {/* Personal Information Tab */}
            <TabsContent value="personal" className="space-y-6">
              <Card className="bg-background">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="mr-2 h-5 w-5" />
                    Personal Information
                  </CardTitle>
                  <CardDescription>Update your personal details and contact information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="first-name">First Name</Label>
                      <Input id="first-name" defaultValue="Sarah" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last-name">Last Name</Label>
                      <Input id="last-name" defaultValue="Johnson" />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input id="email" type="email" defaultValue="sarah.johnson@medixpro-clinic.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input id="phone" type="tel" defaultValue="+1 (555) 123-4567" />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="dob">Date of Birth</Label>
                      <Input id="dob" type="date" defaultValue="1985-06-15" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender</Label>
                      <Select defaultValue="female">
                        <SelectTrigger id="gender">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                          <SelectItem value="prefer-not">Prefer not to say</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea id="address" defaultValue="123 Medical Plaza, Healthcare District, City, State, 12345" />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="emergency-contact">Emergency Contact Name</Label>
                      <Input id="emergency-contact" defaultValue="Michael Johnson" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emergency-phone">Emergency Contact Phone</Label>
                      <Input id="emergency-phone" type="tel" defaultValue="+1 (555) 987-6543" />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline">Cancel</Button>
                    <Button>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-background">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="mr-2 h-5 w-5" />
                    Professional Information
                  </CardTitle>
                  <CardDescription>Update your professional details and qualifications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="job-title">Job Title</Label>
                      <Input id="job-title" defaultValue="Chief Medical Officer" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="department">Department</Label>
                      <Select defaultValue="administration">
                        <SelectTrigger id="department">
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="administration">Administration</SelectItem>
                          <SelectItem value="cardiology">Cardiology</SelectItem>
                          <SelectItem value="neurology">Neurology</SelectItem>
                          <SelectItem value="pediatrics">Pediatrics</SelectItem>
                          <SelectItem value="orthopedics">Orthopedics</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="specialization">Specialization</Label>
                      <Input id="specialization" defaultValue="Internal Medicine" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="license">Medical License Number</Label>
                      <Input id="license" defaultValue="ML-12345-XYZ" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Professional Bio</Label>
                    <Textarea
                      id="bio"
                      defaultValue="Dr. Sarah Johnson is a board-certified physician with over 15 years of experience in internal medicine and healthcare administration. She has led multiple healthcare initiatives focused on improving patient outcomes and operational efficiency."
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline">Cancel</Button>
                    <Button>Save Changes</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Account Settings Tab */}
            <TabsContent value="account" className="space-y-6">
              <Card className="bg-background">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Globe className="mr-2 h-5 w-5" />
                    Regional Settings
                  </CardTitle>
                  <CardDescription>Configure your language and regional preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="language">Language</Label>
                      <Select defaultValue="en">
                        <SelectTrigger id="language" className="flex items-center">
                          <Languages className="mr-2 h-4 w-4" />
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="es">Spanish</SelectItem>
                          <SelectItem value="fr">French</SelectItem>
                          <SelectItem value="de">German</SelectItem>
                          <SelectItem value="zh">Chinese</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="timezone">Timezone</Label>
                      <Select defaultValue="america_new_york">
                        <SelectTrigger id="timezone">
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="america_new_york">America/New York (UTC-05:00)</SelectItem>
                          <SelectItem value="america_chicago">America/Chicago (UTC-06:00)</SelectItem>
                          <SelectItem value="america_denver">America/Denver (UTC-07:00)</SelectItem>
                          <SelectItem value="america_los_angeles">America/Los Angeles (UTC-08:00)</SelectItem>
                          <SelectItem value="europe_london">Europe/London (UTC+00:00)</SelectItem>
                          <SelectItem value="asia_tokyo">Asia/Tokyo (UTC+09:00)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="date-format">Date Format</Label>
                      <Select defaultValue="mm_dd_yyyy">
                        <SelectTrigger id="date-format">
                          <SelectValue placeholder="Select date format" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mm_dd_yyyy">MM/DD/YYYY</SelectItem>
                          <SelectItem value="dd_mm_yyyy">DD/MM/YYYY</SelectItem>
                          <SelectItem value="yyyy_mm_dd">YYYY/MM/DD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="time-format">Time Format</Label>
                      <Select defaultValue="12h">
                        <SelectTrigger id="time-format">
                          <SelectValue placeholder="Select time format" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="12h">12-hour (AM/PM)</SelectItem>
                          <SelectItem value="24h">24-hour</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline">Reset to Defaults</Button>
                    <Button>Save Preferences</Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-background">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="mr-2 h-5 w-5" />
                    Availability & Schedule
                  </CardTitle>
                  <CardDescription>Configure your working hours and availability</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="monday" className="w-24">
                          Monday
                        </Label>
                        <Select defaultValue="available">
                          <SelectTrigger id="monday" className="w-32">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="available">Available</SelectItem>
                            <SelectItem value="unavailable">Unavailable</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input type="time" defaultValue="09:00" className="w-32" />
                        <span>to</span>
                        <Input type="time" defaultValue="17:00" className="w-32" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="tuesday" className="w-24">
                          Tuesday
                        </Label>
                        <Select defaultValue="available">
                          <SelectTrigger id="tuesday" className="w-32">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="available">Available</SelectItem>
                            <SelectItem value="unavailable">Unavailable</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input type="time" defaultValue="09:00" className="w-32" />
                        <span>to</span>
                        <Input type="time" defaultValue="17:00" className="w-32" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="wednesday" className="w-24">
                          Wednesday
                        </Label>
                        <Select defaultValue="available">
                          <SelectTrigger id="wednesday" className="w-32">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="available">Available</SelectItem>
                            <SelectItem value="unavailable">Unavailable</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input type="time" defaultValue="09:00" className="w-32" />
                        <span>to</span>
                        <Input type="time" defaultValue="17:00" className="w-32" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="thursday" className="w-24">
                          Thursday
                        </Label>
                        <Select defaultValue="available">
                          <SelectTrigger id="thursday" className="w-32">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="available">Available</SelectItem>
                            <SelectItem value="unavailable">Unavailable</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input type="time" defaultValue="09:00" className="w-32" />
                        <span>to</span>
                        <Input type="time" defaultValue="17:00" className="w-32" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="friday" className="w-24">
                          Friday
                        </Label>
                        <Select defaultValue="available">
                          <SelectTrigger id="friday" className="w-32">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="available">Available</SelectItem>
                            <SelectItem value="unavailable">Unavailable</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input type="time" defaultValue="09:00" className="w-32" />
                        <span>to</span>
                        <Input type="time" defaultValue="17:00" className="w-32" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="saturday" className="w-24">
                          Saturday
                        </Label>
                        <Select defaultValue="unavailable">
                          <SelectTrigger id="saturday" className="w-32">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="available">Available</SelectItem>
                            <SelectItem value="unavailable">Unavailable</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input type="time" defaultValue="09:00" className="w-32" disabled />
                        <span>to</span>
                        <Input type="time" defaultValue="17:00" className="w-32" disabled />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="sunday" className="w-24">
                          Sunday
                        </Label>
                        <Select defaultValue="unavailable">
                          <SelectTrigger id="sunday" className="w-32">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="available">Available</SelectItem>
                            <SelectItem value="unavailable">Unavailable</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input type="time" defaultValue="09:00" className="w-32" disabled />
                        <span>to</span>
                        <Input type="time" defaultValue="17:00" className="w-32" disabled />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline">Reset</Button>
                    <Button>Save Schedule</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6">
              <Card className="bg-background">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Bell className="mr-2 h-5 w-5" />
                    Notification Preferences
                  </CardTitle>
                  <CardDescription>Configure how you receive notifications and alerts</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Email Notifications</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="email-appointments">Appointment Reminders</Label>
                          <p className="text-xs text-muted-foreground">Receive reminders about upcoming appointments</p>
                        </div>
                        <Switch id="email-appointments" defaultChecked />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="email-schedule">Schedule Changes</Label>
                          <p className="text-xs text-muted-foreground">Notifications about changes to your schedule</p>
                        </div>
                        <Switch id="email-schedule" defaultChecked />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="email-patients">Patient Updates</Label>
                          <p className="text-xs text-muted-foreground">Updates about your patients</p>
                        </div>
                        <Switch id="email-patients" defaultChecked />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="email-system">System Announcements</Label>
                          <p className="text-xs text-muted-foreground">Important system updates and announcements</p>
                        </div>
                        <Switch id="email-system" defaultChecked />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">In-App Notifications</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="app-appointments">Appointment Alerts</Label>
                          <p className="text-xs text-muted-foreground">Real-time alerts about appointments</p>
                        </div>
                        <Switch id="app-appointments" defaultChecked />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="app-messages">Messages</Label>
                          <p className="text-xs text-muted-foreground">Notifications for new messages</p>
                        </div>
                        <Switch id="app-messages" defaultChecked />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="app-tasks">Task Assignments</Label>
                          <p className="text-xs text-muted-foreground">Alerts when tasks are assigned to you</p>
                        </div>
                        <Switch id="app-tasks" defaultChecked />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">SMS Notifications</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="sms-appointments">Appointment Reminders</Label>
                          <p className="text-xs text-muted-foreground">SMS reminders about upcoming appointments</p>
                        </div>
                        <Switch id="sms-appointments" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="sms-urgent">Urgent Notifications</Label>
                          <p className="text-xs text-muted-foreground">SMS for urgent matters requiring attention</p>
                        </div>
                        <Switch id="sms-urgent" defaultChecked />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone-number">Phone Number for SMS</Label>
                        <Input id="phone-number" type="tel" defaultValue="+1 (555) 123-4567" />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline">Reset to Defaults</Button>
                    <Button>Save Preferences</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6">
              <Card className="bg-background">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Lock className="mr-2 h-5 w-5" />
                    Password
                  </CardTitle>
                  <CardDescription>Update your password and secure your account</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="current-password">Current Password</Label>
                      <Input id="current-password" type="password" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input id="new-password" type="password" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm New Password</Label>
                      <Input id="confirm-password" type="password" />
                    </div>
                  </div>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Password Requirements</AlertTitle>
                    <AlertDescription>
                      <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                        <li>At least 8 characters long</li>
                        <li>Include at least one uppercase letter</li>
                        <li>Include at least one number</li>
                        <li>Include at least one special character</li>
                      </ul>
                    </AlertDescription>
                  </Alert>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline">Cancel</Button>
                    <Button>Update Password</Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-background">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="mr-2 h-5 w-5" />
                    Two-Factor Authentication
                  </CardTitle>
                  <CardDescription>Add an extra layer of security to your account</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="two-factor">Two-Factor Authentication</Label>
                      <p className="text-xs text-muted-foreground">Require a verification code when signing in</p>
                    </div>
                    <Switch id="two-factor" />
                  </div>

                  <div className="rounded-md border border-dashed p-6 text-center">
                    <h3 className="mb-2 text-lg font-medium">Two-Factor Authentication Not Enabled</h3>
                    <p className="mb-4 text-sm text-muted-foreground">
                      Protect your account with an additional layer of security. When two-factor authentication is
                      enabled, you'll be required to enter a verification code along with your password when signing in.
                    </p>
                    <Button>Enable Two-Factor Authentication</Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-background">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Smartphone className="mr-2 h-5 w-5" />
                    Active Sessions
                  </CardTitle>
                  <CardDescription>Manage your active sessions and devices</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-start gap-4">
                        <div className="rounded-full bg-primary/10 p-2">
                          <Smartphone className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">Current Session</p>
                          <p className="text-sm text-muted-foreground">Chrome on Windows • IP: 192.168.1.1</p>
                          <p className="text-xs text-muted-foreground">Active now</p>
                        </div>
                      </div>
                      <Badge className="bg-green-600 hover:bg-green-700">Current</Badge>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-start gap-4">
                        <div className="rounded-full bg-primary/10 p-2">
                          <Smartphone className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">iPhone 13 Pro</p>
                          <p className="text-sm text-muted-foreground">Safari on iOS • IP: 192.168.1.2</p>
                          <p className="text-xs text-muted-foreground">Last active: 2 hours ago</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Sign Out
                      </Button>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-start gap-4">
                        <div className="rounded-full bg-primary/10 p-2">
                          <Smartphone className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">MacBook Pro</p>
                          <p className="text-sm text-muted-foreground">Firefox on macOS • IP: 192.168.1.3</p>
                          <p className="text-xs text-muted-foreground">Last active: Yesterday at 3:15 PM</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Sign Out
                      </Button>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button variant="outline" className="text-destructive hover:bg-destructive/10">
                      Sign Out All Other Devices
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
