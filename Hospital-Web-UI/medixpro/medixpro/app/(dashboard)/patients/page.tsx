"use client";

import type React from "react";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Filter, MoreHorizontal, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

// Sample patient data
const patientsData = [
  {
    id: "1",
    name: "John Smith",
    image: "/colorful-abstract-shapes.png",
    age: 45,
    gender: "Male",
    status: "Active",
    lastVisit: "2023-06-15",
    condition: "Hypertension",
    doctor: "Dr. Sarah Johnson",
    email: "john.smith@example.com",
    phone: "+1 (555) 123-4567",
  },
  {
    id: "2",
    name: "Emily Davis",
    image: "/colorful-abstract-shapes.png",
    age: 32,
    gender: "Female",
    status: "Active",
    lastVisit: "2023-07-02",
    condition: "Diabetes Type 2",
    doctor: "Dr. Michael Chen",
    email: "emily.davis@example.com",
    phone: "+1 (555) 234-5678",
  },
  {
    id: "3",
    name: "Robert Wilson",
    image: "/user-3.png",
    age: 58,
    gender: "Male",
    status: "Inactive",
    lastVisit: "2023-05-20",
    condition: "Arthritis",
    doctor: "Dr. Lisa Patel",
    email: "robert.wilson@example.com",
    phone: "+1 (555) 345-6789",
  },
  {
    id: "4",
    name: "Jessica Brown",
    image: "/user-3.png",
    age: 27,
    gender: "Female",
    status: "Active",
    lastVisit: "2023-07-10",
    condition: "Asthma",
    doctor: "Dr. James Wilson",
    email: "jessica.brown@example.com",
    phone: "+1 (555) 456-7890",
  },
  {
    id: "5",
    name: "Michael Johnson",
    image: "/user-3.png",
    age: 41,
    gender: "Male",
    status: "Active",
    lastVisit: "2023-06-28",
    condition: "Migraine",
    doctor: "Dr. Emily Rodriguez",
    email: "michael.johnson@example.com",
    phone: "+1 (555) 567-8901",
  },
  {
    id: "6",
    name: "Sarah Thompson",
    image: "/user-3.png",
    age: 63,
    gender: "Female",
    status: "Active",
    lastVisit: "2023-07-05",
    condition: "Osteoporosis",
    doctor: "Dr. Robert Kim",
    email: "sarah.thompson@example.com",
    phone: "+1 (555) 678-9012",
  },
  {
    id: "7",
    name: "David Lee",
    image: "/user-3.png",
    age: 52,
    gender: "Male",
    status: "Inactive",
    lastVisit: "2023-04-18",
    condition: "COPD",
    doctor: "Dr. Jennifer Martinez",
    email: "david.lee@example.com",
    phone: "+1 (555) 789-0123",
  },
  {
    id: "8",
    name: "Amanda Clark",
    image: "/user-3.png",
    age: 36,
    gender: "Female",
    status: "Active",
    lastVisit: "2023-07-08",
    condition: "Anxiety",
    doctor: "Dr. Thomas Wright",
    email: "amanda.clark@example.com",
    phone: "+1 (555) 890-1234",
  },
  {
    id: "9",
    name: "James Rodriguez",
    image: "/user-3.png",
    age: 70,
    gender: "Male",
    status: "Active",
    lastVisit: "2023-06-30",
    condition: "Coronary Artery Disease",
    doctor: "Dr. Sarah Johnson",
    email: "james.rodriguez@example.com",
    phone: "+1 (555) 901-2345",
  },
  {
    id: "10",
    name: "Lisa Chen",
    image: "/user-3.png",
    age: 29,
    gender: "Female",
    status: "Active",
    lastVisit: "2023-07-12",
    condition: "Allergies",
    doctor: "Dr. Michael Chen",
    email: "lisa.chen@example.com",
    phone: "+1 (555) 012-3456",
  },
];

// Define filter types
type FilterState = {
  search: string;
  status: string;
  gender: string[];
  ageRange: [number, number];
  conditions: string[];
  doctors: string[];
};

