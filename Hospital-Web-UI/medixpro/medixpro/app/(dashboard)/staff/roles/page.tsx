"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  Search,
  Plus,
  MoreHorizontal,
  Download,
  Edit,
  Trash,
  Users,
  Shield,
  UserCog,
  FileText,
  Copy,
  Info,
  ShieldCheck,
  UserPlus,
  Eye,
  RefreshCw,
  Filter,
} from "lucide-react"
import Link from "next/link"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useState } from "react"
import { DeleteRoleModal } from "@/components/roles/delete-role-modal"

export default function RolesAndPermissionsPage() {
  // Add this inside the component function
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [roleToDelete, setRoleToDelete] = useState<{ id: number; name: string } | null>(null)

  // Mock data for roles
  const roles = [
    {
      id: 1,
      name: "Administrator",
      category: "Administrative",
      description: "Full system access with all permissions",
      users: 3,
      isDefault: true,
      lastUpdated: "2023-11-15",
      updatedBy: "System Admin",
      permissions: {
        dashboard: ["view", "edit"],
        patients: ["view", "edit", "create", "delete"],
        appointments: ["view", "edit", "create", "delete"],
        billing: ["view", "edit", "create", "delete"],
        reports: ["view", "edit", "create", "delete"],
        settings: ["view", "edit"],
      },
    },
    {
      id: 2,
      name: "Doctor",
      category: "Medical",
      description: "Access to patient records, appointments, and prescriptions",
      users: 12,
      isDefault: true,
      lastUpdated: "2023-10-22",
      updatedBy: "System Admin",
      permissions: {
        dashboard: ["view"],
        patients: ["view", "edit", "create"],
        appointments: ["view", "edit", "create"],
        billing: ["view"],
        reports: ["view", "create"],
        settings: ["view"],
      },
    },
    {
      id: 3,
      name: "Nurse",
      category: "Medical",
      description: "Limited access to patient records and appointments",
      users: 18,
      isDefault: true,
      lastUpdated: "2023-09-30",
      updatedBy: "Dr. Sarah Johnson",
      permissions: {
        dashboard: ["view"],
        patients: ["view", "edit"],
        appointments: ["view", "edit"],
        billing: ["view"],
        reports: ["view"],
        settings: [],
      },
    },
    {
      id: 4,
      name: "Receptionist",
      category: "Administrative",
      description: "Manage appointments and patient registration",
      users: 5,
      isDefault: true,
      lastUpdated: "2023-10-05",
      updatedBy: "Dr. Sarah Johnson",
      permissions: {
        dashboard: ["view"],
        patients: ["view", "create"],
        appointments: ["view", "edit", "create"],
        billing: ["view"],
        reports: [],
        settings: [],
      },
    },
    {
      id: 5,
      name: "Billing Staff",
      category: "Administrative",
      description: "Manage billing and payments",
      users: 4,
      isDefault: true,
      lastUpdated: "2023-11-02",
      updatedBy: "System Admin",
      permissions: {
        dashboard: ["view"],
        patients: ["view"],
        appointments: ["view"],
        billing: ["view", "edit", "create", "delete"],
        reports: ["view", "create"],
        settings: [],
      },
    },
    {
      id: 6,
      name: "Lab Technician",
      category: "Medical",
      description: "Manage lab tests and results",
      users: 6,
      isDefault: true,
      lastUpdated: "2023-10-18",
      updatedBy: "Dr. Michael Chen",
      permissions: {
        dashboard: ["view"],
        patients: ["view"],
        appointments: ["view"],
        billing: [],
        reports: ["view", "create"],
        settings: [],
      },
    },
    {
      id: 7,
      name: "Senior Doctor",
      category: "Custom",
      description: "Extended permissions for senior medical staff",
      users: 3,
      isDefault: false,
      lastUpdated: "2023-11-10",
      updatedBy: "Dr. Sarah Johnson",
      permissions: {
        dashboard: ["view", "edit"],
        patients: ["view", "edit", "create", "delete"],
        appointments: ["view", "edit", "create", "delete"],
        billing: ["view", "edit"],
        reports: ["view", "edit", "create", "delete"],
        settings: ["view"],
      },
    },
    {
      id: 8,
      name: "Department Head",
      category: "Custom",
      description: "Management role for department leaders",
      users: 2,
      isDefault: false,
      lastUpdated: "2023-11-08",
      updatedBy: "System Admin",
      permissions: {
        dashboard: ["view", "edit"],
        patients: ["view", "edit", "create", "delete"],
        appointments: ["view", "edit", "create", "delete"],
        billing: ["view", "edit", "create"],
        reports: ["view", "edit", "create", "delete"],
        settings: ["view", "edit"],
      },
    },
  ]

  // Mock data for role templates
  const roleTemplates = [
    {
      id: 1,
      name: "Medical Director",
      category: "Medical",
      description: "Full access to all medical functions with administrative oversight",
      permissions: {
        dashboard: ["view", "edit"],
        patients: ["view", "edit", "create", "delete"],
        appointments: ["view", "edit", "create", "delete"],
        billing: ["view", "edit"],
        reports: ["view", "edit", "create", "delete"],
        settings: ["view", "edit"],
      },
    },
    {
      id: 2,
      name: "Head Nurse",
      category: "Medical",
      description: "Supervises nursing staff and manages patient care",
      permissions: {
        dashboard: ["view"],
        patients: ["view", "edit", "create"],
        appointments: ["view", "edit", "create"],
        billing: ["view"],
        reports: ["view", "create"],
        settings: ["view"],
      },
    },
    {
      id: 3,
      name: "Finance Manager",
      category: "Administrative",
      description: "Manages financial operations and billing",
      permissions: {
        dashboard: ["view", "edit"],
        patients: ["view"],
        appointments: ["view"],
        billing: ["view", "edit", "create", "delete"],
        reports: ["view", "edit", "create", "delete"],
        settings: ["view"],
      },
    },
    {
      id: 4,
      name: "IT Administrator",
      category: "Administrative",
      description: "Manages system settings and user access",
      permissions: {
        dashboard: ["view", "edit"],
        patients: ["view"],
        appointments: ["view"],
        billing: ["view"],
        reports: ["view", "create"],
        settings: ["view", "edit", "create", "delete"],
      },
    },
    {
      id: 5,
      name: "Front Desk Coordinator",
      category: "Administrative",
      description: "Manages appointments and patient registration",
      permissions: {
        dashboard: ["view"],
        patients: ["view", "create"],
        appointments: ["view", "edit", "create", "delete"],
        billing: ["view", "create"],
        reports: ["view"],
        settings: [],
      },
    },
  ]

  // Mock data for permission audit logs
  const auditLogs = [
    {
      id: 1,
      role: "Administrator",
      action: "Permission Added",
      module: "Reports",
      permission: "delete",
      timestamp: "2023-11-15 09:23:45",
      user: "System Admin",
    },
    {
      id: 2,
      role: "Doctor",
      action: "Permission Removed",
      module: "Billing",
      permission: "edit",
      timestamp: "2023-11-14 14:12:30",
      user: "Dr. Sarah Johnson",
    },
    {
      id: 3,
      role: "Senior Doctor",
      action: "Role Created",
      module: "All",
      permission: "N/A",
      timestamp: "2023-11-10 11:05:22",
      user: "Dr. Sarah Johnson",
    },
    {
      id: 4,
      role: "Nurse",
      action: "Permission Added",
      module: "Patients",
      permission: "edit",
      timestamp: "2023-11-08 16:45:10",
      user: "Dr. Michael Chen",
    },
    {
      id: 5,
      role: "Receptionist",
      action: "Permission Removed",
      module: "Billing",
      permission: "create",
      timestamp: "2023-11-05 10:30:15",
      user: "System Admin",
    },
  ]

  // Filter roles by category
  const allRoles = roles
  const medicalRoles = roles.filter((role) => role.category === "Medical")
  const administrativeRoles = roles.filter((role) => role.category === "Administrative")
  const customRoles = roles.filter((role) => role.category === "Custom")

  // Modules for permission matrix
  const modules = [
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
  const permissionTypes = ["view", "create", "edit", "delete"]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="outline" size="icon" asChild className="h-8 w-8">
          <Link href="/staff">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Roles & Permissions</h1>
          <p className="text-sm text-muted-foreground">Manage staff access and security controls</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-background">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Roles</CardTitle>
            <Shield className="size-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl xl:text-4xl mb-2 font-bold">{roles.length}</div>
            <p className="text-xs text-muted-foreground">
              {roles.filter((r) => r.isDefault).length} default, {roles.filter((r) => !r.isDefault).length} custom
            </p>
          </CardContent>
        </Card>
        <Card className="bg-background">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Staff Assigned</CardTitle>
            <Users className="size-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl xl:text-4xl mb-2 font-bold">{roles.reduce((sum, role) => sum + role.users, 0)}</div>
            <p className="text-xs text-muted-foreground">Across all roles</p>
          </CardContent>
        </Card>
        <Card className="bg-background">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Medical Roles</CardTitle>
            <UserCog className="size-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl xl:text-4xl mb-2 font-bold">{medicalRoles.length}</div>
            <p className="text-xs text-muted-foreground">
              {medicalRoles.reduce((sum, role) => sum + role.users, 0)} staff assigned
            </p>
          </CardContent>
        </Card>
        <Card className="bg-background">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Permission Sets</CardTitle>
            <FileText className="size-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl xl:text-4xl mb-2 font-bold">{modules.length}</div>
            <p className="text-xs text-muted-foreground">{permissionTypes.length} permission types</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="roles" className="w-full">
        <TabsList>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="matrix">Permission Matrix</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
        </TabsList>

        {/* Roles Tab */}
        <TabsContent value="roles" className="mt-4 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Search roles..." className="w-[200px] pl-8 md:w-[300px]" />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                    <span className="sr-only">Filter</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[200px]">
                  <DropdownMenuLabel>Filter By</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Select>
                      <SelectTrigger className="w-full border-none p-0 shadow-none">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="medical">Medical</SelectItem>
                        <SelectItem value="administrative">Administrative</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Select>
                      <SelectTrigger className="w-full border-none p-0 shadow-none">
                        <SelectValue placeholder="Default Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="default">Default Only</SelectItem>
                        <SelectItem value="custom">Custom Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Button variant="outline" size="sm" className="w-full">
                      <RefreshCw className="mr-2 h-3 w-3" />
                      Reset Filters
                    </Button>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Role
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-background">
                  <DialogHeader>
                    <DialogTitle>Create New Role</DialogTitle>
                    <DialogDescription>
                      Define a new role with specific permissions for staff members.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Role Name</Label>
                      <Input id="name" placeholder="Enter role name" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="category">Category</Label>
                      <select
                        id="category"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="Medical">Medical</option>
                        <option value="Administrative">Administrative</option>
                        <option value="Custom">Custom</option>
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea id="description" placeholder="Enter role description" />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-base">Quick Setup</Label>
                      <div className="flex items-center gap-4">
                        <Button variant="outline" size="sm">
                          <Copy className="mr-2 h-4 w-4" />
                          Clone Existing Role
                        </Button>
                        <Button variant="outline" size="sm">
                          <FileText className="mr-2 h-4 w-4" />
                          Use Template
                        </Button>
                      </div>
                    </div>
                    <Separator />
                    <div className="space-y-4">
                      <Label className="text-base">Basic Permissions</Label>
                      {modules.slice(0, 4).map((module) => (
                        <div key={module.id} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="font-medium">{module.name}</Label>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6">
                                    <Info className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs">{module.description}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <div className="grid grid-cols-4 gap-4">
                            {permissionTypes.map((type) => (
                              <div key={type} className="flex items-center space-x-2">
                                <Checkbox id={`${module.id}-${type}`} />
                                <Label htmlFor={`${module.id}-${type}`} className="text-sm capitalize">
                                  {type}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      <div className="pt-2">
                        <Button variant="outline" size="sm">
                          Show All Modules
                        </Button>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline">Cancel</Button>
                    <Button>Create Role</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>

          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">All Roles</TabsTrigger>
              <TabsTrigger value="medical">Medical</TabsTrigger>
              <TabsTrigger value="administrative">Administrative</TabsTrigger>
              <TabsTrigger value="custom">Custom</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="mt-4">
              <Card className="bg-background">
                <CardContent className="p-0">
                  <Table className="whitespace-nowrap">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Role Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Users</TableHead>
                        <TableHead className="hidden md:table-cell">Last Updated</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="whitespace-nowrap">
                      {allRoles.map((role) => (
                        <TableRow key={role.id}>
                          <TableCell className="font-medium">
                            {role.name}
                            {role.isDefault && (
                              <Badge variant="outline" className="ml-2">
                                Default
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>{role.category}</TableCell>
                          <TableCell className="max-w-xs truncate">{role.description}</TableCell>
                          <TableCell>{role.users}</TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="flex flex-col">
                              <span className="text-xs">{role.lastUpdated}</span>
                              <span className="text-xs text-muted-foreground">by {role.updatedBy}</span>
                            </div>
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
                                  <Link href={`/staff/roles/${role.id}`}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={`/staff/roles/${role.id}/edit`}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit Role
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={`/staff/roles/${role.id}/users`}>
                                    <Users className="mr-2 h-4 w-4" />
                                    View Users
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Copy className="mr-2 h-4 w-4" />
                                  Clone Role
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  disabled={role.isDefault}
                                  className="text-destructive"
                                  onClick={() => {
                                    setRoleToDelete(role)
                                    setDeleteModalOpen(true)
                                  }}
                                >
                                  <Trash className="mr-2 h-4 w-4" />
                                  Delete Role
                                </DropdownMenuItem>
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
            <TabsContent value="medical" className="mt-4">
              <Card className="bg-background">
                <CardContent className="p-0">
                  <Table className="whitespace-nowrap">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Role Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Users</TableHead>
                        <TableHead className="hidden md:table-cell">Last Updated</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="whitespace-nowrap">
                      {medicalRoles.map((role) => (
                        <TableRow key={role.id}>
                          <TableCell className="font-medium">
                            {role.name}
                            {role.isDefault && (
                              <Badge variant="outline" className="ml-2">
                                Default
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{role.description}</TableCell>
                          <TableCell>{role.users}</TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="flex flex-col">
                              <span className="text-xs">{role.lastUpdated}</span>
                              <span className="text-xs text-muted-foreground">by {role.updatedBy}</span>
                            </div>
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
                                  <Link href={`/staff/roles/${role.id}`}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={`/staff/roles/${role.id}/edit`}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit Role
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={`/staff/roles/${role.id}/users`}>
                                    <Users className="mr-2 h-4 w-4" />
                                    View Users
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Copy className="mr-2 h-4 w-4" />
                                  Clone Role
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  disabled={role.isDefault}
                                  className="text-destructive"
                                  onClick={() => {
                                    setRoleToDelete(role)
                                    setDeleteModalOpen(true)
                                  }}
                                >
                                  <Trash className="mr-2 h-4 w-4" />
                                  Delete Role
                                </DropdownMenuItem>
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
            <TabsContent value="administrative" className="mt-4">
              <Card className="bg-background">
                <CardContent className="p-0">
                  <Table className="whitespace-nowrap">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Role Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Users</TableHead>
                        <TableHead className="hidden md:table-cell">Last Updated</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="whitespace-nowrap">
                      {administrativeRoles.map((role) => (
                        <TableRow key={role.id}>
                          <TableCell className="font-medium">
                            {role.name}
                            {role.isDefault && (
                              <Badge variant="outline" className="ml-2">
                                Default
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{role.description}</TableCell>
                          <TableCell>{role.users}</TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="flex flex-col">
                              <span className="text-xs">{role.lastUpdated}</span>
                              <span className="text-xs text-muted-foreground">by {role.updatedBy}</span>
                            </div>
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
                                  <Link href={`/staff/roles/${role.id}`}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={`/staff/roles/${role.id}/edit`}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit Role
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={`/staff/roles/${role.id}/users`}>
                                    <Users className="mr-2 h-4 w-4" />
                                    View Users
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Copy className="mr-2 h-4 w-4" />
                                  Clone Role
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  disabled={role.isDefault}
                                  className="text-destructive"
                                  onClick={() => {
                                    setRoleToDelete(role)
                                    setDeleteModalOpen(true)
                                  }}
                                >
                                  <Trash className="mr-2 h-4 w-4" />
                                  Delete Role
                                </DropdownMenuItem>
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
            <TabsContent value="custom" className="mt-4">
              <Card className="bg-background">
                <CardContent className="p-0">
                  <Table className="whitespace-nowrap">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Role Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Users</TableHead>
                        <TableHead className="hidden md:table-cell">Last Updated</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="whitespace-nowrap">
                      {customRoles.map((role) => (
                        <TableRow key={role.id}>
                          <TableCell className="font-medium">{role.name}</TableCell>
                          <TableCell className="max-w-xs truncate">{role.description}</TableCell>
                          <TableCell>{role.users}</TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="flex flex-col">
                              <span className="text-xs">{role.lastUpdated}</span>
                              <span className="text-xs text-muted-foreground">by {role.updatedBy}</span>
                            </div>
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
                                  <Link href={`/staff/roles/${role.id}`}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={`/staff/roles/${role.id}/edit`}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit Role
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={`/staff/roles/${role.id}/users`}>
                                    <Users className="mr-2 h-4 w-4" />
                                    View Users
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Copy className="mr-2 h-4 w-4" />
                                  Clone Role
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => {
                                    setRoleToDelete(role)
                                    setDeleteModalOpen(true)
                                  }}
                                >
                                  <Trash className="mr-2 h-4 w-4" />
                                  Delete Role
                                </DropdownMenuItem>
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
          </Tabs>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="mt-4 space-y-4">
          <div className="flex items-center flex-wrap gap-3 justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Search templates..." className="w-[200px] pl-8 md:w-[300px]" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Template
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-background">
                  <DialogHeader>
                    <DialogTitle>Create Role Template</DialogTitle>
                    <DialogDescription>Define a new role template with specific permissions</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="template-name">Template Name</Label>
                      <Input id="template-name" placeholder="Enter template name" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="template-category">Category</Label>
                      <select
                        id="template-category"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="Medical">Medical</option>
                        <option value="Administrative">Administrative</option>
                        <option value="Custom">Custom</option>
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="template-description">Description</Label>
                      <Textarea id="template-description" placeholder="Enter template description" />
                    </div>
                    <div className="space-y-2">
                      <Label>Permissions</Label>
                      {modules.map((module) => (
                        <div key={module.id} className="space-y-2">
                          <div className="font-medium text-sm">{module.name}</div>
                          <div className="grid grid-cols-4 gap-2">
                            {permissionTypes.map((type) => (
                              <div key={type} className="flex items-center space-x-2">
                                <Checkbox id={`${module.id}-${type}`} />
                                <Label htmlFor={`${module.id}-${type}`} className="text-xs capitalize">
                                  {type}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline">Cancel</Button>
                    <Button>Create Template</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <Card className="bg-background">
            <CardHeader>
              <CardTitle>Role Templates</CardTitle>
              <CardDescription>
                Pre-defined role configurations that can be applied to new staff members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {roleTemplates.map((template) => (
                    <Card key={template.id} className="bg-background">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{template.name}</CardTitle>
                          <Badge variant="outline">{template.category}</Badge>
                        </div>
                        <CardDescription className="line-clamp-2">{template.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(template.permissions).map(([module, perms]) =>
                            perms.length > 0 ? (
                              <Badge key={module} variant="secondary" className="text-xs">
                                {module}
                              </Badge>
                            ) : null,
                          )}
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-between flex-wrap gap-3 pt-0">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <FileText className="mr-2 h-4 w-4" />
                              View Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-background">
                            <DialogHeader>
                              <DialogTitle>{template.name} Template</DialogTitle>
                              <DialogDescription>Detailed permissions for this role template</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <div className="space-y-1">
                                <h4 className="font-medium">Description</h4>
                                <p className="text-sm text-muted-foreground">{template.description}</p>
                              </div>
                              <div className="space-y-2">
                                <h4 className="font-medium">Permissions</h4>
                                <Table className="whitespace-nowrap">
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Module</TableHead>
                                      <TableHead>View</TableHead>
                                      <TableHead>Create</TableHead>
                                      <TableHead>Edit</TableHead>
                                      <TableHead>Delete</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody className="whitespace-nowrap">
                                    {Object.entries(template.permissions).map(([module, perms]) => (
                                      <TableRow key={module}>
                                        <TableCell className="font-medium capitalize">{module}</TableCell>
                                        <TableCell>{perms.includes("view") ? "✓" : "-"}</TableCell>
                                        <TableCell>{perms.includes("create") ? "✓" : "-"}</TableCell>
                                        <TableCell>{perms.includes("edit") ? "✓" : "-"}</TableCell>
                                        <TableCell>{perms.includes("delete") ? "✓" : "-"}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline">Cancel</Button>
                              <Button>Apply Template</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <div>
                          <Button variant="outline" size="sm" className="mr-2">
                            <Copy className="mr-2 h-4 w-4" />
                            Clone
                          </Button>
                          <Button size="sm">
                            <ShieldCheck className="mr-2 h-4 w-4" />
                            Apply
                          </Button>
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                  <Card className="bg-background border-dashed flex flex-col items-center justify-center p-6">
                    <div className="rounded-full bg-muted p-3 mb-3">
                      <UserPlus className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium mb-1">Create Template</h3>
                    <p className="text-sm text-muted-foreground text-center mb-4">
                      Define a new role template with custom permissions
                    </p>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button>Create New Template</Button>
                      </DialogTrigger>
                      <DialogContent className="bg-background">
                        <DialogHeader>
                          <DialogTitle>Create Role Template</DialogTitle>
                          <DialogDescription>Define a new role template with specific permissions</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label htmlFor="template-name">Template Name</Label>
                            <Input id="template-name" placeholder="Enter template name" />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="template-category">Category</Label>
                            <select
                              id="template-category"
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <option value="Medical">Medical</option>
                              <option value="Administrative">Administrative</option>
                              <option value="Custom">Custom</option>
                            </select>
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="template-description">Description</Label>
                            <Textarea id="template-description" placeholder="Enter template description" />
                          </div>
                          <div className="space-y-2">
                            <Label>Permissions</Label>
                            {modules.map((module) => (
                              <div key={module.id} className="space-y-2">
                                <div className="font-medium text-sm">{module.name}</div>
                                <div className="grid grid-cols-4 gap-2">
                                  {permissionTypes.map((type) => (
                                    <div key={type} className="flex items-center space-x-2">
                                      <Checkbox id={`${module.id}-${type}`} />
                                      <Label htmlFor={`${module.id}-${type}`} className="text-xs capitalize">
                                        {type}
                                      </Label>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline">Cancel</Button>
                          <Button>Create Template</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permission Matrix Tab */}
        <TabsContent value="matrix" className="mt-4 space-y-4">
          <Card className="bg-background">
            <CardHeader>
              <div className="flex items-center flex-wrap gap-3 justify-between">
                <div>
                  <CardTitle>Permission Matrix</CardTitle>
                  <CardDescription>Manage permissions for each role across different modules</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Export Matrix
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table className="whitespace-nowrap">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Module / Role</TableHead>
                      {allRoles.map((role) => (
                        <TableHead key={role.id} className="text-center">
                          {role.name}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody className="whitespace-nowrap">
                    {modules.map((module) => (
                      <TableRow key={module.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center justify-between">
                            <span>{module.name}</span>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6">
                                    <Info className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs">{module.description}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                        {allRoles.map((role:any) => (
                          <TableCell key={`${module.id}-${role.id}`} className="text-center">
                            <div className="flex flex-col items-center gap-3">
                              {permissionTypes.map((type) => {
                                const hasPermission = role.permissions[module.id]?.includes(type)
                                return (
                                  <div key={`${module.id}-${role.id}-${type}`} className="flex items-center gap-1">
                                    <Checkbox id={`${module.id}-${role.id}-${type}`} checked={hasPermission} />
                                    <Label htmlFor={`${module.id}-${role.id}-${type}`} className="text-xs capitalize">
                                      {type}
                                    </Label>
                                  </div>
                                )
                              })}
                            </div>
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Logs Tab */}
        <TabsContent value="audit" className="mt-4 space-y-4">
          <Card className="bg-background">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <CardTitle>Permission Audit Logs</CardTitle>
                  <CardDescription>Track changes to roles and permissions</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Export Logs
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table className="whitespace-nowrap">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Module</TableHead>
                      <TableHead>Permission</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead className="text-right">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="whitespace-nowrap">
                    {auditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-xs">{log.timestamp}</TableCell>
                        <TableCell>{log.role}</TableCell>
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
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      {roleToDelete && (
        <DeleteRoleModal
          open={deleteModalOpen}
          onOpenChange={setDeleteModalOpen}
          roleName={roleToDelete.name}
          onConfirm={() => {
            // This would be replaced with actual delete logic in a real app
            console.log(`Deleting role: ${roleToDelete.name}`)
            setDeleteModalOpen(false)
            setRoleToDelete(null)
          }}
        />
      )}
    </div>
  )
}
