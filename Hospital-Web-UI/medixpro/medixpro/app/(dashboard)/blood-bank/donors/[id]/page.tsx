"use client";

import { ArrowLeft, Calendar, Edit, Mail, MapPin, Phone, User } from "lucide-react";
import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { use } from "react";

export default function DonorDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  // Mock data for donor details
  const { id } = use(params);
  const donor = {
    id: id,
    name: "John Smith",
    bloodType: "O+",
    phone: "+1 (555) 123-4567",
    email: "john.smith@example.com",
    address: "123 Main Street, Anytown, CA 12345",
    dateOfBirth: "1985-06-15",
    gender: "Male",
    weight: "75 kg",
    height: "180 cm",
    lastDonation: "2023-03-15",
    status: "eligible",
    totalDonations: 8,
    nextEligible: "2023-07-15",
    image: null,
    initials: "JS",
    registrationDate: "2020-02-10",
    medicalHistory: {
      allergies: "None",
      medications: "None",
      chronicConditions: "None",
      previousSurgeries: "Appendectomy (2010)",
      bloodPressure: "120/80",
      hemoglobin: "14.5 g/dL",
    },
    donationHistory: [
      {
        id: "D-1001-8",
        date: "2023-03-15",
        bloodUnit: "BU-5678",
        type: "Whole Blood",
        volume: "450 ml",
        location: "Main Clinic",
        status: "Completed",
        notes: "Successful donation, no complications",
      },
      {
        id: "D-1001-7",
        date: "2022-11-20",
        bloodUnit: "BU-4567",
        type: "Whole Blood",
        volume: "450 ml",
        location: "Mobile Drive - City Hall",
        status: "Completed",
        notes: "Donor experienced mild dizziness post-donation",
      },
      {
        id: "D-1001-6",
        date: "2022-07-05",
        bloodUnit: "BU-3456",
        type: "Plasma",
        volume: "600 ml",
        location: "Main Clinic",
        status: "Completed",
        notes: "Successful donation",
      },
      {
        id: "D-1001-5",
        date: "2022-03-12",
        bloodUnit: "BU-2345",
        type: "Whole Blood",
        volume: "450 ml",
        location: "Main Clinic",
        status: "Completed",
        notes: "Successful donation",
      },
      {
        id: "D-1001-4",
        date: "2021-11-18",
        bloodUnit: "BU-1234",
        type: "Whole Blood",
        volume: "450 ml",
        location: "Mobile Drive - University",
        status: "Completed",
        notes: "Successful donation",
      },
    ],
    deferralHistory: [
      {
        id: "DF-1001-1",
        date: "2021-07-10",
        reason: "Low Hemoglobin",
        duration: "3 months",
        endDate: "2021-10-10",
        notes: "Hemoglobin level: 12.2 g/dL (below minimum threshold)",
      },
    ],
  };
  // Get status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case "eligible":
        return "success";
      case "ineligible":
        return "destructive";
      case "new":
        return "secondary";
      default:
        return "outline";
    }
  };

  // Get status display text
  const getStatusText = (status: string) => {
    switch (status) {
      case "eligible":
        return "Eligible";
      case "ineligible":
        return "Ineligible";
      case "new":
        return "New Donor";
      default:
        return status;
    }
  };

  // Get donation milestone badge
  const getDonationBadge = (count: number) => {
    if (count >= 25)
      return (
        <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">
          Platinum Donor
        </Badge>
      );
    if (count >= 10)
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
          Gold Donor
        </Badge>
      );
    if (count >= 5)
      return (
        <Badge variant="outline" className="bg-zinc-500/10 text-zinc-400 border-zinc-500/20">
          Silver Donor
        </Badge>
      );
    return null;
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" asChild>
          <Link href="/blood-bank/donors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">Donor Details</h2>
      </div>

      <div className="md:grid max-md:space-y-5 gap-5 md:grid-cols-3">
        {/* Donor Profile Card */}
        <Card className="md:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xl font-bold">Donor Profile</CardTitle>
            <Button variant="outline" size="icon" asChild>
              <Link href={`/blood-bank/donors/${id}/edit`}>
                <Edit className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={donor.image || "/user-2.png"} alt={donor.name} />
                <AvatarFallback className="text-2xl">{donor.initials}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-center space-y-1">
                <h3 className="text-xl font-semibold">{donor.name}</h3>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`
                      ${donor.bloodType.includes("O") ? "bg-red-500/10 text-red-500 border-red-500/20" : ""}
                      ${donor.bloodType.includes("A") ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : ""}
                      ${donor.bloodType.includes("B") && !donor.bloodType.includes("A") ? "bg-green-500/10 text-green-500 border-green-500/20" : ""}
                      ${donor.bloodType.includes("AB") ? "bg-purple-500/10 text-purple-500 border-purple-500/20" : ""}
                    `}
                  >
                    {donor.bloodType}
                  </Badge>
                  <Badge variant={getStatusVariant(donor.status)}>{getStatusText(donor.status)}</Badge>
                  {getDonationBadge(donor.totalDonations)}
                </div>
                <p className="text-sm text-muted-foreground">ID: {donor.id}</p>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <User className="size-4 shrink-0 mt-0.5 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Personal Information</p>
                  <p className="text-sm text-muted-foreground">
                    {donor.gender}, {new Date().getFullYear() - new Date(donor.dateOfBirth).getFullYear()} years
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {donor.weight}, {donor.height}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Phone className="size-4 shrink-0 mt-0.5 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Phone</p>
                  <p className="text-sm text-muted-foreground">{donor.phone}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Mail className="size-4 shrink-0 mt-0.5 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{donor.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <MapPin className="size-4 shrink-0 mt-0.5 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Address</p>
                  <p className="text-sm text-muted-foreground">{donor.address}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Calendar className="size-4 shrink-0 mt-0.5 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Donation Status</p>
                  <p className="text-sm text-muted-foreground">Last donation: {donor.lastDonation ? new Date(donor.lastDonation).toLocaleDateString() : "Never donated"}</p>
                  <p className="text-sm text-muted-foreground">Next eligible: {donor.nextEligible === "N/A" ? "N/A" : new Date(donor.nextEligible).toLocaleDateString()}</p>
                  <p className="text-sm text-muted-foreground">Total donations: {donor.totalDonations}</p>
                </div>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="flex flex-col space-y-2">
              <Button className="w-full">Schedule Donation</Button>
              <Button variant="outline" className="w-full">
                View Donation History
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Donor Details Tabs */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Donor Information</CardTitle>
            <CardDescription>Detailed information about the donor</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="medical">
              <TabsList>
                <TabsTrigger value="medical">Medical Information</TabsTrigger>
                <TabsTrigger value="donations">Donation History</TabsTrigger>
                <TabsTrigger value="deferrals">Deferral History</TabsTrigger>
              </TabsList>
              <TabsContent value="medical" className="pt-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium">Blood Pressure</h4>
                    <p className="text-sm text-muted-foreground">{donor.medicalHistory.bloodPressure}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">Hemoglobin</h4>
                    <p className="text-sm text-muted-foreground">{donor.medicalHistory.hemoglobin}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">Allergies</h4>
                    <p className="text-sm text-muted-foreground">{donor.medicalHistory.allergies}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">Current Medications</h4>
                    <p className="text-sm text-muted-foreground">{donor.medicalHistory.medications}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">Chronic Conditions</h4>
                    <p className="text-sm text-muted-foreground">{donor.medicalHistory.chronicConditions}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">Previous Surgeries</h4>
                    <p className="text-sm text-muted-foreground">{donor.medicalHistory.previousSurgeries}</p>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="donations" className="pt-4">
                <div className="overflow-x-auto">
                <Table className="whitespace-nowrap">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Blood Unit</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="whitespace-nowrap">
                    {donor.donationHistory.map((donation) => (
                      <TableRow key={donation.id}>
                        <TableCell>{new Date(donation.date).toLocaleDateString()}</TableCell>
                        <TableCell>{donation.type}</TableCell>
                        <TableCell>{donation.bloodUnit}</TableCell>
                        <TableCell>{donation.location}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                            {donation.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </TabsContent>
              <TabsContent value="deferrals" className="pt-4">
                {donor.deferralHistory.length > 0 ? (
                  <Table className="whitespace-nowrap">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>End Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="whitespace-nowrap">
                      {donor.deferralHistory.map((deferral) => (
                        <TableRow key={deferral.id}>
                          <TableCell>{new Date(deferral.date).toLocaleDateString()}</TableCell>
                          <TableCell>{deferral.reason}</TableCell>
                          <TableCell>{deferral.duration}</TableCell>
                          <TableCell>{new Date(deferral.endDate).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground">No deferral history found.</p>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
