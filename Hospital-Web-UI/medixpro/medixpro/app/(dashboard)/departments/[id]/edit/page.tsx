"use client"
import type React from "react"
import { use, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, Building2, Save } from "lucide-react"
import Link from "next/link"

export default function EditDepartmentPage({ params }: { params: Promise<{ id: string }> }) {
  const [currentColor, setCurrentColor] = useState("bg-blue-500")
  const { id } = use(params)
  // In a real application, you would fetch the department data based on the ID
  const departmentId = Number.parseInt(id)
  const departmentData = departments.find((d) => d.id === departmentId) || departments[0]

  const [department, setDepartment] = useState({
    name: departmentData.name,
    head: departmentData.head,
    status: departmentData.status,
    location: "East Wing, 3rd Floor",
    phone: "+1 (555) 123-4567",
    email: `${departmentData.name.toLowerCase()}@clinic.com`,
    description: `The ${departmentData.name} department at our clinic is dedicated to providing exceptional care in the field of ${departmentData.name.toLowerCase()} medicine. Our team of specialists works collaboratively to deliver comprehensive treatment plans tailored to each patient's unique needs.`,
  })

  const handleChange = (field: string, value: string) => {
    setDepartment((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // In a real application, you would save the department data here
    console.log("Department data saved:", department)
    // Then redirect to the department details page
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Link href={`/departments/${departmentId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">Edit Department</h2>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Department Information</CardTitle>
              <CardDescription>Update the basic information for this department</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Department Name</Label>
                <Input
                  id="name"
                  value={department.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="Enter department name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="head">Department Head</Label>
                <Select value={department.head} onValueChange={(value) => handleChange("head", value)}>
                  <SelectTrigger id="head">
                    <SelectValue placeholder="Select department head" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dr. Sarah Johnson">Dr. Sarah Johnson</SelectItem>
                    <SelectItem value="Dr. Michael Chen">Dr. Michael Chen</SelectItem>
                    <SelectItem value="Dr. Emily Rodriguez">Dr. Emily Rodriguez</SelectItem>
                    <SelectItem value="Dr. James Wilson">Dr. James Wilson</SelectItem>
                    <SelectItem value="Dr. Lisa Thompson">Dr. Lisa Thompson</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={department.location}
                  onChange={(e) => handleChange("location", e.target.value)}
                  placeholder="Enter department location"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={department.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="Enter phone number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={department.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="Enter email address"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between space-y-0">
                <div className="flex flex-col space-y-1">
                  <Label htmlFor="status">Department Status</Label>
                  <span className="text-sm text-muted-foreground">
                    {department.status === "Active"
                      ? "Department is currently active"
                      : "Department is currently inactive"}
                  </span>
                </div>
                <Switch
                  id="status"
                  checked={department.status === "Active"}
                  onCheckedChange={(checked) => handleChange("status", checked ? "Active" : "Inactive")}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Department Details</CardTitle>
              <CardDescription>Additional information about the department</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={department.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  placeholder="Enter department description"
                  rows={5}
                />
              </div>

              <div className="space-y-2">
                <Label>Department Icon</Label>
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-md border border-dashed">
                    <Building2 className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <Button type="button" variant="outline" size="sm">
                    Change Icon
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Department Color</Label>
                <div className="flex gap-2">
                  {["bg-red-500", "bg-blue-500", "bg-green-500", "bg-yellow-500", "bg-purple-500"].map((color) => (
                    <div
                      key={color}
                      className={`h-8 w-8 rounded-full ${color} ${color === currentColor ? "ring-2 ring-primary" : ""} cursor-pointer ring-offset-2 `}
                      onClick={() => setCurrentColor(color)}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Link href={`/departments/${departmentId}`}>
                <Button variant="outline">Cancel</Button>
              </Link>
              <Button type="submit">
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </CardFooter>
          </Card>
        </div>
      </form>
    </div>
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
