import { ArrowLeft, ExternalLink, Plus, RefreshCw, Save } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function IntegrationsPage() {
  return (
    <div className="flex flex-col space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/settings">
            <Button variant="outline" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Button>
          </Link>
          <h2 className="text-2xl font-bold tracking-tight">Integrations</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Status
          </Button>
          <Button>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>

      <Tabs defaultValue="active">
        <TabsList className="grid w-full grid-cols-3 md:w-[400px]">
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="available">Available</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="space-y-6 pt-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Electronic Health Records</CardTitle>
                  <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                    Connected
                  </Badge>
                </div>
                <CardDescription>Sync patient records with your EHR system</CardDescription>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="h-10 w-10 rounded-full bg-primary/10 p-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-primary">
                        <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                        <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
                        <path d="M3 16v3a2 2 0 0 0 2 2h3" />
                        <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
                        <rect width="10" height="10" x="7" y="7" rx="2" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium">MediSync EHR</p>
                      <p className="text-xs text-muted-foreground">Last synced: 2 hours ago</p>
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" size="sm" className="w-full">
                  Configure
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Payment Gateway</CardTitle>
                  <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                    Connected
                  </Badge>
                </div>
                <CardDescription>Process payments and manage transactions</CardDescription>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="h-10 w-10 rounded-full bg-primary/10 p-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-primary">
                        <rect width="20" height="14" x="2" y="5" rx="2" />
                        <line x1="2" x2="22" y1="10" y2="10" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium">MediPay</p>
                      <p className="text-xs text-muted-foreground">Connected account: ****4589</p>
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" size="sm" className="w-full">
                  Configure
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">SMS Notifications</CardTitle>
                  <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                    Connected
                  </Badge>
                </div>
                <CardDescription>Send appointment reminders via SMS</CardDescription>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="h-10 w-10 rounded-full bg-primary/10 p-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-primary">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium">TextAlert</p>
                      <p className="text-xs text-muted-foreground">Credits: 2,450 remaining</p>
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" size="sm" className="w-full">
                  Configure
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="available" className="space-y-6 pt-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Telehealth Platform</CardTitle>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                    Available
                  </Badge>
                </div>
                <CardDescription>Conduct virtual appointments with patients</CardDescription>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="h-10 w-10 rounded-full bg-primary/10 p-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-primary">
                        <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14v-4z" />
                        <rect x="3" y="6" width="12" height="12" rx="2" ry="2" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium">MediConnect</p>
                      <p className="text-xs text-muted-foreground">HIPAA compliant video calls</p>
                    </div>
                  </div>
                  <Switch />
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" size="sm" className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Connect
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Insurance Verification</CardTitle>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                    Available
                  </Badge>
                </div>
                <CardDescription>Verify patient insurance eligibility</CardDescription>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="h-10 w-10 rounded-full bg-primary/10 p-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-primary">
                        <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
                        <path d="M13 5v2" />
                        <path d="M13 17v2" />
                        <path d="M13 11v2" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium">InsureCheck</p>
                      <p className="text-xs text-muted-foreground">Real-time eligibility verification</p>
                    </div>
                  </div>
                  <Switch />
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" size="sm" className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Connect
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Lab Results</CardTitle>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                    Available
                  </Badge>
                </div>
                <CardDescription>Integrate with laboratory systems</CardDescription>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="h-10 w-10 rounded-full bg-primary/10 p-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-primary">
                        <path d="M4.18 4.18A2 2 0 0 0 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 1.82-1.18" />
                        <path d="M21 15.5V6a2 2 0 0 0-2-2H9.5" />
                        <path d="M16 2v4" />
                        <path d="M12 2v4" />
                        <path d="M8 2v4" />
                        <path d="M20 10H4" />
                        <path d="m14.5 16-2.5-2.5-7 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium">LabConnect</p>
                      <p className="text-xs text-muted-foreground">Automated lab results import</p>
                    </div>
                  </div>
                  <Switch />
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" size="sm" className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Connect
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="settings" className="space-y-6 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>API Settings</CardTitle>
              <CardDescription>Manage your API keys and webhook endpoints</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">API Keys</h3>
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="api-key">Production API Key</Label>
                    <div className="flex items-center space-x-2">
                      <Input id="api-key" type="password" value="sk_live_51NxXxXxXxXxXxXxXxXxXxXxXx" readOnly />
                      <Button variant="outline" size="sm">
                        Copy
                      </Button>
                      <Button variant="outline" size="sm">
                        Regenerate
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="test-api-key">Test API Key</Label>
                    <div className="flex items-center space-x-2">
                      <Input id="test-api-key" type="password" value="sk_test_51NxXxXxXxXxXxXxXxXxXxXxXx" readOnly />
                      <Button variant="outline" size="sm">
                        Copy
                      </Button>
                      <Button variant="outline" size="sm">
                        Regenerate
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Webhook Endpoints</h3>
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="webhook-url">Webhook URL</Label>
                    <div className="flex items-center space-x-2">
                      <Input id="webhook-url" type="url" placeholder="https://your-domain.com/api/webhook" />
                      <Button variant="outline" size="sm">
                        Verify
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">The URL where webhook events will be sent</p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="webhook-secret">Webhook Secret</Label>
                    <div className="flex items-center space-x-2">
                      <Input id="webhook-secret" type="password" value="whsec_xXxXxXxXxXxXxXxXxXxXxXxX" readOnly />
                      <Button variant="outline" size="sm">
                        Copy
                      </Button>
                      <Button variant="outline" size="sm">
                        Regenerate
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Used to verify webhook signatures</p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between gap-2 flex-wrap">
              <Button variant="outline">Reset to Default</Button>
              <Button>Save Changes</Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Integration Documentation</CardTitle>
              <CardDescription>Access documentation for available integrations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between rounded-lg border p-4 gap-3 flex-wrap">
                  <div className="space-y-0.5">
                    <h3 className="font-medium">API Documentation</h3>
                    <p className="text-sm text-muted-foreground">Complete API reference and guides</p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a href="#" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View
                    </a>
                  </Button>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4 gap-3 flex-wrap">
                  <div className="space-y-0.5">
                    <h3 className="font-medium">Webhook Events</h3>
                    <p className="text-sm text-muted-foreground">List of available webhook events</p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a href="#" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View
                    </a>
                  </Button>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4 gap-3 flex-wrap">
                  <div className="space-y-0.5">
                    <h3 className="font-medium">SDK Documentation</h3>
                    <p className="text-sm text-muted-foreground">Client libraries and SDKs</p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a href="#" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View
                    </a>
                  </Button>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4 gap-3 flex-wrap">
                  <div className="space-y-0.5">
                    <h3 className="font-medium">Integration Tutorials</h3>
                    <p className="text-sm text-muted-foreground">Step-by-step integration guides</p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a href="#" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