export default function PatientsPage() {
  // State for filters
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    status: "all",
    gender: [],
    ageRange: [0, 100],
    conditions: [],
    doctors: [],
  });

  // State for filtered patients
  const [filteredPatients, setFilteredPatients] = useState(patientsData);

  // State for active filter count
  const [activeFilterCount, setActiveFilterCount] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Extract unique conditions and doctors for filter options
  const uniqueConditions = Array.from(new Set(patientsData.map((patient) => patient.condition)));
  const uniqueDoctors = Array.from(new Set(patientsData.map((patient) => patient.doctor)));

  // Apply filters when filters state changes
  useEffect(() => {
    let result = patientsData;

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter((patient) => patient.name.toLowerCase().includes(searchLower) || patient.email.toLowerCase().includes(searchLower) || patient.condition.toLowerCase().includes(searchLower) || patient.doctor.toLowerCase().includes(searchLower) || patient.phone.includes(filters.search));
    }

    // Apply status filter
    if (filters.status !== "all") {
      result = result.filter((patient) => patient.status === filters.status);
    }

    // Apply gender filter
    if (filters.gender.length > 0) {
      result = result.filter((patient) => filters.gender.includes(patient.gender));
    }

    // Apply age range filter
    result = result.filter((patient) => patient.age >= filters.ageRange[0] && patient.age <= filters.ageRange[1]);

    // Apply conditions filter
    if (filters.conditions.length > 0) {
      result = result.filter((patient) => filters.conditions.includes(patient.condition));
    }

    // Apply doctors filter
    if (filters.doctors.length > 0) {
      result = result.filter((patient) => filters.doctors.includes(patient.doctor));
    }

    setFilteredPatients(result);

    // Calculate active filter count
    let count = 0;
    if (filters.search) count++;
    if (filters.status !== "all") count++;
    if (filters.gender.length > 0) count++;
    if (filters.ageRange[0] > 0 || filters.ageRange[1] < 100) count++;
    if (filters.conditions.length > 0) count++;
    if (filters.doctors.length > 0) count++;

    setActiveFilterCount(count);
  }, [filters]);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({ ...prev, search: e.target.value }));
  };

  // Handle status filter change
  const handleStatusChange = (value: string) => {
    setFilters((prev) => ({ ...prev, status: value }));
  };

  // Handle gender filter change
  const handleGenderChange = (gender: string) => {
    setFilters((prev) => {
      const newGenders = prev.gender.includes(gender) ? prev.gender.filter((g) => g !== gender) : [...prev.gender, gender];
      return { ...prev, gender: newGenders };
    });
  };

  // Handle age range filter change
  const handleAgeRangeChange = (value: number[]) => {
    setFilters((prev) => ({ ...prev, ageRange: [value[0], value[1]] }));
  };

  // Handle condition filter change
  const handleConditionChange = (condition: string) => {
    setFilters((prev) => {
      const newConditions = prev.conditions.includes(condition) ? prev.conditions.filter((c) => c !== condition) : [...prev.conditions, condition];
      return { ...prev, conditions: newConditions };
    });
  };

  // Handle doctor filter change
  const handleDoctorChange = (doctor: string) => {
    setFilters((prev) => {
      const newDoctors = prev.doctors.includes(doctor) ? prev.doctors.filter((d) => d !== doctor) : [...prev.doctors, doctor];
      return { ...prev, doctors: newDoctors };
    });
  };

  // Reset all filters
  const resetFilters = () => {
    setFilters({
      search: "",
      status: "all",
      gender: [],
      ageRange: [0, 100],
      conditions: [],
      doctors: [],
    });
  };

  return (
    <>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">Patients</h1>
            <p className="text-muted-foreground">Manage your patients and their medical records.</p>
          </div>
          <Button asChild>
            <Link href="/patients/add">
              <Plus className="mr-2 h-4 w-4" />
              Add Patient
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader className="flex flex-col space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <CardTitle>Patients List</CardTitle>
                <CardDescription>A list of all patients in your clinic with their details.</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input type="search" placeholder="Search patients..." className="pl-8 w-full md:w-[250px]" value={filters.search} onChange={handleSearchChange} />
                </div>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="relative">
                      <Filter className="h-4 w-4 mr-2" />
                      Filters
                      {activeFilterCount > 0 && <Badge className="ml-2 bg-primary text-primary-foreground">{activeFilterCount}</Badge>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] md:w-[400px]" align="end">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Filters</h4>
                        <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 px-2">
                          Reset
                          <X className="ml-2 h-4 w-4" />
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select value={filters.status} onValueChange={handleStatusChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="Active">Active</SelectItem>
                            <SelectItem value="Inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Gender</Label>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox id="male" checked={filters.gender.includes("Male")} onCheckedChange={() => handleGenderChange("Male")} />
                            <label htmlFor="male">Male</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id="female" checked={filters.gender.includes("Female")} onCheckedChange={() => handleGenderChange("Female")} />
                            <label htmlFor="female">Female</label>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Age Range</Label>
                          <span className="text-sm text-muted-foreground">
                            {filters.ageRange[0]} - {filters.ageRange[1]} years
                          </span>
                        </div>
                        <Slider defaultValue={[0, 100]} min={0} max={100} step={1} value={[filters.ageRange[0], filters.ageRange[1]]} onValueChange={handleAgeRangeChange} className="py-4" />
                      </div>

                      <div className="space-y-2">
                        <Label>Conditions</Label>
                        <div className="max-h-[150px] overflow-y-auto space-y-2 pr-2">
                          {uniqueConditions.map((condition) => (
                            <div key={condition} className="flex items-center space-x-2">
                              <Checkbox id={`condition-${condition}`} checked={filters.conditions.includes(condition)} onCheckedChange={() => handleConditionChange(condition)} />
                              <label htmlFor={`condition-${condition}`} className="text-sm">
                                {condition}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Doctors</Label>
                        <div className="max-h-[150px] overflow-y-auto space-y-2 pr-2">
                          {uniqueDoctors.map((doctor) => (
                            <div key={doctor} className="flex items-center space-x-2">
                              <Checkbox id={`doctor-${doctor}`} checked={filters.doctors.includes(doctor)} onCheckedChange={() => handleDoctorChange(doctor)} />
                              <label htmlFor={`doctor-${doctor}`} className="text-sm">
                                {doctor}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                <Button variant="outline" size="icon">
                  <Download className="h-4 w-4" />
                  <span className="sr-only">Download</span>
                </Button>
              </div>
            </div>

            {/* Active filters display */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap gap-2">
                {filters.status !== "all" && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Status: {filters.status}
                    <Button variant="ghost" size="icon" className="h-4 w-4 p-0 ml-1" onClick={() => handleStatusChange("all")}>
                      <X className="h-3 w-3" />
                      <span className="sr-only">Remove status filter</span>
                    </Button>
                  </Badge>
                )}

                {filters.gender.map((gender) => (
                  <Badge key={gender} variant="secondary" className="flex items-center gap-1">
                    {gender}
                    <Button variant="ghost" size="icon" className="h-4 w-4 p-0 ml-1" onClick={() => handleGenderChange(gender)}>
                      <X className="h-3 w-3" />
                      <span className="sr-only">Remove {gender} filter</span>
                    </Button>
                  </Badge>
                ))}

                {(filters.ageRange[0] > 0 || filters.ageRange[1] < 100) && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Age: {filters.ageRange[0]}-{filters.ageRange[1]}
                    <Button variant="ghost" size="icon" className="h-4 w-4 p-0 ml-1" onClick={() => handleAgeRangeChange([0, 100])}>
                      <X className="h-3 w-3" />
                      <span className="sr-only">Reset age range</span>
                    </Button>
                  </Badge>
                )}

                {filters.conditions.map((condition) => (
                  <Badge key={condition} variant="secondary" className="flex items-center gap-1">
                    {condition}
                    <Button variant="ghost" size="icon" className="h-4 w-4 p-0 ml-1" onClick={() => handleConditionChange(condition)}>
                      <X className="h-3 w-3" />
                      <span className="sr-only">Remove {condition} filter</span>
                    </Button>
                  </Badge>
                ))}

                {filters.doctors.map((doctor) => (
                  <Badge key={doctor} variant="secondary" className="flex items-center gap-1">
                    {doctor.replace("Dr. ", "")}
                    <Button variant="ghost" size="icon" className="h-4 w-4 p-0 ml-1" onClick={() => handleDoctorChange(doctor)}>
                      <X className="h-3 w-3" />
                      <span className="sr-only">Remove {doctor} filter</span>
                    </Button>
                  </Badge>
                ))}

                {filters.search && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Search: {filters.search}
                    <Button variant="ghost" size="icon" className="h-4 w-4 p-0 ml-1" onClick={() => setFilters((prev) => ({ ...prev, search: "" }))}>
                      <X className="h-3 w-3" />
                      <span className="sr-only">Clear search</span>
                    </Button>
                  </Badge>
                )}

                <Button variant="ghost" size="sm" onClick={resetFilters} className="h-7 px-2 text-xs">
                  Clear all
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {filteredPatients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="rounded-full bg-muted p-3 mb-3">
                  <Search className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">No patients found</h3>
                <p className="text-muted-foreground mt-1 mb-4 max-w-md">No patients match your current filters. Try adjusting your search or filter criteria.</p>
                <Button variant="outline" onClick={resetFilters}>
                  Reset all filters
                </Button>
              </div>
            ) : (
              <Table className="whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="table-cell">Age/Gender</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="table-cell">Last Visit</TableHead>
                    <TableHead className="table-cell">Condition</TableHead>
                    <TableHead className="table-cell">Doctor</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="whitespace-nowrap">
                  {filteredPatients.map((patient) => (
                    <TableRow key={patient.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={patient.image || "/user-2.png"} alt={patient.name} />
                            <AvatarFallback>{patient.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{patient.name}</p>
                            <p className="text-sm text-muted-foreground md:hidden">
                              {patient.age} • {patient.gender}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="table-cell">
                        {patient.age} • {patient.gender}
                      </TableCell>
                      <TableCell>
                        <Badge variant={patient.status === "Active" ? "default" : "secondary"} className={patient.status === "Active" ? "bg-green-500 text-gray-700" : "bg-yellow-500 text-neutral-700"}>
                          {patient.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="table-cell">{patient.lastVisit}</TableCell>
                      <TableCell className="table-cell">{patient.condition}</TableCell>
                      <TableCell className="table-cell">{patient.doctor}</TableCell>
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
                              <Link href={`/patients/${patient.id}`}>View profile</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/patients/${patient.id}/edit`}>Edit details</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/patients/${patient.id}/history`}>Medical history</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/patients/${patient.id}/prescriptions`}>Prescriptions</Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setDeleteDialogOpen(true)} className="text-red-600">
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to Delete this patient?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. The patient's data will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => setDeleteDialogOpen(false)} className="bg-red-500 text-neutral-50 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
