import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  UserPlus,
  Filter,
  RefreshCcw,
  CheckCircle2,
  XCircle,
  Eye,
  UserCog,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

export default function UserRolesPage() {
  // Mock data for users
  const users = [
    {
      id: 1,
      name: "Dr. Sarah Johnson",
      email: "sarah.johnson@medixpro-clinic.com",
      role: "System Administrator",
      department: "Administration",
      lastLogin: "2023-11-20 09:15:22",
      status: "Active",
      avatar: "/stylized-initials.png",
      initials: "SJ",
    },
    {
      id: 2,
      name: "Dr. Michael Chen",
      email: "michael.chen@medixpro-clinic.com",
      role: "Clinic Manager",
      department: "Management",
      lastLogin: "2023-11-20 08:30:45",
      status: "Active",
      avatar: "/microphone-crowd.png",
      initials: "MC",
    },
    {
      id: 3,
      name: "Emma Wilson",
      email: "emma.wilson@medixpro-clinic.com",
      role: "Front Desk",
      department: "Reception",
      lastLogin: "2023-11-19 16:45:10",
      status: "Active",
      avatar: "/graffiti-ew.png",
      initials: "EW",
    },
    {
      id: 4,
      name: "Dr. James Rodriguez",
      email: "james.rodriguez@medixpro-clinic.com",
      role: "Doctor",
      department: "Cardiology",
      lastLogin: "2023-11-20 10:20:33",
      status: "Active",
      avatar: "/abstract-jr.png",
      initials: "JR",
    },
    {
      id: 5,
      name: "Sophia Lee",
      email: "sophia.lee@medixpro-clinic.com",
      role: "Nurse",
      department: "Pediatrics",
      lastLogin: "2023-11-20 07:55:18",
      status: "Active",
      avatar: "/user-2.png?height=40&width=40&query=SL",
      initials: "SL",
    },
    {
      id: 6,
      name: "Robert Taylor",
      email: "robert.taylor@medixpro-clinic.com",
      role: "Billing Staff",
      department: "Finance",
      lastLogin: "2023-11-17 14:30:22",
      status: "Inactive",
      avatar: "/user-2.png?height=40&width=40&query=RT",
      initials: "RT",
    },
    {
      id: 7,
      name: "David Kim",
      email: "david.kim@medixpro-clinic.com",
      role: "IT Support",
      department: "IT",
      lastLogin: "2023-11-20 11:10:05",
      status: "Active",
      avatar: "/user-2.png?height=40&width=40&query=DK",
      initials: "DK",
    },
    {
      id: 8,
      name: "Jennifer Martinez",
      email: "jennifer.martinez@medixpro-clinic.com",
      role: "Guest",
      department: "External",
      lastLogin: "2023-11-15 09:45:30",
      status: "Inactive",
      avatar: "/user-2.png?height=40&width=40&query=JM",
      initials: "JM",
    },
  ]

  // Mock data for roles
  const roles = [
    {
      id: 1,
      name: "System Administrator",
      description: "Full access to all system settings and configurations",
      users: 2,
      lastUpdated: "2023-11-15",
    },
    {
      id: 2,
      name: "Clinic Manager",
      description: "Manages clinic operations and staff",
      users: 3,
      lastUpdated: "2023-10-22",
    },
    {
      id: 3,
      name: "Front Desk",
      description: "Manages appointments and patient registration",
      users: 5,
      lastUpdated: "2023-09-30",
    },
    {
      id: 4,
      name: "Doctor",
      description: "Medical staff with patient care access",
      users: 12,
      lastUpdated: "2023-10-05",
    },
    {
      id: 5,
      name: "Nurse",
      description: "Assists doctors and manages patient care",
      users: 8,
      lastUpdated: "2023-11-02",
    },
    {
      id: 6,
      name: "Billing Staff",
      description: "Manages invoices and payments",
      users: 4,
      lastUpdated: "2023-10-18",
    },
    {
      id: 7,
      name: "IT Support",
      description: "Technical support and system maintenance",
      users: 2,
      lastUpdated: "2023-11-10",
    },
    {
      id: 8,
      name: "Guest",
      description: "Limited view-only access",
      users: 3,
      lastUpdated: "2023-11-08",
    },
  ]

  // Mock data for departments
  const departments = [
    { id: 1, name: "Administration" },
    { id: 2, name: "Cardiology" },
    { id: 3, name: "Neurology" },
    { id: 4, name: "Pediatrics" },
    { id: 5, name: "Orthopedics" },
    { id: 6, name: "Radiology" },
    { id: 7, name: "Emergency" },
    { id: 8, name: "Surgery" },
    { id: 9, name: "Oncology" },
    { id: 10, name: "IT" },
    { id: 11, name: "Finance" },
    { id: 12, name: "Reception" },
    { id: 13, name: "Management" },
    { id: 14, name: "External" },
  ]

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
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-sm text-muted-foreground">Manage users, roles, and permissions</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-background">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">
              {users.filter((user) => user.status === "Active").length} active users
            </p>
          </CardContent>
        </Card>
        <Card className="bg-background">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Roles</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roles.length}</div>
            <p className="text-xs text-muted-foreground">
              {roles.reduce((sum, role) => sum + role.users, 0)} role assignments
            </p>
          </CardContent>
        </Card>
        <Card className="bg-background">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Departments</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{departments.length}</div>
            <p className="text-xs text-muted-foreground">
              Across{" "}
              {
                departments.filter(
                  (dept) => !["IT", "Finance", "Reception", "Management", "External"].includes(dept.name),
                ).length
              }{" "}
              medical specialties
            </p>
          </CardContent>
        </Card>
        <Card className="bg-background">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admin Users</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter((user) => user.role === "System Administrator").length}
            </div>
            <p className="text-xs text-muted-foreground">With full system access</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Search users..." className="w-[200px] pl-8 md:w-[300px]" />
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
                        <SelectValue placeholder="Role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={role.id.toString()}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Select>
                      <SelectTrigger className="w-full border-none p-0 shadow-none">
                        <SelectValue placeholder="Department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id.toString()}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Select>
                      <SelectTrigger className="w-full border-none p-0 shadow-none">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Button variant="outline" size="sm" className="w-full">
                      <RefreshCcw className="mr-2 h-3 w-3" />
                      Reset Filters
                    </Button>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex items-center gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add User
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-background">
                  <DialogHeader>
                    <DialogTitle>Add New User</DialogTitle>
                    <DialogDescription>Create a new user account and assign permissions</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="user-name">Full Name</Label>
                      <Input id="user-name" placeholder="Enter full name" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="user-email">Email Address</Label>
                      <Input id="user-email" type="email" placeholder="Enter email address" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="user-role">Role</Label>
                      <Select>
                        <SelectTrigger id="user-role">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role.id} value={role.id.toString()}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="user-department">Department</Label>
                      <Select>
                        <SelectTrigger id="user-department">
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id.toString()}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="user-password">Temporary Password</Label>
                      <Input id="user-password" type="password" placeholder="Enter temporary password" />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="force-reset" defaultChecked />
                      <Label htmlFor="force-reset">Force password change on first login</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline">Cancel</Button>
                    <Button>Create User</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>

          <Card className="bg-background">
            <CardContent className="p-0">
              <Table className="whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead className="hidden md:table-cell">Last Login</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="whitespace-nowrap">
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar || "/user-2.png"} alt={user.name} />
                            <AvatarFallback>{user.initials}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{user.role}</TableCell>
                      <TableCell>{user.department}</TableCell>
                      <TableCell className="hidden md:table-cell">{user.lastLogin}</TableCell>
                      <TableCell>
                        <Badge variant={user.status === "Active" ? "default" : "secondary"}>
                          {user.status === "Active" ? (
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                          ) : (
                            <XCircle className="mr-1 h-3 w-3" />
                          )}
                          {user.status}
                        </Badge>
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
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" />
                              View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit User
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <UserCog className="mr-2 h-4 w-4" />
                              Manage Permissions
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              {user.status === "Active" ? (
                                <>
                                  <ShieldAlert className="mr-2 h-4 w-4" />
                                  Deactivate User
                                </>
                              ) : (
                                <>
                                  <ShieldCheck className="mr-2 h-4 w-4" />
                                  Activate User
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
                              <Trash className="mr-2 h-4 w-4" />
                              Delete User
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

        {/* Roles Tab */}
        <TabsContent value="roles" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Search roles..." className="w-[200px] pl-8 md:w-[300px]" />
              </div>
            </div>
            <div className="flex items-center gap-2">
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
                    <DialogDescription>Define a new user role with specific permissions</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="role-name">Role Name</Label>
                      <Input id="role-name" placeholder="Enter role name" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="role-description">Description</Label>
                      <Input id="role-description" placeholder="Enter role description" />
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
                  {roles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">{role.name}</TableCell>
                      <TableCell className="max-w-xs truncate">{role.description}</TableCell>
                      <TableCell>{role.users}</TableCell>
                      <TableCell className="hidden md:table-cell">{role.lastUpdated}</TableCell>
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
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Role
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Users className="mr-2 h-4 w-4" />
                              View Users
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem disabled={role.users > 0} className="text-destructive">
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

        {/* Departments Tab */}
        <TabsContent value="departments" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Search departments..." className="w-[200px] pl-8 md:w-[300px]" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Department
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-background">
                  <DialogHeader>
                    <DialogTitle>Create New Department</DialogTitle>
                    <DialogDescription>Add a new department to the system</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="department-name">Department Name</Label>
                      <Input id="department-name" placeholder="Enter department name" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="department-description">Description</Label>
                      <Input id="department-description" placeholder="Enter department description" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline">Cancel</Button>
                    <Button>Create Department</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>

          <Card className="bg-background">
            <CardContent className="p-0">
              <Table className="whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead>Department Name</TableHead>
                    <TableHead>Staff Count</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="whitespace-nowrap">
                  {departments.map((dept) => (
                    <TableRow key={dept.id}>
                      <TableCell className="font-medium">{dept.name}</TableCell>
                      <TableCell>{users.filter((user) => user.department === dept.name).length}</TableCell>
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
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Department
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Users className="mr-2 h-4 w-4" />
                              View Staff
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              disabled={users.filter((user) => user.department === dept.name).length > 0}
                              className="text-destructive"
                            >
                              <Trash className="mr-2 h-4 w-4" />
                              Delete Department
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
    </div>
  )
}
