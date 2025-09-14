"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Calendar1, Check, Clock, Filter, MoreHorizontal, Search, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

// Types
type Patient = {
  name: string;
  image: string;
  phone: string;
  email: string;
};

type AppointmentRequest = {
  id: string;
  patient: Patient;
  requestedDoctor: string;
  preferredDate: string;
  preferredTime: "Morning" | "Afternoon" | "Evening";
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
  requestedOn: string;
  type: string;
  urgency: "High" | "Normal" | "Low";
  notes: string;
  scheduledDate?: string;
  scheduledTime?: string;
  scheduledDoctor?: string;
  rejectionReason?: string;
};

type Filters = {
  type: string[];
  urgency: string[];
  requestedDoctor: string[];
};

// Sample appointment requests data
const initialRequests: AppointmentRequest[] = [
  {
    id: "1",
    patient: {
      name: "John Smith",
      image: "/colorful-abstract-shapes.png",
      phone: "+1 (555) 123-4567",
      email: "john.smith@example.com",
    },
    requestedDoctor: "Dr. Sarah Johnson",
    preferredDate: "2023-07-25",
    preferredTime: "Morning",
    reason: "Annual check-up",
    status: "Pending",
    requestedOn: "2023-07-15",
    type: "Check-up",
    urgency: "Normal",
    notes: "Patient has requested Dr. Johnson specifically.",
  },
  {
    id: "2",
    patient: {
      name: "Emily Davis",
      image: "/colorful-abstract-shapes.png",
      phone: "+1 (555) 234-5678",
      email: "emily.davis@example.com",
    },
    requestedDoctor: "Any cardiologist",
    preferredDate: "2023-07-28",
    preferredTime: "Afternoon",
    reason: "Heart palpitations",
    status: "Pending",
    requestedOn: "2023-07-16",
    type: "Consultation",
    urgency: "High",
    notes: "Patient has been experiencing heart palpitations for the past week.",
  },
  {
    id: "3",
    patient: {
      name: "Robert Wilson",
      image: "/user-3.png",
      phone: "+1 (555) 345-6789",
      email: "robert.wilson@example.com",
    },
    requestedDoctor: "Dr. Lisa Patel",
    preferredDate: "2023-07-30",
    preferredTime: "Evening",
    reason: "Follow-up after surgery",
    status: "Approved",
    requestedOn: "2023-07-14",
    type: "Follow-up",
    urgency: "Normal",
    notes: "Post-operative follow-up for knee surgery performed on July 1st.",
    scheduledDate: "2023-07-30",
    scheduledTime: "04:30 PM",
    scheduledDoctor: "Dr. Lisa Patel",
  },
  {
    id: "4",
    patient: {
      name: "Jessica Brown",
      image: "/user-3.png",
      phone: "+1 (555) 456-7890",
      email: "jessica.brown@example.com",
    },
    requestedDoctor: "Dr. James Wilson",
    preferredDate: "2023-07-26",
    preferredTime: "Morning",
    reason: "Dental pain",
    status: "Approved",
    requestedOn: "2023-07-15",
    type: "Emergency",
    urgency: "High",
    notes: "Patient is experiencing severe dental pain.",
    scheduledDate: "2023-07-26",
    scheduledTime: "09:15 AM",
    scheduledDoctor: "Dr. James Wilson",
  },
  {
    id: "5",
    patient: {
      name: "Michael Johnson",
      image: "/user-3.png",
      phone: "+1 (555) 567-8901",
      email: "michael.johnson@example.com",
    },
    requestedDoctor: "Any available doctor",
    preferredDate: "2023-07-27",
    preferredTime: "Afternoon",
    reason: "Skin rash",
    status: "Rejected",
    requestedOn: "2023-07-16",
    type: "Consultation",
    urgency: "Normal",
    notes: "Patient has a skin rash that has been persistent for two weeks.",
    rejectionReason: "No dermatologists available on the requested date. Patient advised to reschedule for the following week.",
  },
  {
    id: "6",
    patient: {
      name: "Sarah Thompson",
      image: "/user-3.png",
      phone: "+1 (555) 678-9012",
      email: "sarah.thompson@example.com",
    },
    requestedDoctor: "Dr. Robert Kim",
    preferredDate: "2023-07-29",
    preferredTime: "Morning",
    reason: "Therapy session",
    status: "Rejected",
    requestedOn: "2023-07-15",
    type: "Therapy",
    urgency: "Low",
    notes: "Regular therapy session.",
    rejectionReason: "Dr. Kim is on vacation during the requested period. Patient advised to schedule with another therapist or wait until Dr. Kim returns.",
  },
  {
    id: "7",
    patient: {
      name: "David Miller",
      image: "/user-3.png",
      phone: "+1 (555) 789-0123",
      email: "david.miller@example.com",
    },
    requestedDoctor: "Dr. Jennifer Lee",
    preferredDate: "2023-07-31",
    preferredTime: "Morning",
    reason: "Annual physical",
    status: "Pending",
    requestedOn: "2023-07-17",
    type: "Check-up",
    urgency: "Low",
    notes: "Regular annual physical examination.",
  },
];

