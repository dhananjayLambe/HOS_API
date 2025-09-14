"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FileText, Filter, MoreHorizontal, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const prescriptions = [
  {
    id: "1",
    patient: {
      name: "John Smith",
      image: "/colorful-abstract-shapes.png",
    },
    doctor: "Dr. Sarah Johnson",
    date: "2023-07-15",
    status: "Active",
    medications: [
      { name: "Lisinopril", dosage: "10mg", frequency: "Once daily" },
      { name: "Metformin", dosage: "500mg", frequency: "Twice daily" },
    ],
    refills: 2,
  },
  {
    id: "2",
    patient: {
      name: "Emily Davis",
      image: "/colorful-abstract-shapes.png",
    },
    doctor: "Dr. Michael Chen",
    date: "2023-07-10",
    status: "Active",
    medications: [{ name: "Atorvastatin", dosage: "20mg", frequency: "Once daily" }],
    refills: 3,
  },
  {
    id: "3",
    patient: {
      name: "Robert Wilson",
      image: "/user-3.png",
    },
    doctor: "Dr. Lisa Patel",
    date: "2023-06-28",
    status: "Expired",
    medications: [
      { name: "Prednisone", dosage: "5mg", frequency: "Once daily" },
      { name: "Albuterol", dosage: "90mcg", frequency: "As needed" },
    ],
    refills: 0,
  },
  {
    id: "4",
    patient: {
      name: "Jessica Brown",
      image: "/user-3.png",
    },
    doctor: "Dr. James Wilson",
    date: "2023-07-05",
    status: "Active",
    medications: [{ name: "Amoxicillin", dosage: "500mg", frequency: "Three times daily" }],
    refills: 0,
  },
  {
    id: "5",
    patient: {
      name: "Michael Johnson",
      image: "/user-3.png",
    },
    doctor: "Dr. Emily Rodriguez",
    date: "2023-07-12",
    status: "Active",
    medications: [{ name: "Sertraline", dosage: "50mg", frequency: "Once daily" }],
    refills: 5,
  },
  {
    id: "6",
    patient: {
      name: "Sarah Thompson",
      image: "/user-3.png",
    },
    doctor: "Dr. Robert Kim",
    date: "2023-06-20",
    status: "Expired",
    medications: [
      { name: "Hydrochlorothiazide", dosage: "25mg", frequency: "Once daily" },
      { name: "Ibuprofen", dosage: "600mg", frequency: "As needed" },
    ],
    refills: 0,
  },
];

export default function PrescriptionsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Filter prescriptions based on search query and status
  const filteredPrescriptions = prescriptions.filter((prescription) => {
    const matchesSearch = prescription.patient.name.toLowerCase().includes(searchQuery.toLowerCase()) || prescription.doctor.toLowerCase().includes(searchQuery.toLowerCase()) || prescription.medications.some((med) => med.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter ? prescription.status === statusFilter : true;

    return matchesSearch && matchesStatus;
  });
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">Prescriptions</h1>
          <p className="text-muted-foreground">Manage patient prescriptions and medications.</p>
        </div>
        <Button href="/prescriptions/create">
          <Plus className="mr-2 h-4 w-4" />
          Create Prescription
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <CardTitle>All Prescriptions</CardTitle>
            <CardDescription>View and manage all patient prescriptions.</CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder="Search prescriptions..." className="pl-8 w-full md:w-[250px]" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="ml-2">
                  <Filter className="h-4 w-4 mr-2" />
                  {statusFilter || "All Status"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setStatusFilter(null)}>All Status</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("Active")}>Active</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("Expired")}>Expired</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="icon">
              <Download className="h-4 w-4" />
              <span className="sr-only">Download</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table className="whitespace-nowrap">
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead className="hidden md:table-cell">Doctor</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Medications</TableHead>
                <TableHead className="hidden md:table-cell">Refills</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="whitespace-nowrap">
              {filteredPrescriptions.map((prescription) => (
                <TableRow key={prescription.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={prescription.patient.image || "/user-2.png"} alt={prescription.patient.name} />
                        <AvatarFallback>{prescription.patient.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{prescription.patient.name}</p>
                        <p className="text-sm text-muted-foreground md:hidden">{prescription.doctor}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{prescription.doctor}</TableCell>
                  <TableCell>{prescription.date}</TableCell>
                  <TableCell>
                    <Badge variant={prescription.status === "Active" ? "default" : "secondary"} className={prescription.status === "Active" ? "bg-green-500 text-gray-700" : "bg-red-500 text-gray-50"}>
                      {prescription.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="space-y-1">
                      {prescription.medications.map((med, index) => (
                        <p key={index} className="text-sm">
                          {med.name} {med.dosage} ({med.frequency})
                        </p>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{prescription.refills}</TableCell>
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
                          <Link href={`/prescriptions/${prescription.id}`}>
                            <FileText className="mr-2 h-4 w-4" />
                            View details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/prescriptions/${prescription.id}/edit`}>Edit prescription</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/prescriptions/${prescription.id}/renew`}>Renew prescription</Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600">Cancel prescription</DropdownMenuItem>
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
  );
}
