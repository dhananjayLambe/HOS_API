"use client";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Edit, MoreHorizontal, Plus, Search, Trash, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

// Sample specializations data
const specializationsData = [
  {
    id: "1",
    name: "Cardiology",
    description: "Diagnosis and treatment of heart disorders",
    doctorsCount: 5,
    departmentId: "1",
    department: "Internal Medicine",
    status: "Active",
  },
  {
    id: "2",
    name: "Neurology",
    description: "Diagnosis and treatment of disorders of the nervous system",
    doctorsCount: 3,
    departmentId: "2",
    department: "Neuroscience",
    status: "Active",
  },
  {
    id: "3",
    name: "Pediatrics",
    description: "Medical care of infants, children, and adolescents",
    doctorsCount: 7,
    departmentId: "3",
    department: "Child Health",
    status: "Active",
  },
  {
    id: "4",
    name: "Orthopedics",
    description: "Treatment of the musculoskeletal system",
    doctorsCount: 4,
    departmentId: "4",
    department: "Surgery",
    status: "Active",
  },
  {
    id: "5",
    name: "Dermatology",
    description: "Diagnosis and treatment of skin disorders",
    doctorsCount: 2,
    departmentId: "5",
    department: "Skin Health",
    status: "Active",
  },
  {
    id: "6",
    name: "Psychiatry",
    description: "Diagnosis, prevention, and treatment of mental disorders",
    doctorsCount: 3,
    departmentId: "6",
    department: "Mental Health",
    status: "Inactive",
  },
  {
    id: "7",
    name: "Ophthalmology",
    description: "Diagnosis and treatment of eye disorders",
    doctorsCount: 2,
    departmentId: "7",
    department: "Eye Care",
    status: "Active",
  },
  {
    id: "8",
    name: "Gynecology",
    description: "Health of the female reproductive system",
    doctorsCount: 4,
    departmentId: "8",
    department: "Women's Health",
    status: "Active",
  },
];

export default function SpecializationsPage() {
  const { toast } = useToast();
  const [specializations, setSpecializations] = useState(specializationsData);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [specializationToDelete, setSpecializationToDelete] = useState<(typeof specializations)[0] | null>(null);

  // Filter specializations based on search query
  const filteredSpecializations = specializations.filter((spec) => spec.name.toLowerCase().includes(searchQuery.toLowerCase()) || spec.description.toLowerCase().includes(searchQuery.toLowerCase()) || spec.department.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleDeleteClick = (specialization: (typeof specializations)[0]) => {
    setSpecializationToDelete(specialization);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!specializationToDelete) return;

    // Filter out the deleted specialization
    setSpecializations((prev) => prev.filter((s) => s.id !== specializationToDelete.id));

    // Show success toast
    toast({
      title: "Specialization deleted",
      description: `${specializationToDelete.name} has been deleted successfully.`,
    });

    // Close the dialog
    setDeleteDialogOpen(false);
    setSpecializationToDelete(null);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/doctors">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">Specializations</h1>
          <p className="text-muted-foreground">Manage medical specializations in your clinic.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <CardTitle>Specializations List</CardTitle>
            <CardDescription>View and manage all medical specializations.</CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder="Search specializations..." className="pl-8 w-full md:w-[250px]" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Specialization
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Specialization</DialogTitle>
                  <DialogDescription>Create a new medical specialization for your clinic.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Specialization Name</Label>
                    <Input id="name" placeholder="Enter specialization name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" placeholder="Enter description" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input id="department" placeholder="Enter department" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline">Cancel</Button>
                  <Button>Save Specialization</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table className="whitespace-nowrap">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Description</TableHead>
                <TableHead>Doctors</TableHead>
                <TableHead className="hidden md:table-cell">Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="whitespace-nowrap">
              {filteredSpecializations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No specializations found matching your search.
                  </TableCell>
                </TableRow>
              ) : (
                filteredSpecializations.map((specialization) => (
                  <TableRow key={specialization.id}>
                    <TableCell className="font-medium">{specialization.name}</TableCell>
                    <TableCell className="line-clamp-1 table-cell">{specialization.description}</TableCell>
                    <TableCell>{specialization.doctorsCount}</TableCell>
                    <TableCell className="line-clamp-1 table-cell">{specialization.department}</TableCell>
                    <TableCell>
                      <Badge variant={specialization.status === "Active" ? "default" : "secondary"} className={specialization.status === "Active" ? "bg-green-500 text-neutral-800" : "bg-yellow-400 text-neutral-800"}>
                        {specialization.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link href={`/doctors/specializations/${specialization.id}/edit`}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Link href={`/doctors`} className="flex items-center gap-2">
                              <Users className="mr-2 h-4 w-4" />
                              View doctors
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteClick(specialization)}>
                            <Trash className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Specialization Statistics</CardTitle>
          <CardDescription>Overview of specializations and associated doctors.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {specializations.slice(0, 4).map((specialization) => (
              <Card key={specialization.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{specialization.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{specialization.doctorsCount}</div>
                  <p className="text-xs text-muted-foreground">Doctors</p>
                  <div className="mt-2 h-1 w-full bg-muted">
                    <div className="h-1 bg-primary" style={{ width: `${(specialization.doctorsCount / 10) * 100}%` }} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this specialization?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the specialization
              {specializationToDelete && <span className="font-medium"> "{specializationToDelete.name}"</span>} and remove it from our servers.
              {specializationToDelete && specializationToDelete.doctorsCount > 0 && <span className="mt-2 block text-red-500">Warning: This specialization has {specializationToDelete.doctorsCount} doctors associated with it. Deleting it may affect doctor profiles and assignments.</span>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
