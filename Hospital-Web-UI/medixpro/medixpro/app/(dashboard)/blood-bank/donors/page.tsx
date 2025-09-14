"use client";

import { Calendar, Download, Edit, Eye, Mail, MoreHorizontal, Phone, Plus, RefreshCw, Search, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DonationHistoryModal, ScheduleDonationModal } from "./modals";

export default function DonorsPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [scheduleDonationModal, setScheduleDonationModal] = useState({
    isOpen: false,
    donorId: "",
    donorName: "",
    donorBloodType: "",
  });
  const [donationHistoryModal, setDonationHistoryModal] = useState({
    isOpen: false,
    donorId: "",
    donorName: "",
    donationHistory: [],
  });

  // Add these state variables after the existing state declarations
  const [searchText, setSearchText] = useState("");
  const [bloodTypeFilter, setBloodTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Mock data for donors
  const donors = [
    {
      id: "D-1001",
      name: "John Smith",
      bloodType: "O+",
      phone: "+1 (555) 123-4567",
      email: "john.smith@example.com",
      lastDonation: "2023-03-15",
      status: "eligible",
      totalDonations: 8,
      nextEligible: "2023-07-15",
      image: null,
      initials: "JS",
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
      ],
    },
    {
      id: "D-1002",
      name: "Sarah Johnson",
      bloodType: "A-",
      phone: "+1 (555) 987-6543",
      email: "sarah.j@example.com",
      lastDonation: "2023-05-22",
      status: "ineligible",
      totalDonations: 3,
      nextEligible: "2023-09-22",
      image: null,
      initials: "SJ",
      donationHistory: [
        {
          id: "D-1002-3",
          date: "2023-05-22",
          bloodUnit: "BU-8901",
          type: "Whole Blood",
          volume: "450 ml",
          location: "Main Clinic",
          status: "Completed",
          notes: "Successful donation",
        },
      ],
    },
    {
      id: "D-1003",
      name: "Michael Chen",
      bloodType: "B+",
      phone: "+1 (555) 456-7890",
      email: "mchen@example.com",
      lastDonation: "2023-01-10",
      status: "eligible",
      totalDonations: 12,
      nextEligible: "2023-05-10",
      image: null,
      initials: "MC",
      donationHistory: [
        {
          id: "D-1003-12",
          date: "2023-01-10",
          bloodUnit: "BU-7890",
          type: "Plasma",
          volume: "600 ml",
          location: "Downtown Center",
          status: "Completed",
          notes: "Successful donation",
        },
      ],
    },
    {
      id: "D-1004",
      name: "Emily Rodriguez",
      bloodType: "AB+",
      phone: "+1 (555) 234-5678",
      email: "emily.r@example.com",
      lastDonation: null,
      status: "new",
      totalDonations: 0,
      nextEligible: "N/A",
      image: null,
      initials: "ER",
      donationHistory: [],
    },
    {
      id: "D-1005",
      name: "David Wilson",
      bloodType: "O-",
      phone: "+1 (555) 876-5432",
      email: "dwilson@example.com",
      lastDonation: "2023-04-05",
      status: "eligible",
      totalDonations: 25,
      nextEligible: "2023-08-05",
      image: null,
      initials: "DW",
      donationHistory: [
        {
          id: "D-1005-25",
          date: "2023-04-05",
          bloodUnit: "BU-6789",
          type: "Whole Blood",
          volume: "450 ml",
          location: "North Branch",
          status: "Completed",
          notes: "Successful donation",
        },
      ],
    },
    {
      id: "D-1006",
      name: "Lisa Thompson",
      bloodType: "A+",
      phone: "+1 (555) 345-6789",
      email: "lisa.t@example.com",
      lastDonation: "2023-06-18",
      status: "ineligible",
      totalDonations: 5,
      nextEligible: "2023-10-18",
      image: null,
      initials: "LT",
      donationHistory: [
        {
          id: "D-1006-5",
          date: "2023-06-18",
          bloodUnit: "BU-9012",
          type: "Whole Blood",
          volume: "450 ml",
          location: "Mobile Drive - University",
          status: "Completed",
          notes: "Successful donation",
        },
      ],
    },
  ];

  // Update the filteredDonors function to include all filters
  // Replace the existing filteredDonors definition with this:
  const filteredDonors = donors.filter((donor) => {
    // First filter by tab (status)
    if (activeTab !== "all" && donor.status !== activeTab) return false;

    // Then apply additional filters

    // Filter by search text
    if (searchText && !donor.name.toLowerCase().includes(searchText.toLowerCase()) && !donor.id.toLowerCase().includes(searchText.toLowerCase()) && !donor.email.toLowerCase().includes(searchText.toLowerCase()) && !donor.phone.includes(searchText)) {
      return false;
    }

    // Filter by blood type
    if (bloodTypeFilter !== "all") {
      const normalizedBloodType = bloodTypeFilter.replace("-", "").toUpperCase();
      if (donor.bloodType !== normalizedBloodType) return false;
    }

    // Filter by status (from dropdown, not tab)
    if (statusFilter !== "all" && donor.status !== statusFilter) return false;

    return true;
  });

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

  // Handle schedule donation
  const handleScheduleDonation = (donor: any) => {
    setScheduleDonationModal({
      isOpen: true,
      donorId: donor.id,
      donorName: donor.name,
      donorBloodType: donor.bloodType,
    });
  };

  // Handle view donation history
  const handleViewDonationHistory = (donor: any) => {
    setDonationHistoryModal({
      isOpen: true,
      donorId: donor.id,
      donorName: donor.name,
      donationHistory: donor.donationHistory,
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">Blood Donors</h2>
          <p className="text-muted-foreground">Manage and track blood donors in your blood bank</p>
        </div>
        <Button asChild>
          <Link href="/blood-bank/donors/register">
            <Plus className="mr-2 h-4 w-4" />
            Register New Donor
          </Link>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Donors</CardTitle>
            <Users className="size-7 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">247</div>
            <p className="text-xs text-muted-foreground">+12 from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Donations This Month</CardTitle>
            <Calendar className="size-7 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">38</div>
            <p className="text-xs text-muted-foreground">+5 compared to last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eligible Donors</CardTitle>
            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
              Active
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">183</div>
            <p className="text-xs text-muted-foreground">Ready for donation</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Frequent Donors</CardTitle>
            <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">
              VIP
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">42</div>
            <p className="text-xs text-muted-foreground">5+ donations</p>
          </CardContent>
        </Card>
      </div>

      {/* Donor Distribution Chart */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Donors by Blood Type</CardTitle>
            <CardDescription>Distribution of registered donors by blood type</CardDescription>
          </CardHeader>
          <CardContent className="p-4 xl:p-6">
            <div className="h-[200px] w-full  grid grid-cols-8 gap-4">
              <div className="relative h-full flex flex-col justify-end items-center gap-2">
                <div className="bg-red-500 w-full rounded-t-md" style={{ height: "60%" }}></div>
                <span className="text-xs font-medium">O+</span>
                <span className="absolute top-0 -mt-5 text-xs">38%</span>
              </div>
              <div className="relative h-full flex flex-col justify-end items-center gap-2">
                <div className="bg-blue-500 w-full rounded-t-md" style={{ height: "30%" }}></div>
                <span className="text-xs font-medium">A+</span>
                <span className="absolute top-0 -mt-5 text-xs">18%</span>
              </div>
              <div className="relative h-full flex flex-col justify-end items-center gap-2">
                <div className="bg-green-500 w-full rounded-t-md" style={{ height: "20%" }}></div>
                <span className="text-xs font-medium">B+</span>
                <span className="absolute top-0 -mt-5 text-xs">12%</span>
              </div>
              <div className="relative h-full flex flex-col justify-end items-center gap-2">
                <div className="bg-purple-500 w-full rounded-t-md" style={{ height: "10%" }}></div>
                <span className="text-xs font-medium">AB+</span>
                <span className="absolute top-0 -mt-5 text-xs">6%</span>
              </div>
              <div className="relative h-full flex flex-col justify-end items-center gap-2">
                <div className="bg-red-700 w-full rounded-t-md" style={{ height: "15%" }}></div>
                <span className="text-xs font-medium">O-</span>
                <span className="absolute top-0 -mt-5 text-xs">9%</span>
              </div>
              <div className="relative h-full flex flex-col justify-end items-center gap-2">
                <div className="bg-blue-700 w-full rounded-t-md" style={{ height: "12%" }}></div>
                <span className="text-xs font-medium">A-</span>
                <span className="absolute top-0 -mt-5 text-xs">7%</span>
              </div>
              <div className="relative h-full flex flex-col justify-end items-center gap-2">
                <div className="bg-green-700 w-full rounded-t-md" style={{ height: "10%" }}></div>
                <span className="text-xs font-medium">B-</span>
                <span className="absolute top-0 -mt-5 text-xs">6%</span>
              </div>
              <div className="relative h-full flex flex-col justify-end items-center gap-2">
                <div className="bg-purple-700 w-full rounded-t-md" style={{ height: "7%" }}></div>
                <span className="text-xs font-medium">AB-</span>
                <span className="absolute top-0 -mt-5 text-xs">4%</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-1 flex flex-col justify-between">
          <CardHeader>
            <CardTitle>Donation Frequency</CardTitle>
            <CardDescription>Number of donors by donation frequency</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[200px] w-full flex items-end gap-2">
              <div className="relative h-full flex flex-col justify-end items-center gap-2 w-1/5">
                <div className="bg-slate-500 w-full rounded-t-md" style={{ height: "40%" }}></div>
                <span className="text-xs font-medium">First Time</span>
                <span className="absolute top-0 -mt-5 text-xs">98</span>
              </div>
              <div className="relative h-full flex flex-col justify-end items-center gap-2 w-1/5">
                <div className="bg-slate-500 w-full rounded-t-md" style={{ height: "45%" }}></div>
                <span className="text-xs font-medium">2-4 Times</span>
                <span className="absolute top-0 -mt-5 text-xs">107</span>
              </div>
              <div className="relative h-full flex flex-col justify-end items-center gap-2 w-1/5">
                <div className="bg-slate-500 w-full rounded-t-md" style={{ height: "20%" }}></div>
                <span className="text-xs font-medium">5-9 Times</span>
                <span className="absolute top-0 -mt-5 text-xs">24</span>
              </div>
              <div className="relative h-full flex flex-col justify-end items-center gap-2 w-1/5">
                <div className="bg-slate-500 w-full rounded-t-md" style={{ height: "10%" }}></div>
                <span className="text-xs font-medium">10-24 Times</span>
                <span className="absolute top-0 -mt-5 text-xs">12</span>
              </div>
              <div className="relative h-full flex flex-col justify-end items-center gap-2 w-1/5">
                <div className="bg-slate-500 w-full rounded-t-md" style={{ height: "5%" }}></div>
                <span className="text-xs font-medium">25+ Times</span>
                <span className="absolute top-0 -mt-5 text-xs">6</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="flex flex-1 items-center space-x-2">
          {/* Update the search input to use the state */}
          {/* Replace the existing search input with: */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Search donors..." className="pl-8" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
          </div>

          {/* Update the blood type select to use the state */}
          {/* Replace the existing blood type select with: */}
          <Select value={bloodTypeFilter} onValueChange={setBloodTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Blood Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Blood Types</SelectItem>
              <SelectItem value="o-positive">O+</SelectItem>
              <SelectItem value="o-negative">O-</SelectItem>
              <SelectItem value="a-positive">A+</SelectItem>
              <SelectItem value="a-negative">A-</SelectItem>
              <SelectItem value="b-positive">B+</SelectItem>
              <SelectItem value="b-negative">B-</SelectItem>
              <SelectItem value="ab-positive">AB+</SelectItem>
              <SelectItem value="ab-negative">AB-</SelectItem>
            </SelectContent>
          </Select>

          {/* Update the status select to use the state */}
          {/* Replace the existing status select with: */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="eligible">Eligible</SelectItem>
              <SelectItem value="ineligible">Ineligible</SelectItem>
              <SelectItem value="new">New Donors</SelectItem>
            </SelectContent>
          </Select>

          {/* Add a reset filters button */}
          {/* Add this after the Filter button: */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              setSearchText("");
              setBloodTypeFilter("all");
              setStatusFilter("all");
            }}
            title="Reset Filters"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Tabs and Table */}
      <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Donors</TabsTrigger>
          <TabsTrigger value="eligible">Eligible</TabsTrigger>
          <TabsTrigger value="ineligible">Ineligible</TabsTrigger>
          <TabsTrigger value="new">New</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="border rounded-md mt-2">
          <Table className="whitespace-nowrap">
            <TableHeader>
              <TableRow>
                <TableHead>Donor</TableHead>
                <TableHead>Blood Type</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Last Donation</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total Donations</TableHead>
                <TableHead>Next Eligible</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="whitespace-nowrap">
              {filteredDonors.map((donor) => (
                <TableRow key={donor.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={donor.image || "/user-2.png"} alt={donor.name} />
                        <AvatarFallback>{donor.initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium">{donor.name}</span>
                        <span className="text-xs text-muted-foreground">{donor.id}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs">{donor.phone}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs">{donor.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{donor.lastDonation ? new Date(donor.lastDonation).toLocaleDateString() : "Never donated"}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(donor.status)}>{getStatusText(donor.status)}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{donor.totalDonations}</span>
                      {getDonationBadge(donor.totalDonations)}
                    </div>
                  </TableCell>
                  <TableCell>{donor.nextEligible === "N/A" ? "N/A" : new Date(donor.nextEligible).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <Link href={`/blood-bank/donors/${donor.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Donor Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleScheduleDonation(donor)}>
                          <Calendar className="h-4 w-4 mr-2" />
                          Schedule Donation
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/blood-bank/donors/${donor.id}/edit`}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Donor Info
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleViewDonationHistory(donor)}>View Donation History</DropdownMenuItem>
                        <DropdownMenuItem>Print Donor Card</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
        <TabsContent value="eligible" className="border rounded-md mt-2">
          <Table className="whitespace-nowrap">
            <TableHeader>
              <TableRow>
                <TableHead>Donor</TableHead>
                <TableHead>Blood Type</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Last Donation</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total Donations</TableHead>
                <TableHead>Next Eligible</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="whitespace-nowrap">
              {filteredDonors.map((donor) => (
                <TableRow key={donor.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={donor.image || "/user-2.png"} alt={donor.name} />
                        <AvatarFallback>{donor.initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium">{donor.name}</span>
                        <span className="text-xs text-muted-foreground">{donor.id}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs">{donor.phone}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs">{donor.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{donor.lastDonation ? new Date(donor.lastDonation).toLocaleDateString() : "Never donated"}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(donor.status)}>{getStatusText(donor.status)}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{donor.totalDonations}</span>
                      {getDonationBadge(donor.totalDonations)}
                    </div>
                  </TableCell>
                  <TableCell>{donor.nextEligible === "N/A" ? "N/A" : new Date(donor.nextEligible).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <Link href={`/blood-bank/donors/${donor.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Donor Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleScheduleDonation(donor)}>
                          <Calendar className="h-4 w-4 mr-2" />
                          Schedule Donation
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/blood-bank/donors/${donor.id}/edit`}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Donor Info
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleViewDonationHistory(donor)}>View Donation History</DropdownMenuItem>
                        <DropdownMenuItem>Print Donor Card</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
        <TabsContent value="ineligible" className="border rounded-md mt-2">
          <Table className="whitespace-nowrap">
            <TableHeader>
              <TableRow>
                <TableHead>Donor</TableHead>
                <TableHead>Blood Type</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Last Donation</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total Donations</TableHead>
                <TableHead>Next Eligible</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="whitespace-nowrap">
              {filteredDonors.map((donor) => (
                <TableRow key={donor.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={donor.image || "/user-2.png"} alt={donor.name} />
                        <AvatarFallback>{donor.initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium">{donor.name}</span>
                        <span className="text-xs text-muted-foreground">{donor.id}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs">{donor.phone}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs">{donor.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{donor.lastDonation ? new Date(donor.lastDonation).toLocaleDateString() : "Never donated"}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(donor.status)}>{getStatusText(donor.status)}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{donor.totalDonations}</span>
                      {getDonationBadge(donor.totalDonations)}
                    </div>
                  </TableCell>
                  <TableCell>{donor.nextEligible === "N/A" ? "N/A" : new Date(donor.nextEligible).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <Link href={`/blood-bank/donors/${donor.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Donor Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleScheduleDonation(donor)}>
                          <Calendar className="h-4 w-4 mr-2" />
                          Schedule Donation
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/blood-bank/donors/${donor.id}/edit`}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Donor Info
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleViewDonationHistory(donor)}>View Donation History</DropdownMenuItem>
                        <DropdownMenuItem>Print Donor Card</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
        <TabsContent value="new" className="border rounded-md mt-2">
          <Table className="whitespace-nowrap">
            <TableHeader>
              <TableRow>
                <TableHead>Donor</TableHead>
                <TableHead>Blood Type</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Last Donation</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total Donations</TableHead>
                <TableHead>Next Eligible</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="whitespace-nowrap">
              {filteredDonors.map((donor) => (
                <TableRow key={donor.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={donor.image || "/user-2.png"} alt={donor.name} />
                        <AvatarFallback>{donor.initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium">{donor.name}</span>
                        <span className="text-xs text-muted-foreground">{donor.id}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs">{donor.phone}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs">{donor.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{donor.lastDonation ? new Date(donor.lastDonation).toLocaleDateString() : "Never donated"}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(donor.status)}>{getStatusText(donor.status)}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{donor.totalDonations}</span>
                      {getDonationBadge(donor.totalDonations)}
                    </div>
                  </TableCell>
                  <TableCell>{donor.nextEligible === "N/A" ? "N/A" : new Date(donor.nextEligible).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <Link href={`/blood-bank/donors/${donor.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Donor Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleScheduleDonation(donor)}>
                          <Calendar className="h-4 w-4 mr-2" />
                          Schedule Donation
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/blood-bank/donors/${donor.id}/edit`}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Donor Info
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleViewDonationHistory(donor)}>View Donation History</DropdownMenuItem>
                        <DropdownMenuItem>Print Donor Card</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing <strong>1</strong> to <strong>{filteredDonors.length}</strong> of <strong>247</strong> donors
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" disabled>
            Previous
          </Button>
          <Button variant="outline" size="sm">
            Next
          </Button>
        </div>
      </div>

      {/* Modals */}
      <ScheduleDonationModal isOpen={scheduleDonationModal.isOpen} onClose={() => setScheduleDonationModal({ isOpen: false, donorId: "", donorName: "", donorBloodType: "" })} donorId={scheduleDonationModal.donorId} donorName={scheduleDonationModal.donorName} donorBloodType={scheduleDonationModal.donorBloodType} />

      <DonationHistoryModal isOpen={donationHistoryModal.isOpen} onClose={() => setDonationHistoryModal({ isOpen: false, donorId: "", donorName: "", donationHistory: [] })} donorId={donationHistoryModal.donorId} donorName={donationHistoryModal.donorName} donationHistory={donationHistoryModal.donationHistory} />
    </div>
  );
}
