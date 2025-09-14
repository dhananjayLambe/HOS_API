import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
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
  Filter,
  UserPlus,
  MoreHorizontal,
  Download,
  RefreshCw,
  Mail,
  UserMinus,
  UserCog,
} from "lucide-react"
import Link from "next/link"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { use } from "react"

export default function RoleUsersPage({ params }: { params: Promise<{ id: string }> }) {
  // Mock data for the role
  const { id } = use(params)
  const role = {
    id: id,
    name: "Administrator",
    category: "Administrative",
    description: "Full system access with all permissions",
    users: 12,
  }

  // Mock data for users with this role
  const users = [
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
    {
      id: 4,
      name: "Dr. James Wilson",
      email: "james.wilson@clinic.com",
      department: "Neurology",
      position: "Department Head",
      assignedDate: "2023-01-20",
      status: "Active",
      avatar: "/contemplative-artist.png",
    },
    {
      id: 5,
      name: "Lisa Thompson",
      email: "lisa.thompson@clinic.com",
      department: "Administration",
      position: "Finance Director",
      assignedDate: "2023-02-15",
      status: "Active",
      avatar: "/thoughtful-gaze.png",
    },
    {
      id: 6,
      name: "Robert Garcia",
      email: "robert.garcia@clinic.com",
      department: "IT",
      position: "Systems Administrator",
      assignedDate: "2023-03-10",
      status: "Inactive",
      avatar: "/abstract-geometric-lt.png",
    },
    {
      id: 7,
      name: "Dr. Jennifer Lee",
      email: "jennifer.lee@clinic.com",
      department: "Pediatrics",
      position: "Department Head",
      assignedDate: "2023-01-25",
      status: "Active",
      avatar: "/stylized-initials.png",
    },
    {
      id: 8,
      name: "David Kim",
      email: "david.kim@clinic.com",
      department: "Administration",
      position: "Operations Manager",
      assignedDate: "2023-02-20",
      status: "Active",
      avatar: "/graffiti-ew.png",
    },
    {
      id: 9,
      name: "Maria Sanchez",
      email: "maria.sanchez@clinic.com",
      department: "Administration",
      position: "HR Director",
      assignedDate: "2023-03-15",
      status: "Active",
      avatar: "/microphone-crowd.png",
    },
    {
      id: 10,
      name: "Thomas Wright",
      email: "thomas.wright@clinic.com",
      department: "IT",
      position: "Security Specialist",
      assignedDate: "2023-01-30",
      status: "Active",
      avatar: "/user-3.png",
    },
    {
      id: 11,
      name: "Dr. Olivia Brown",
      email: "olivia.brown@clinic.com",
      department: "Orthopedics",
      position: "Senior Physician",
      assignedDate: "2023-02-25",
      status: "Active",
      avatar: "/colorful-abstract-shapes.png",
    },
    {
      id: 12,
      name: "William Taylor",
      email: "william.taylor@clinic.com",
      department: "Administration",
      position: "Compliance Officer",
      assignedDate: "2023-03-20",
      status: "Inactive",
      avatar: "/mystical-forest-spirit.png",
    },
  ]

  // Mock data for departments
  const departments = [
    "All Departments",
    "Administration",
    "Cardiology",
    "Neurology",
    "Pediatrics",
    "Orthopedics",
    "IT",
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="outline" size="icon" asChild className="h-8 w-8">
          <Link href={`/staff/roles/${id}`}>
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <div>
          <h2 className="text-xl md:text-2xl mb-2 font-bold">{role.name} Role - Users</h2>
          <p className="text-sm text-muted-foreground">Manage users assigned to this role</p>
        </div>
      </div>

      <Card className="bg-background">
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Users with {role.name} Role</CardTitle>
              <CardDescription>Total of {role.users} users assigned to this role</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Search users..." className="w-full pl-8 md:w-[300px]" />
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
                        <SelectValue placeholder="Department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept} value={dept.toLowerCase().replace(/\s+/g, "-")}>
                            {dept}
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
                      <RefreshCw className="mr-2 h-3 w-3" />
                      Reset Filters
                    </Button>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Assign Users
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-background">
                  <DialogHeader>
                    <DialogTitle>Assign Users to {role.name} Role</DialogTitle>
                    <DialogDescription>Select staff members to assign to this role</DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <div className="relative mb-4">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input type="search" placeholder="Search staff..." className="pl-8" />
                    </div>
                    <div className="max-h-[300px] overflow-y-auto space-y-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted">
                          <Checkbox id={`user-${i}`} />
                          <Label htmlFor={`user-${i}`} className="flex flex-1 items-center gap-2 cursor-pointer">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={`/user-2.png?height=32&width=32&query=user`} />
                              <AvatarFallback>U{i}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">User Name {i + 1}</p>
                              <p className="text-xs text-muted-foreground">Department • Position</p>
                            </div>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline">Cancel</Button>
                    <Button>Assign Selected Users</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table className="whitespace-nowrap">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Name</TableHead>
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
                        <DropdownMenuItem>
                          <Mail className="mr-2 h-4 w-4" />
                          Send Email
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <UserCog className="mr-2 h-4 w-4" />
                          Change Role
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          <UserMinus className="mr-2 h-4 w-4" />
                          Remove from Role
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
    </div>
  )
}