// Get unique values for filter options
const getUniqueValues = (data: any, key: any) => {
  return [
    ...new Set(
      data.map((item: any) => {
        if (key.includes(".")) {
          const keys = key.split(".");
          return item[keys[0]][keys[1]];
        }
        return item[key];
      })
    ),
  ];
};

export default function AppointmentRequestsPage() {
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [requests, setRequests] = useState<AppointmentRequest[]>(initialRequests);
  const [filteredRequests, setFilteredRequests] = useState<AppointmentRequest[]>(initialRequests.filter((request) => request.status === "Pending"));
  const [filters, setFilters] = useState<Filters>({
    type: [],
    urgency: [],
    requestedDoctor: [],
  });
  const [isFiltersApplied, setIsFiltersApplied] = useState(false);

  const typeOptions = getUniqueValues(requests, "type");
  const urgencyOptions = getUniqueValues(requests, "urgency");
  const doctorOptions = getUniqueValues(requests, "requestedDoctor");

  const applyFilters = () => {
    let result = [...initialRequests];

    if (activeTab === "pending") {
      result = result.filter((request) => request.status === "Pending");
    } else if (activeTab === "approved") {
      result = result.filter((request) => request.status === "Approved");
    } else if (activeTab === "rejected") {
      result = result.filter((request) => request.status === "Rejected");
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter((request) => request.patient.name.toLowerCase().includes(search) || request.requestedDoctor.toLowerCase().includes(search) || request.reason.toLowerCase().includes(search) || request.type.toLowerCase().includes(search));
    }

    let hasActiveFilters = false;

    if (filters.type.length > 0) {
      result = result.filter((request) => filters.type.includes(request.type));
      hasActiveFilters = true;
    }

    if (filters.urgency.length > 0) {
      result = result.filter((request) => filters.urgency.includes(request.urgency));
      hasActiveFilters = true;
    }

    if (filters.requestedDoctor.length > 0) {
      result = result.filter((request) => filters.requestedDoctor.includes(request.requestedDoctor));
      hasActiveFilters = true;
    }

    setIsFiltersApplied(hasActiveFilters);
    setFilteredRequests(result);
  };

  const handleFilterChange = (filterType: keyof Filters, value: string) => {
    setFilters((prev) => {
      const newFilters = { ...prev };

      if (newFilters[filterType].includes(value)) {
        newFilters[filterType] = newFilters[filterType].filter((item) => item !== value);
      } else {
        newFilters[filterType] = [...newFilters[filterType], value];
      }

      return newFilters;
    });
  };

  const clearFilters = () => {
    setFilters({
      type: [],
      urgency: [],
      requestedDoctor: [],
    });
    setSearchTerm("");
  };

  const handleTabChange = (value: any) => {
    setActiveTab(value);
    clearFilters();
  };

  const handleApprove = (id: string) => {
    setRequests((prev) =>
      prev.map((request) =>
        request.id === id
          ? {
              ...request,
              status: "Approved",
              scheduledDate: request.preferredDate,
              scheduledTime: request.preferredTime === "Morning" ? "10:00 AM" : request.preferredTime === "Afternoon" ? "02:00 PM" : "05:00 PM",
              scheduledDoctor: request.requestedDoctor,
            }
          : request
      )
    );
  };

  const handleReject = (id: string) => {
    setRequests((prev) =>
      prev.map((request) =>
        request.id === id
          ? {
              ...request,
              status: "Rejected",
              rejectionReason: "No available slots for the requested time period.",
            }
          : request
      )
    );
  };

  useEffect(() => {
    applyFilters();
  }, [activeTab, searchTerm, filters]);

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case "High":
        return <Badge className="bg-red-500">High</Badge>;
      case "Normal":
        return <Badge className="bg-blue-500">Normal</Badge>;
      case "Low":
        return (
          <Badge variant="outline" className="border-green-500 text-green-500">
            Low
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="outline" size="icon" asChild>
          <Link href="/appointments">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">Appointment Requests</h2>
          <p className="text-muted-foreground">Manage patient appointment requests.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Pending Requests</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>

        {/* Tab content - shared structure for all tabs */}
        {["pending", "approved", "rejected"].map((tabValue) => (
          <TabsContent key={tabValue} value={tabValue}>
            <Card>
              <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <CardTitle>
                    {tabValue === "pending" && "Pending Appointment Requests"}
                    {tabValue === "approved" && "Approved Requests"}
                    {tabValue === "rejected" && "Rejected Requests"}
                  </CardTitle>
                  <CardDescription>
                    {tabValue === "pending" && "Review and process incoming appointment requests."}
                    {tabValue === "approved" && "View all approved appointment requests."}
                    {tabValue === "rejected" && "View all rejected appointment requests."}
                  </CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input type="search" placeholder="Search requests..." className="pl-8 w-full md:w-[250px]" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    {searchTerm && (
                      <Button variant="ghost" size="icon" className="absolute right-0 top-0 h-full" onClick={() => setSearchTerm("")}>
                        <X className="h-4 w-4" />
                        <span className="sr-only">Clear search</span>
                      </Button>
                    )}
                  </div>

                  {/* Filter dropdown */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant={isFiltersApplied ? "default" : "outline"} size="icon" className={isFiltersApplied ? "bg-primary text-primary-foreground" : ""}>
                        <Filter className="h-4 w-4" />
                        <span className="sr-only">Filter</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="end">
                      <div className="p-4 border-b">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Filters</h4>
                          <Button variant="ghost" size="sm" onClick={clearFilters} disabled={!isFiltersApplied && !searchTerm}>
                            Reset
                          </Button>
                        </div>
                      </div>
                      <ScrollArea className="h-[300px]">
                        <div className="p-4 space-y-4">
                          {/* Type filter */}
                          <div>
                            <h5 className="font-medium mb-2">Appointment Type</h5>
                            <div className="space-y-2">
                              {typeOptions.map((type: any) => (
                                <div key={type} className="flex items-center space-x-2">
                                  <Checkbox id={`type-${type}`} checked={filters.type.includes(type)} onCheckedChange={() => handleFilterChange("type", type)} />
                                  <Label htmlFor={`type-${type}`}>{type}</Label>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Urgency filter */}
                          <div>
                            <h5 className="font-medium mb-2">Urgency</h5>
                            <div className="space-y-2">
                              {urgencyOptions.map((urgency: any) => (
                                <div key={urgency} className="flex items-center space-x-2">
                                  <Checkbox id={`urgency-${urgency}`} checked={filters.urgency.includes(urgency)} onCheckedChange={() => handleFilterChange("urgency", urgency)} />
                                  <Label htmlFor={`urgency-${urgency}`} className="flex items-center">
                                    {getUrgencyBadge(urgency)}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Doctor filter */}
                          <div>
                            <h5 className="font-medium mb-2">Requested Doctor</h5>
                            <div className="space-y-2">
                              {doctorOptions.map((doctor: any) => (
                                <div key={doctor} className="flex items-center space-x-2">
                                  <Checkbox id={`doctor-${doctor}`} checked={filters.requestedDoctor.includes(doctor)} onCheckedChange={() => handleFilterChange("requestedDoctor", doctor)} />
                                  <Label htmlFor={`doctor-${doctor}`}>{doctor}</Label>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </ScrollArea>
                    </PopoverContent>
                  </Popover>
                </div>
              </CardHeader>
              <CardContent>
                <Table className="whitespace-nowrap">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead className="table-cell">Requested Doctor</TableHead>
                      <TableHead>Preferred Date</TableHead>
                      <TableHead className="table-cell">Type</TableHead>
                      <TableHead>Urgency</TableHead>
                      {tabValue === "approved" && <TableHead className="table-cell">Scheduled</TableHead>}
                      {tabValue === "rejected" && <TableHead className="table-cell">Reason</TableHead>}
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="whitespace-nowrap">
                    {filteredRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={request.patient.image || "/user-2.png"} alt={request.patient.name} />
                              <AvatarFallback>{request.patient.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{request.patient.name}</p>
                              <p className="text-sm text-muted-foreground md:hidden">{request.reason}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="table-cell">{request.requestedDoctor}</TableCell>
                        <TableCell>
                          <div>
                            <p>{request.preferredDate}</p>
                            <p className="text-sm text-muted-foreground">{request.preferredTime}</p>
                          </div>
                        </TableCell>
                        <TableCell className="table-cell">{request.type}</TableCell>
                        <TableCell>{getUrgencyBadge(request.urgency)}</TableCell>
                        {tabValue === "approved" && (
                          <TableCell className="table-cell">
                            <div>
                              <p>{request.scheduledDate}</p>
                              <p className="text-sm text-muted-foreground">{request.scheduledTime}</p>
                            </div>
                          </TableCell>
                        )}
                        {tabValue === "rejected" && (
                          <TableCell className="table-cell">
                            <p className="text-sm line-clamp-1">{request.rejectionReason?.slice(0, 40) + "..."}</p>
                          </TableCell>
                        )}
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
                              <DropdownMenuItem>
                                <Link href={`/appointments/1`}>View details</Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Link href={"/patients/1"}>View patient profile</Link>
                              </DropdownMenuItem>

                              {tabValue === "pending" && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleApprove(request.id)}>
                                    <Check className="mr-2 h-4 w-4" /> Approve request
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleReject(request.id)}>
                                    <X className="mr-2 h-4 w-4" /> Reject request
                                  </DropdownMenuItem>
                                </>
                              )}

                              {tabValue === "approved" && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem>
                                    <Calendar1 className="mr-2 h-4 w-4" /> View in calendar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Clock className="mr-2 h-4 w-4" /> Reschedule
                                  </DropdownMenuItem>
                                </>
                              )}

                              {tabValue === "rejected" && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleApprove(request.id)}>
                                    <Check className="mr-2 h-4 w-4" /> Reconsider and approve
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Empty state */}
                {filteredRequests.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    {searchTerm || isFiltersApplied ? (
                      <>
                        <Filter className="h-12 w-12 text-muted-foreground mb-2" />
                        <h3 className="text-lg font-semibold">No matching requests</h3>
                        <p className="text-muted-foreground">Try adjusting your search or filters to find what you're looking for.</p>
                        <Button variant="outline" className="mt-4" onClick={clearFilters}>
                          Clear all filters
                        </Button>
                      </>
                    ) : (
                      <>
                        {tabValue === "pending" && (
                          <>
                            <Clock className="h-12 w-12 text-muted-foreground mb-2" />
                            <h3 className="text-lg font-semibold">No pending requests</h3>
                            <p className="text-muted-foreground">There are no pending appointment requests to review.</p>
                          </>
                        )}
                        {tabValue === "approved" && (
                          <>
                            <Check className="h-12 w-12 text-muted-foreground mb-2" />
                            <h3 className="text-lg font-semibold">No approved requests</h3>
                            <p className="text-muted-foreground">There are no approved appointment requests to display.</p>
                          </>
                        )}
                        {tabValue === "rejected" && (
                          <>
                            <X className="h-12 w-12 text-muted-foreground mb-2" />
                            <h3 className="text-lg font-semibold">No rejected requests</h3>
                            <p className="text-muted-foreground">There are no rejected appointment requests to display.</p>
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
