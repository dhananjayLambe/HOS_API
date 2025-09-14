"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Building2, MoreHorizontal, Plus, Search, Users } from "lucide-react"
import Link from "next/link"

export default function DepartmentsPage() {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  return (
    <>
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">Departments</h2>
          <p className="text-muted-foreground">Manage your clinic's departments and staff assignments</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/departments/add">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Department
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm xl:text-lg font-medium">Total Departments</CardTitle>
            <Building2 className="size-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <h2 className="text-2xl xl:text-4xl font-bold mb-2">12</h2>
            <p className="text-xs text-muted-foreground">+2 from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm xl:text-lg font-medium">Total Staff</CardTitle>
            <Users className="size-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <h2 className="text-2xl xl:text-4xl font-bold mb-2">48</h2>
            <p className="text-xs text-muted-foreground">+5 from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm xl:text-lg font-medium">Services Offered</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="size-8 text-muted-foreground"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </CardHeader>
          <CardContent>
            <h2 className="text-2xl xl:text-4xl font-bold mb-2">86</h2>
            <p className="text-xs text-muted-foreground">+12 from last month</p>
          </CardContent>
        </Card>
      </div>

      <Card className="col-span-3">
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Department List</CardTitle>
              <CardDescription>View and manage all departments in your clinic</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative"> 
                <Search className="absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input type="search" placeholder="Search departments..." className="w-full pl-8 md:w-[300px]" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="all">All Departments</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="inactive">Inactive</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="w-full">
              <Table className="whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead>Department Name</TableHead>
                    <TableHead>Head of Department</TableHead>
                    <TableHead>Staff Count</TableHead>
                    <TableHead>Services</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="whitespace-nowrap">
                  {departments.map((department) => (
                    <TableRow key={department.id}>
                      <TableCell className="font-medium">{department.name}</TableCell>
                      <TableCell>{department.head}</TableCell>
                      <TableCell>{department.staffCount}</TableCell>
                      <TableCell>{department.services}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            department.status === "Active"
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {department.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem>
                              <Link href={`/departments/${department.id}`} className="flex w-full">
                                View details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Link href={`/departments/${department.id}/edit`} className="flex w-full">
                                Edit department
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Link href={`/departments/${department.id}/staff`} className="flex w-full">
                                Manage staff
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setDeleteDialogOpen(true)} className="text-red-600">Deactivate</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
            <TabsContent value="active">
              <Table className="whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead>Department Name</TableHead>
                    <TableHead>Head of Department</TableHead>
                    <TableHead>Staff Count</TableHead>
                    <TableHead>Services</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="whitespace-nowrap">
                  {departments
                    .filter((d) => d.status === "Active")
                    .map((department) => (
                      <TableRow key={department.id}>
                        <TableCell className="font-medium">{department.name}</TableCell>
                        <TableCell>{department.head}</TableCell>
                        <TableCell>{department.staffCount}</TableCell>
                        <TableCell>{department.services}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                            {department.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem>
                                <Link href={`/departments/${department.id}`} className="flex w-full">
                                  View details
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Link href={`/departments/${department.id}/edit`} className="flex w-full">
                                  Edit department
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Link href={`/departments/${department.id}/staff`} className="flex w-full">
                                  Manage staff
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setDeleteDialogOpen(true)} className="text-red-600">Deactivate</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TabsContent>
            <TabsContent value="inactive">
              <Table className="whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead>Department Name</TableHead>
                    <TableHead>Head of Department</TableHead>
                    <TableHead>Staff Count</TableHead>
                    <TableHead>Services</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="whitespace-nowrap">
                  {departments
                    .filter((d) => d.status === "Inactive")
                    .map((department) => (
                      <TableRow key={department.id}>
                        <TableCell className="font-medium">{department.name}</TableCell>
                        <TableCell>{department.head}</TableCell>
                        <TableCell>{department.staffCount}</TableCell>
                        <TableCell>{department.services}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                            {department.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem>
                                <Link href={`/departments/${department.id}`} className="flex w-full">
                                  View details
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Link href={`/departments/${department.id}/edit`} className="flex w-full">
                                  Edit department
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Link href={`/departments/${department.id}/staff`} className="flex w-full">
                                  Manage staff
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-green-600">Activate</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to Deactivate this department?</AlertDialogTitle>
            <AlertDialogDescription>This action will remove the department from active status and they will no longer be visible to patients. You can reactivate them later if needed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => setDeleteDialogOpen(false)} className="bg-red-500 text-neutral-50 hover:bg-red-700">
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

const departments = [
  {
    id: 1,
    name: "Cardiology",
    head: "Dr. Sarah Johnson",
    staffCount: 8,
    services: 12,
    status: "Active",
  },
  {
    id: 2,
    name: "Neurology",
    head: "Dr. Michael Chen",
    staffCount: 6,
    services: 9,
    status: "Active",
  },
  {
    id: 3,
    name: "Pediatrics",
    head: "Dr. Emily Rodriguez",
    staffCount: 10,
    services: 15,
    status: "Active",
  },
  {
    id: 4,
    name: "Orthopedics",
    head: "Dr. James Wilson",
    staffCount: 7,
    services: 11,
    status: "Active",
  },
  {
    id: 5,
    name: "Dermatology",
    head: "Dr. Lisa Thompson",
    staffCount: 4,
    services: 8,
    status: "Active",
  },
  {
    id: 6,
    name: "Ophthalmology",
    head: "Dr. Robert Kim",
    staffCount: 5,
    services: 7,
    status: "Active",
  },
  {
    id: 7,
    name: "Psychiatry",
    head: "Dr. Jennifer Martinez",
    staffCount: 6,
    services: 10,
    status: "Active",
  },
  {
    id: 8,
    name: "Radiology",
    head: "Dr. David Brown",
    staffCount: 4,
    services: 6,
    status: "Inactive",
  },
  {
    id: 9,
    name: "Oncology",
    head: "Dr. Susan Lee",
    staffCount: 7,
    services: 9,
    status: "Active",
  },
  {
    id: 10,
    name: "Endocrinology",
    head: "Dr. Thomas Garcia",
    staffCount: 3,
    services: 5,
    status: "Inactive",
  },
]
