import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Users, Edit, Download, Copy, Clock, UserPlus, Search, Filter, MoreHorizontal } from "lucide-react"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { use } from "react"

interface Module {
  id: string;
  name: string;
  description: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  department: string;
  position: string;
  assignedDate: string;
  status: string;
  avatar: string;
}

interface AuditLog {
  id: number;
  action: string;
  module: string;
  permission: string;
  timestamp: string;
  user: string;
}

interface Role {
  id: string;
  name: string;
  category: string;
  description: string;
  users: number;
  isDefault: boolean;
  lastUpdated: string;
  updatedBy: string;
  createdAt: string;
  createdBy: string;
  permissions: {
    [key: string]: string[];
  };
}

export default function RoleDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  // Mock data for the role
  const { id } = use(params)
  const role: Role = {
    id: id,
    name: "Administrator",
    category: "Administrative",
    description: "Full system access with all permissions",
    users: 3,
    isDefault: true,
    lastUpdated: "2023-11-15",
    updatedBy: "System Admin",
    createdAt: "2023-01-10",
    createdBy: "System Admin",
    permissions: {
      dashboard: ["view", "edit"],
      patients: ["view", "edit", "create", "delete"],
      appointments: ["view", "edit", "create", "delete"],
      billing: ["view", "edit", "create", "delete"],
      reports: ["view", "edit", "create", "delete"],
      settings: ["view", "edit"],
      inventory: ["view", "edit", "create", "delete"],
      staff: ["view", "edit", "create", "delete"],
    },
  }

  // Mock data for users with this role
  const users: User[] = [
    {
      id: 1,
      name: "Dr. Sarah Johnson",
      email: "sarah.johnson@clinic.com",
      department: "Cardiology",
      position: "Medical Director",
      assignedDate: "2023-01-15",
      status: "Active",
      avatar: "/medical-professional-profile.png",
    },
    {
      id: 2,
      name: "Michael Chen",
      email: "michael.chen@clinic.com",
      department: "Administration",
      position: "IT Manager",
      assignedDate: "2023-02-10",
      status: "Active",
      avatar: "/abstract-jr.png",
    },
    {
      id: 3,
      name: "Emily Rodriguez",
      email: "emily.rodriguez@clinic.com",
      department: "Administration",
      position: "Clinic Manager",
      assignedDate: "2023-03-05",
      status: "Active",
      avatar: "/thoughtful-artist.png",
    },
  ]

  // Modules for permission matrix
  const modules: Module[] = [
    { id: "dashboard", name: "Dashboard", description: "Access to system dashboard and analytics" },
    { id: "patients", name: "Patients", description: "Patient records and management" },
    { id: "appointments", name: "Appointments", description: "Scheduling and appointment management" },
    { id: "billing", name: "Billing", description: "Invoices, payments, and financial records" },
    { id: "reports", name: "Reports", description: "Analytics and reporting tools" },
    { id: "settings", name: "Settings", description: "System configuration and settings" },
    { id: "inventory", name: "Inventory", description: "Medical supplies and equipment" },
    { id: "staff", name: "Staff", description: "Staff management and scheduling" },
  ]

  // Permission types
  const permissionTypes: string[] = ["view", "create", "edit", "delete"]

  // Audit logs for this role
  const auditLogs: AuditLog[] = [
    {
      id: 1,
      action: "Permission Added",
      module: "Reports",
      permission: "delete",
      timestamp: "2023-11-15 09:23:45",
      user: "System Admin",
    },
    {
      id: 2,
      action: "Permission Removed",
      module: "Billing",
      permission: "edit",
      timestamp: "2023-10-14 14:12:30",
      user: "Dr. Sarah Johnson",
    },
    {
      id: 3,
      action: "Role Updated",
      module: "All",
      permission: "N/A",
      timestamp: "2023-09-10 11:05:22",
      user: "Dr. Sarah Johnson",
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="outline" size="icon" asChild className="h-8 w-8">
          <Link href="/staff/roles">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{role.name} Role</h1>
          <p className="text-sm text-muted-foreground">View and manage role details and permissions</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 md:flex-row">
        <Card className="flex-1 bg-background">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <CardTitle>Role Details</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/staff/roles/${id}/edit`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Role
                  </Link>
                </Button>
                <Button variant="outline" size="sm">
                  <Copy className="mr-2 h-4 w-4" />
                  Clone
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Category</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{role.category}</Badge>
                  {role.isDefault && <Badge>Default</Badge>}
                </div>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-sm font-medium">Users Assigned</p>
                <div className="flex items-center justify-end gap-2">
                  <Badge variant="secondary">{role.users}</Badge>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/staff/roles/${id}/users`}>
                      <Users className="mr-2 h-4 w-4" />
                      View Users
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium">Description</p>
              <p className="text-sm text-muted-foreground">{role.description}</p>
            </div>

            <Separator />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm font-medium">Created By</p>
                <p className="text-sm">{role.createdBy}</p>
                <p className="text-xs text-muted-foreground">
                  <Clock className="mr-1 inline-block h-3 w-3" />
                  {role.createdAt}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Last Updated By</p>
                <p className="text-sm">{role.updatedBy}</p>
                <p className="text-xs text-muted-foreground">
                  <Clock className="mr-1 inline-block h-3 w-3" />
                  {role.lastUpdated}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1 bg-background">
          <CardHeader>
            <CardTitle>Permission Summary</CardTitle>
            <CardDescription>Overview of permissions granted to this role</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {modules.map((module) => (
                <div key={module.id} className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <p className="text-sm font-medium">{module.name}</p>
                    <div className="flex gap-1">
                      {permissionTypes.map((type) => {
                        const hasPermission = role.permissions[module.id]?.includes(type)
                        return (
                          <Badge
                            key={`${module.id}-${type}`}
                            variant={hasPermission ? "default" : "outline"}
                            className={!hasPermission ? "opacity-40" : ""}
                          >
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </Badge>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="permissions" className="w-full">
        <TabsList>
          <TabsTrigger value="permissions">Detailed Permissions</TabsTrigger>
          <TabsTrigger value="users">Assigned Users</TabsTrigger>
          <TabsTrigger value="history">Change History</TabsTrigger>
        </TabsList>

        <TabsContent value="permissions" className="mt-4">
          <Card className="bg-background">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle>Permission Matrix</CardTitle>
                  <CardDescription>Detailed view of all permissions for this role</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export Permissions
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table className="whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Module</TableHead>
                    <TableHead>View</TableHead>
                    <TableHead>Create</TableHead>
                    <TableHead>Edit</TableHead>
                    <TableHead>Delete</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="whitespace-nowrap">
                  {modules.map((module) => (
                    <TableRow key={module.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span>{module.name}</span>
                          <span className="text-xs text-muted-foreground hidden md:inline">({module.description})</span>
                        </div>
                      </TableCell>
                      {permissionTypes.map((type) => (
                        <TableCell key={`${module.id}-${type}`}>
                          <Checkbox checked={role.permissions[module.id]?.includes(type)} disabled />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <Card className="bg-background">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle>Users with {role.name} Role</CardTitle>
                  <CardDescription>Staff members currently assigned to this role</CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input type="search" placeholder="Search users..." className="w-[200px] pl-8 md:w-[300px]" />
                  </div>
                  <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                    <span className="sr-only">Filter</span>
                  </Button>
                  <Button size="sm">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Assign User
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table className="whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead className="hidden md:table-cell">Assigned Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="whitespace-nowrap">
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar || "/user-2.png"} alt={user.name} />
                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{user.department}</TableCell>
                      <TableCell>{user.position}</TableCell>
                      <TableCell className="hidden md:table-cell">{user.assignedDate}</TableCell>
                      <TableCell>
                        <Badge variant={user.status === "Active" ? "default" : "secondary"}>{user.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-background">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                              <Link href={`/staff/${user.id}`}>View Profile</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem>Change Role</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">Remove from Role</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card className="bg-background">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle>Change History</CardTitle>
                  <CardDescription>Record of changes made to this role</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export History
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table className="whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Permission</TableHead>
                    <TableHead>Changed By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="whitespace-nowrap">
                  {auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs">{log.timestamp}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            log.action.includes("Added")
                              ? "default"
                              : log.action.includes("Removed")
                                ? "destructive"
                                : "outline"
                          }
                        >
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>{log.module}</TableCell>
                      <TableCell>{log.permission}</TableCell>
                      <TableCell>{log.user}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
