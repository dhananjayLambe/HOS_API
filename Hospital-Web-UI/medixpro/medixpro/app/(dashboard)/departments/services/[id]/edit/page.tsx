"use client";

import { ArrowLeft, Calendar, Info, Loader2, Plus, Save, Trash, Users, X } from "lucide-react";
import Link from "next/link";
import { use, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export default function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { id } = use(params);
  // In a real application, you would fetch the service details based on the ID
  // For this example, we'll use mock data
  const [service, setService] = useState({
    id: id,
    name: "MRI Scan",
    department: "Radiology",
    type: "Diagnostic",
    duration: 45,
    price: 850,
    description: "Magnetic Resonance Imaging (MRI) is a non-invasive imaging technology that produces three-dimensional detailed anatomical images. It is often used for disease detection, diagnosis, and treatment monitoring.",
    preparation: "You may be asked not to eat or drink for 4-6 hours before the scan. If you have any metal implants, please inform the staff beforehand.",
    isActive: true,
    requiresInsurance: true,
    requiresReferral: true,
    availability: [
      { day: "Monday", slots: ["09:00 AM - 11:00 AM", "02:00 PM - 04:00 PM"] },
      { day: "Tuesday", slots: ["09:00 AM - 11:00 AM", "02:00 PM - 04:00 PM"] },
      { day: "Wednesday", slots: ["09:00 AM - 11:00 AM", "02:00 PM - 04:00 PM"] },
      { day: "Thursday", slots: ["09:00 AM - 11:00 AM", "02:00 PM - 04:00 PM"] },
      { day: "Friday", slots: ["09:00 AM - 11:00 AM", "02:00 PM - 04:00 PM"] },
    ],
    providers: [
      { id: "1", name: "Dr. Sarah Johnson", role: "Radiologist", image: "/abstract-jr.png", assigned: true },
      { id: "2", name: "Dr. Michael Chen", role: "Radiologist", image: "/abstract-geometric-lt.png", assigned: true },
      {
        id: "3",
        name: "Dr. Emily Rodriguez",
        role: "Neuroradiologist",
        image: "/stylized-initials.png",
        assigned: true,
      },
      { id: "4", name: "Dr. James Wilson", role: "Radiologist", image: "/graffiti-ew.png", assigned: false },
      { id: "5", name: "Dr. Lisa Thompson", role: "Radiologist", image: "/microphone-crowd.png", assigned: false },
    ],
    equipment: [
      {
        id: "1",
        name: "Siemens MAGNETOM Vida 3T",
        status: "Operational",
        lastMaintenance: "2023-03-15",
        assigned: true,
      },
      {
        id: "2",
        name: "GE Healthcare SIGNA Pioneer 3.0T",
        status: "Operational",
        lastMaintenance: "2023-02-28",
        assigned: true,
      },
      { id: "3", name: "Philips Ingenia 1.5T", status: "Maintenance", lastMaintenance: "2023-04-10", assigned: false },
    ],
  });

  const handleSave = () => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setShowSuccessAlert(true);
      setTimeout(() => setShowSuccessAlert(false), 3000);
    }, 1500);
  };

  const handleDelete = () => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setShowDeleteDialog(false);
      // In a real app, you would redirect to the services list page
    }, 1500);
  };

  const handleInputChange = (field: string, value: any) => {
    setService((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const toggleProviderAssignment = (providerId: string) => {
    setService((prev) => ({
      ...prev,
      providers: prev.providers.map((provider) => (provider.id === providerId ? { ...provider, assigned: !provider.assigned } : provider)),
    }));
  };

  const toggleEquipmentAssignment = (equipmentId: string) => {
    setService((prev) => ({
      ...prev,
      equipment: prev.equipment.map((item) => (item.id === equipmentId ? { ...item, assigned: !item.assigned } : item)),
    }));
  };

  return (
    <div className="flex flex-col gap-6">
      {showSuccessAlert && (
        <Alert className="bg-green-50 border-green-500">
          <Info className="h-4 w-4 text-green-500" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>Service updated successfully.</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="icon" asChild>
            <Link href={`/departments/services/${id}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">Edit Service</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" asChild>
            <Link href={`/departments/services/${id}`}>Cancel</Link>
          </Button>
          <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
            <Trash className="mr-2 h-4 w-4" />
            Delete
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </div>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList>
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
          <TabsTrigger value="providers">Service Providers</TabsTrigger>
          <TabsTrigger value="equipment">Equipment</TabsTrigger>
        </TabsList>
        <TabsContent value="basic" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Edit the basic details of this service</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Service Name</Label>
                  <Input id="name" value={service.name} onChange={(e) => handleInputChange("name", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Select value={service.department} onValueChange={(value) => handleInputChange("department", value)}>
                    <SelectTrigger id="department">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Radiology">Radiology</SelectItem>
                      <SelectItem value="Cardiology">Cardiology</SelectItem>
                      <SelectItem value="Neurology">Neurology</SelectItem>
                      <SelectItem value="Orthopedics">Orthopedics</SelectItem>
                      <SelectItem value="Pediatrics">Pediatrics</SelectItem>
                      <SelectItem value="General Medicine">General Medicine</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Service Type</Label>
                  <Select value={service.type} onValueChange={(value) => handleInputChange("type", value)}>
                    <SelectTrigger id="type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Diagnostic">Diagnostic</SelectItem>
                      <SelectItem value="Treatment">Treatment</SelectItem>
                      <SelectItem value="Preventive">Preventive</SelectItem>
                      <SelectItem value="Consultation">Consultation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input id="duration" type="number" value={service.duration} onChange={(e) => handleInputChange("duration", Number.parseInt(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price ($)</Label>
                  <Input id="price" type="number" value={service.price} onChange={(e) => handleInputChange("price", Number.parseInt(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <div className="flex items-center space-x-2">
                    <Switch id="status" checked={service.isActive} onCheckedChange={(checked) => handleInputChange("isActive", checked)} />
                    <Label htmlFor="status" className="cursor-pointer">
                      {service.isActive ? "Active" : "Inactive"}
                    </Label>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" rows={4} value={service.description} onChange={(e) => handleInputChange("description", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="preparation">Patient Preparation</Label>
                <Textarea id="preparation" rows={3} value={service.preparation} onChange={(e) => handleInputChange("preparation", e.target.value)} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center space-x-2">
                  <Checkbox id="requiresInsurance" checked={service.requiresInsurance} onCheckedChange={(checked) => handleInputChange("requiresInsurance", checked)} />
                  <Label htmlFor="requiresInsurance" className="cursor-pointer">
                    Requires Insurance
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="requiresReferral" checked={service.requiresReferral} onCheckedChange={(checked) => handleInputChange("requiresReferral", checked)} />
                  <Label htmlFor="requiresReferral" className="cursor-pointer">
                    Requires Referral
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="availability" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle>Service Availability</CardTitle>
                <CardDescription>Manage when this service is available for booking</CardDescription>
              </div>
              <Button>
                <Calendar className="mr-2 h-4 w-4" />
                Add Time Slot
              </Button>
            </CardHeader>
            <CardContent>
              <Table className="whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead>Day</TableHead>
                    <TableHead>Available Slots</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="whitespace-nowrap">
                  {service.availability.map((day, index) => (
                    <TableRow key={day.day}>
                      <TableCell className="font-medium">{day.day}</TableCell>
                      <TableCell>
                        {day.slots.map((slot, slotIndex) => (
                          <Badge key={slotIndex} variant="outline" className="mr-2 mb-2 flex items-center">
                            {slot}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-4 w-4 ml-1 p-0"
                              onClick={() => {
                                const newAvailability = [...service.availability];
                                newAvailability[index].slots = day.slots.filter((_, i) => i !== slotIndex);
                                handleInputChange("availability", newAvailability);
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        ))}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newAvailability = [...service.availability];
                            newAvailability[index].slots = [...day.slots, "09:00 AM - 10:00 AM"];
                            handleInputChange("availability", newAvailability);
                          }}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add Slot
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="providers" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle>Service Providers</CardTitle>
                <CardDescription>Assign staff who can perform this service</CardDescription>
              </div>
              <Button>
                <Users className="mr-2 h-4 w-4" />
                Add New Provider
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {service.providers.map((provider) => (
                  <Card key={provider.id} className={provider.assigned ? "border-primary" : ""}>
                    <CardContent className="pt-6">
                      <div className="flex flex-col items-center text-center">
                        <Avatar className="h-20 w-20">
                          <AvatarImage src={provider.image || "/user-2.png"} alt={provider.name} />
                          <AvatarFallback>{provider.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <h3 className="mt-4 text-lg font-medium">{provider.name}</h3>
                        <p className="text-sm text-muted-foreground">{provider.role}</p>
                        <div className="mt-4 flex items-center space-x-2">
                          <Switch id={`provider-${provider.id}`} checked={provider.assigned} onCheckedChange={() => toggleProviderAssignment(provider.id)} />
                          <Label htmlFor={`provider-${provider.id}`} className="cursor-pointer">
                            {provider.assigned ? "Assigned" : "Not Assigned"}
                          </Label>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="equipment" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle>Equipment</CardTitle>
                <CardDescription>Manage equipment used for this service</CardDescription>
              </div>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Equipment
              </Button>
            </CardHeader>
            <CardContent>
              <Table className="whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipment Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Maintenance</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="whitespace-nowrap">
                  {service.equipment.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <Badge variant={item.status === "Operational" ? "outline" : "destructive"}>{item.status}</Badge>
                      </TableCell>
                      <TableCell>{item.lastMaintenance}</TableCell>
                      <TableCell>
                        <Switch id={`equipment-${item.id}`} checked={item.assigned} onCheckedChange={() => toggleEquipmentAssignment(item.id)} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure you want to delete this service?</DialogTitle>
            <DialogDescription>This action cannot be undone. This will permanently delete the service and remove all associated data.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash className="mr-2 h-4 w-4" />}
              Delete Service
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
