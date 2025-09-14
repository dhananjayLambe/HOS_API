import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Building,
  Globe,
  Mail,
  Phone,
  Clock,
  Calendar,
  Languages,
  PaintBucket,
  Upload,
  Save,
  RefreshCcw,
  Shield,
  Lock,
  Key,
  FileJson,
  Database,
  HardDrive,
} from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold">General Settings</h2>
        <p className="text-sm text-muted-foreground">Configure your clinic settings and preferences</p>
      </div>

      <Tabs defaultValue="clinic" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
          <TabsTrigger value="clinic">Clinic Info</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        {/* Clinic Information Tab */}
        <TabsContent value="clinic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="mr-2 h-5 w-5" />
                Clinic Information
              </CardTitle>
              <CardDescription>Update your clinic's basic information and contact details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="clinic-name">Clinic Name</Label>
                  <Input id="clinic-name" defaultValue="MedixPro Clinic" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clinic-id">Clinic ID/Registration Number</Label>
                  <Input id="clinic-id" defaultValue="MC-12345-XYZ" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea id="address" defaultValue="123 Medical Plaza, Healthcare District, City, State, 12345" />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center">
                    <Mail className="mr-2 h-4 w-4" />
                    Email Address
                  </Label>
                  <Input id="email" type="email" defaultValue="contact@medixpro-clinic.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center">
                    <Phone className="mr-2 h-4 w-4" />
                    Phone Number
                  </Label>
                  <Input id="phone" type="tel" defaultValue="+1 (555) 123-4567" />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="website" className="flex items-center">
                    <Globe className="mr-2 h-4 w-4" />
                    Website
                  </Label>
                  <Input id="website" type="url" defaultValue="https://medixpro-clinic.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tax-id">Tax ID</Label>
                  <Input id="tax-id" defaultValue="TAX-987654321" />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Operating Hours</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="weekday-hours" className="text-sm text-muted-foreground">
                      Weekdays
                    </Label>
                    <Input id="weekday-hours" defaultValue="8:00 AM - 6:00 PM" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weekend-hours" className="text-sm text-muted-foreground">
                      Weekends
                    </Label>
                    <Input id="weekend-hours" defaultValue="9:00 AM - 2:00 PM" />
                  </div>
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

          <Card>
            <CardHeader>
              <CardTitle>Emergency Contact</CardTitle>
              <CardDescription>Set up emergency contact information for your clinic</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="emergency-name">Contact Name</Label>
                  <Input id="emergency-name" defaultValue="Dr. Sarah Johnson" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergency-phone">Emergency Phone</Label>
                  <Input id="emergency-phone" defaultValue="+1 (555) 987-6543" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergency-instructions">Emergency Instructions</Label>
                <Textarea
                  id="emergency-instructions"
                  defaultValue="In case of system failure, contact the emergency number immediately. For power outages, the backup generator should activate automatically."
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline">Cancel</Button>
                <Button>Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="mr-2 h-5 w-5" />
                Regional Settings
              </CardTitle>
              <CardDescription>Configure time, date, and regional preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
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
              </div>

              <div className="grid gap-4 md:grid-cols-2">
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
                <div className="space-y-2">
                  <Label htmlFor="first-day">First Day of Week</Label>
                  <Select defaultValue="sunday">
                    <SelectTrigger id="first-day">
                      <SelectValue placeholder="Select first day" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sunday">Sunday</SelectItem>
                      <SelectItem value="monday">Monday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

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

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Calendar Settings</h3>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="calendar-view">Default Calendar View</Label>
                    <Select defaultValue="week">
                      <SelectTrigger id="calendar-view">
                        <SelectValue placeholder="Select view" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="day">Day</SelectItem>
                        <SelectItem value="week">Week</SelectItem>
                        <SelectItem value="month">Month</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slot-duration">Default Appointment Duration</Label>
                    <Select defaultValue="30">
                      <SelectTrigger id="slot-duration">
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="45">45 minutes</SelectItem>
                        <SelectItem value="60">60 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch id="show-weekends" defaultChecked />
                  <Label htmlFor="show-weekends">Show weekends in calendar</Label>
                </div>
              </div>

              <div className="flex justify-end gap-2 flex-wrap">
                <Button variant="outline">Reset to Defaults</Button>
                <Button>Save Preferences</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="mr-2 h-5 w-5" />
                Appointment Settings
              </CardTitle>
              <CardDescription>Configure appointment scheduling preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch id="allow-online-booking" defaultChecked />
                  <Label className="leading-tight" htmlFor="allow-online-booking">Allow online appointment booking</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch id="require-approval" />
                  <Label className="leading-tight" htmlFor="require-approval">Require approval for online bookings</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch id="send-reminders" defaultChecked />
                  <Label className="leading-tight" htmlFor="send-reminders">Send appointment reminders</Label>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="reminder-time">Reminder Time</Label>
                  <Select defaultValue="24h">
                    <SelectTrigger id="reminder-time">
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1h">1 hour before</SelectItem>
                      <SelectItem value="3h">3 hours before</SelectItem>
                      <SelectItem value="12h">12 hours before</SelectItem>
                      <SelectItem value="24h">24 hours before</SelectItem>
                      <SelectItem value="48h">48 hours before</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="buffer-time">Buffer Time Between Appointments</Label>
                  <Select defaultValue="15">
                    <SelectTrigger id="buffer-time">
                      <SelectValue placeholder="Select buffer time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">No buffer</SelectItem>
                      <SelectItem value="5">5 minutes</SelectItem>
                      <SelectItem value="10">10 minutes</SelectItem>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline">Cancel</Button>
                <Button>Save Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branding Tab */}
        <TabsContent value="branding" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <PaintBucket className="mr-2 h-5 w-5" />
                Branding & Appearance
              </CardTitle>
              <CardDescription>Customize your clinic's visual identity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label>Clinic Logo</Label>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="h-24 w-24 rounded-md border border-dashed border-muted-foreground flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-12 w-12 text-primary"
                    >
                      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                    </svg>
                  </div>
                  <div className="space-y-2">
                    <Button variant="outline" className="flex items-center">
                      <Upload className="mr-2 h-4 w-4" />
                      Upload New Logo
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Recommended size: 512x512px. Max file size: 2MB. Formats: PNG, JPG, SVG
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Label>Favicon</Label>
                <div className="flex items-center flex-wrap gap-4">
                  <div className="h-12 w-12 rounded-md border border-dashed border-muted-foreground flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-6 w-6 text-primary"
                    >
                      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                    </svg>
                  </div>
                  <div className="space-y-2">
                    <Button variant="outline" className="flex items-center">
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Favicon
                    </Button>
                    <p className="text-xs text-muted-foreground">Recommended size: 32x32px. Format: ICO, PNG</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Color Scheme</h3>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="primary-color">Primary Color</Label>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary"></div>
                      <Input id="primary-color" defaultValue="#0284c7" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondary-color">Secondary Color</Label>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-secondary"></div>
                      <Input id="secondary-color" defaultValue="#7c3aed" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="theme-mode">Theme Mode</Label>
                  <Select defaultValue="dark">
                    <SelectTrigger id="theme-mode">
                      <SelectValue placeholder="Select theme mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System Default</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Email Template</h3>
                <div className="space-y-2">
                  <Label htmlFor="email-header">Email Header Text</Label>
                  <Input id="email-header" defaultValue="MedixPro Clinic - Your Health, Our Priority" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-footer">Email Footer Text</Label>
                  <Textarea
                    id="email-footer"
                    defaultValue="© 2023 MedixPro Clinic. All rights reserved. 123 Medical Plaza, Healthcare District, City, State, 12345"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 flex-wrap">
                <Button variant="outline">Reset to Defaults</Button>
                <Button>Save Branding</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="mr-2 h-5 w-5" />
                Security Settings
              </CardTitle>
              <CardDescription>Configure security and privacy settings for your clinic</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Password Policy</h3>

                <div className="space-y-2">
                  <Label htmlFor="password-expiry">Password Expiry</Label>
                  <Select defaultValue="90">
                    <SelectTrigger id="password-expiry">
                      <SelectValue placeholder="Select expiry period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="60">60 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="180">180 days</SelectItem>
                      <SelectItem value="never">Never</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="min-length">Minimum Password Length</Label>
                  <Select defaultValue="8">
                    <SelectTrigger id="min-length">
                      <SelectValue placeholder="Select minimum length" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6">6 characters</SelectItem>
                      <SelectItem value="8">8 characters</SelectItem>
                      <SelectItem value="10">10 characters</SelectItem>
                      <SelectItem value="12">12 characters</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch id="require-uppercase" defaultChecked />
                    <Label htmlFor="require-uppercase">Require uppercase letters</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch id="require-numbers" defaultChecked />
                    <Label htmlFor="require-numbers">Require numbers</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch id="require-special" defaultChecked />
                    <Label htmlFor="require-special">Require special characters</Label>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Login Security</h3>

                <div className="flex items-center space-x-2">
                  <Switch id="two-factor" />
                  <Label htmlFor="two-factor">Enforce two-factor authentication</Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="session-timeout">Session Timeout</Label>
                  <Select defaultValue="30">
                    <SelectTrigger id="session-timeout">
                      <SelectValue placeholder="Select timeout period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                      <SelectItem value="240">4 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-attempts">Maximum Login Attempts</Label>
                  <Select defaultValue="5">
                    <SelectTrigger id="max-attempts">
                      <SelectValue placeholder="Select maximum attempts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 attempts</SelectItem>
                      <SelectItem value="5">5 attempts</SelectItem>
                      <SelectItem value="10">10 attempts</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Data Protection</h3>

                <div className="flex items-center space-x-2">
                  <Switch id="encrypt-data" defaultChecked />
                  <Label htmlFor="encrypt-data">Encrypt sensitive data</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch id="audit-logs" defaultChecked />
                  <Label htmlFor="audit-logs">Enable audit logs</Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="log-retention">Log Retention Period</Label>
                  <Select defaultValue="365">
                    <SelectTrigger id="log-retention">
                      <SelectValue placeholder="Select retention period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="180">180 days</SelectItem>
                      <SelectItem value="365">1 year</SelectItem>
                      <SelectItem value="730">2 years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end flex-wrap gap-2">
                <Button variant="outline">Reset to Defaults</Button>
                <Button>
                  <Lock className="mr-2 h-4 w-4" />
                  Save Security Settings
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Key className="mr-2 h-5 w-5" />
                API Access
              </CardTitle>
              <CardDescription>Manage API keys and external integrations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch id="enable-api" defaultChecked />
                  <Label htmlFor="enable-api">Enable API access</Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="api-key">API Key</Label>
                  <div className="flex items-center gap-2">
                    <Input id="api-key" type="password" value="••••••••••••••••••••••••••••••" readOnly />
                    <Button variant="outline" size="sm">
                      Show
                    </Button>
                    <Button variant="outline" size="sm">
                      <RefreshCcw className="mr-2 h-4 w-4" />
                      Regenerate
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Last generated: 2023-10-15</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">API Rate Limits</h3>

                <div className="space-y-2">
                  <Label htmlFor="rate-limit">Requests per Minute</Label>
                  <Select defaultValue="100">
                    <SelectTrigger id="rate-limit">
                      <SelectValue placeholder="Select rate limit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="60">60 requests</SelectItem>
                      <SelectItem value="100">100 requests</SelectItem>
                      <SelectItem value="500">500 requests</SelectItem>
                      <SelectItem value="1000">1000 requests</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="allowed-origins">Allowed Origins</Label>
                  <Textarea
                    id="allowed-origins"
                    defaultValue="https://medixpro-clinic.com&#10;https://api.medixpro-clinic.com"
                  />
                  <p className="text-xs text-muted-foreground">Enter one domain per line</p>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline">Cancel</Button>
                <Button>Save API Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileJson className="mr-2 h-5 w-5" />
                System Configuration
              </CardTitle>
              <CardDescription>Advanced system settings and maintenance options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">System Maintenance</h3>

                <div className="grid gap-4 md:grid-cols-2">
                  <Button variant="outline" className="flex items-center justify-center">
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Clear Cache
                  </Button>
                  <Button variant="outline" className="flex items-center justify-center">
                    <Database className="mr-2 h-4 w-4" />
                    Optimize Database
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maintenance-mode">Maintenance Mode</Label>
                  <div className="flex items-center gap-4">
                    <Switch id="maintenance-mode" />
                    <div>
                      <p className="text-sm">Enable maintenance mode</p>
                      <p className="text-xs text-muted-foreground">
                        This will make the system inaccessible to regular users
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Backup & Restore</h3>

                <div className="space-y-2">
                  <Label htmlFor="backup-frequency">Automatic Backup Frequency</Label>
                  <Select defaultValue="daily">
                    <SelectTrigger id="backup-frequency">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="never">Never</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="backup-retention">Backup Retention</Label>
                  <Select defaultValue="30">
                    <SelectTrigger id="backup-retention">
                      <SelectValue placeholder="Select retention period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Button variant="outline" className="flex items-center justify-center">
                    <HardDrive className="mr-2 h-4 w-4" />
                    Create Manual Backup
                  </Button>
                  <Button variant="outline" className="flex items-center justify-center">
                    <Upload className="mr-2 h-4 w-4" />
                    Restore from Backup
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">System Information</h3>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Version</span>
                    <span className="text-sm">v2.5.3</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Last Updated</span>
                    <span className="text-sm">2023-11-10</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Database Size</span>
                    <span className="text-sm">1.2 GB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Storage Usage</span>
                    <span className="text-sm">45.8 GB / 100 GB</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end flex-wrap gap-2">
                <Button variant="outline">Reset to Defaults</Button>
                <Button>Save System Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
