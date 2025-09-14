"use client";

import { CalendarDateRangePicker } from "@/components/date-range-picker";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, CreditCard, Download, FileText, MoreHorizontal, Receipt, Search, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

// Sample payments data
const payments = [
  {
    id: "PMT-001",
    patient: {
      name: "John Smith",
      image: "/colorful-abstract-shapes.png",
      id: "P12345",
    },
    invoice: "INV-001",
    date: "2024-04-22",
    amount: 200.0,
    method: "Credit Card",
    status: "Completed",
    cardType: "Visa",
    cardLast4: "4242",
    transactionId: "txn_1234567890",
  },
  {
    id: "PMT-002",
    patient: {
      name: "Robert Wilson",
      image: "/user-3.png",
      id: "P34567",
    },
    invoice: "INV-003",
    date: "2024-04-20",
    amount: 175.0,
    method: "Debit Card",
    status: "Completed",
    cardType: "Mastercard",
    cardLast4: "5678",
    transactionId: "txn_2345678901",
  },
  {
    id: "PMT-003",
    patient: {
      name: "Jessica Brown",
      image: "/user-3.png",
      id: "P45678",
    },
    invoice: "INV-004",
    date: "2024-04-18",
    amount: 520.0,
    method: "Bank Transfer",
    status: "Completed",
    transactionId: "txn_3456789012",
  },
  {
    id: "PMT-004",
    patient: {
      name: "Sarah Thompson",
      image: "/user-3.png",
      id: "P67890",
    },
    invoice: "INV-006",
    date: "2024-04-15",
    amount: 300.0,
    method: "Cash",
    status: "Completed",
    receiptNumber: "RCP-12345",
  },
  {
    id: "PMT-005",
    patient: {
      name: "John Smith",
      image: "/colorful-abstract-shapes.png",
      id: "P12345",
    },
    invoice: "INV-001",
    date: "2024-04-10",
    amount: 50.0,
    method: "Insurance",
    status: "Processing",
    claimNumber: "CLM-98765",
  },
  {
    id: "PMT-006",
    patient: {
      name: "Emily Davis",
      image: "/colorful-abstract-shapes.png",
      id: "P23456",
    },
    invoice: "INV-002",
    date: "2024-04-25",
    amount: 350.0,
    method: "Credit Card",
    status: "Failed",
    cardType: "Visa",
    cardLast4: "1234",
    transactionId: "txn_4567890123",
    failureReason: "Insufficient funds",
  },
  {
    id: "PMT-007",
    patient: {
      name: "Michael Johnson",
      image: "/user-3.png",
      id: "P56789",
    },
    invoice: "INV-005",
    date: "2024-04-28",
    amount: 450.0,
    method: "Check",
    status: "Pending",
    checkNumber: "CHK-56789",
  },
];

export default function PaymentsHistoryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [dateRange, setDateRange] = useState({ from: undefined, to: undefined });
  const [paymentMethod, setPaymentMethod] = useState("all");

  // Filter payments based on search query
  const filteredPayments = payments.filter((payment) => {
    // Filter by search query
    const searchFilter = searchQuery === "" || payment.id.toLowerCase().includes(searchQuery.toLowerCase()) || payment.patient.name.toLowerCase().includes(searchQuery.toLowerCase()) || payment.patient.id.toLowerCase().includes(searchQuery.toLowerCase()) || payment.invoice.toLowerCase().includes(searchQuery.toLowerCase());

    // Filter by status tab
    const statusFilter = activeTab === "all" || (activeTab === "completed" && payment.status === "Completed") || (activeTab === "pending" && (payment.status === "Pending" || payment.status === "Processing")) || (activeTab === "failed" && payment.status === "Failed");

    // Filter by payment method
    const methodFilter = paymentMethod === "all" || payment.method === paymentMethod;

    // Filter by date range
    let dateFilter = true;
    if (dateRange.from && dateRange.to) {
      const paymentDate = new Date(payment.date);
      const fromDate = new Date(dateRange.from);
      const toDate = new Date(dateRange.to);
      toDate.setHours(23, 59, 59, 999); // Include the entire "to" day
      dateFilter = paymentDate >= fromDate && paymentDate <= toDate;
    }

    return searchFilter && statusFilter && methodFilter && dateFilter;
  });

  // Sort filtered payments
  const sortedPayments = [...filteredPayments].sort((a, b) => {
    switch (sortOrder) {
      case "newest":
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      case "oldest":
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      case "highest":
        return b.amount - a.amount;
      case "lowest":
        return a.amount - b.amount;
      default:
        return 0;
    }
  });

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery("");
    setActiveTab("all");
    setSortOrder("newest");
    setDateRange({ from: undefined, to: undefined });
    setPaymentMethod("all");
  };

  // Check if any filters are active
  const hasActiveFilters = searchQuery !== "" || activeTab !== "all" || sortOrder !== "newest" || dateRange.from !== undefined || paymentMethod !== "all";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="outline" size="icon" asChild>
          <Link href="/billing">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Payments History</h1>
          <p className="text-muted-foreground">View and manage all payment transactions.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-start justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Search payments..." className="pl-8 w-full md:w-[250px]" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            {searchQuery && (
              <Button variant="ghost" size="sm" className="absolute right-0 top-0 h-9 w-9 p-0" onClick={() => setSearchQuery("")}>
                <X className="h-4 w-4" />
                <span className="sr-only">Clear search</span>
              </Button>
            )}
          </div>
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Payment Method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              <SelectItem value="Credit Card">Credit Card</SelectItem>
              <SelectItem value="Debit Card">Debit Card</SelectItem>
              <SelectItem value="Cash">Cash</SelectItem>
              <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
              <SelectItem value="Check">Check</SelectItem>
              <SelectItem value="Insurance">Insurance</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
            <span className="sr-only">Download</span>
          </Button>
          {hasActiveFilters && (
            <Button variant="outline" onClick={resetFilters} className="gap-1">
              <X className="h-4 w-4" />
              Reset
            </Button>
          )}
        </div>
        <div className="w-full md:w-auto">
          <CalendarDateRangePicker />
        </div>
      </div>

      {hasActiveFilters && (
        <div className="text-sm text-muted-foreground">
          Showing {sortedPayments.length} of {payments.length} payments
        </div>
      )}

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Payments</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="failed">Failed</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <CardTitle>All Payments</CardTitle>
                <CardDescription>View all payment transactions.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select value={sortOrder} onValueChange={setSortOrder}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="highest">Highest Amount</SelectItem>
                    <SelectItem value="lowest">Lowest Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {sortedPayments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="rounded-full bg-muted p-3">
                    <Search className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">No payments found</h3>
                  <p className="mt-2 text-sm text-muted-foreground">Try adjusting your search or filters to find what you're looking for.</p>
                  <Button variant="outline" onClick={resetFilters} className="mt-4">
                    Reset filters
                  </Button>
                </div>
              ) : (
                <Table className="whitespace-nowrap">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment ID</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="whitespace-nowrap">
                    {sortedPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">{payment.id}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={payment.patient.image || "/user-2.png"} alt={payment.patient.name} />
                              <AvatarFallback>{payment.patient.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{payment.patient.name}</p>
                              <p className="text-xs text-muted-foreground">{payment.patient.id}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{payment.invoice}</TableCell>
                        <TableCell>{payment.date}</TableCell>
                        <TableCell className="text-right">${payment.amount.toFixed(2)}</TableCell>
                        <TableCell>{payment.method}</TableCell>
                        <TableCell>
                          <Badge
                            variant={payment.status === "Completed" ? "default" : payment.status === "Failed" ? "destructive" : "outline"}
                            className={payment.status === "Completed" ? "bg-green-500" : payment.status === "Failed" ? "bg-red-500" : payment.status === "Processing" ? "border-blue-500 text-blue-500" : "border-amber-500 text-amber-500"}
                          >
                            {payment.status}
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
                                <Link href={`/billing/payments/${payment.id}`}>
                                  <Receipt className="mr-2 h-4 w-4" />
                                  View Receipt
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <FileText className="mr-2 h-4 w-4" />
                                View Invoice
                              </DropdownMenuItem>
                              {payment.status === "Pending" && (
                                <DropdownMenuItem>
                                  <CreditCard className="mr-2 h-4 w-4" />
                                  Process Payment
                                </DropdownMenuItem>
                              )}
                              {payment.status === "Failed" && (
                                <DropdownMenuItem>
                                  <CreditCard className="mr-2 h-4 w-4" />
                                  Retry Payment
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>
                                <Download className="mr-2 h-4 w-4" />
                                Download Receipt
                              </DropdownMenuItem>
                              {payment.status === "Completed" && <DropdownMenuItem className="text-red-600">Void Payment</DropdownMenuItem>}
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
        </TabsContent>

        <TabsContent value="completed">
          <Card>
            <CardHeader>
              <CardTitle>Completed Payments</CardTitle>
              <CardDescription>View all successfully completed payments.</CardDescription>
            </CardHeader>
            <CardContent>
              {sortedPayments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="rounded-full bg-muted p-3">
                    <Search className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">No completed payments found</h3>
                  <p className="mt-2 text-sm text-muted-foreground">Try adjusting your search or filters to find what you're looking for.</p>
                  <Button variant="outline" onClick={resetFilters} className="mt-4">
                    Reset filters
                  </Button>
                </div>
              ) : (
                <Table className="whitespace-nowrap">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment ID</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="hidden md:table-cell">Transaction ID</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="whitespace-nowrap">
                    {sortedPayments
                      .filter((payment) => payment.status === "Completed")
                      .map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">{payment.id}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={payment.patient.image || "/user-2.png"} alt={payment.patient.name} />
                                <AvatarFallback>{payment.patient.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <span>{payment.patient.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>{payment.invoice}</TableCell>
                          <TableCell>{payment.date}</TableCell>
                          <TableCell className="text-right">${payment.amount.toFixed(2)}</TableCell>
                          <TableCell>{payment.method}</TableCell>
                          <TableCell className="hidden md:table-cell">{payment.transactionId || payment.receiptNumber || "-"}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" className="h-8" asChild>
                              <Link href={`/billing/payments/${payment.id}`}>
                                <Receipt className="mr-2 h-4 w-4" />
                                <span className="hidden sm:inline">Receipt</span>
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Payments</CardTitle>
              <CardDescription>View all pending and processing payments.</CardDescription>
            </CardHeader>
            <CardContent>
              {sortedPayments.filter((payment) => payment.status === "Pending" || payment.status === "Processing").length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="rounded-full bg-muted p-3">
                    <Search className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">No pending payments found</h3>
                  <p className="mt-2 text-sm text-muted-foreground">Try adjusting your search or filters to find what you're looking for.</p>
                  <Button variant="outline" onClick={resetFilters} className="mt-4">
                    Reset filters
                  </Button>
                </div>
              ) : (
                <Table className="whitespace-nowrap">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment ID</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="whitespace-nowrap">
                    {sortedPayments
                      .filter((payment) => payment.status === "Pending" || payment.status === "Processing")
                      .map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">{payment.id}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={payment.patient.image || "/user-2.png"} alt={payment.patient.name} />
                                <AvatarFallback>{payment.patient.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <span>{payment.patient.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>{payment.invoice}</TableCell>
                          <TableCell>{payment.date}</TableCell>
                          <TableCell className="text-right">${payment.amount.toFixed(2)}</TableCell>
                          <TableCell>{payment.method}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={payment.status === "Processing" ? "border-blue-500 text-blue-500" : "border-amber-500 text-amber-500"}>
                              {payment.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" className="h-8">
                                <CreditCard className="mr-2 h-4 w-4" />
                                <span className="hidden sm:inline">Process</span>
                              </Button>
                              <Button size="sm" variant="outline" className="h-8" asChild>
                                <Link href={`/billing/payments/${payment.id}`}>
                                  <FileText className="mr-2 h-4 w-4" />
                                  <span className="hidden sm:inline">Details</span>
                                </Link>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="failed">
          <Card>
            <CardHeader>
              <CardTitle>Failed Payments</CardTitle>
              <CardDescription>View all failed payment attempts.</CardDescription>
            </CardHeader>
            <CardContent>
              {sortedPayments.filter((payment) => payment.status === "Failed").length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="rounded-full bg-muted p-3">
                    <Search className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">No failed payments found</h3>
                  <p className="mt-2 text-sm text-muted-foreground">Try adjusting your search or filters to find what you're looking for.</p>
                  <Button variant="outline" onClick={resetFilters} className="mt-4">
                    Reset filters
                  </Button>
                </div>
              ) : (
                <Table className="whitespace-nowrap">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment ID</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="hidden md:table-cell">Failure Reason</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="whitespace-nowrap">
                    {sortedPayments
                      .filter((payment) => payment.status === "Failed")
                      .map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">{payment.id}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={payment.patient.image || "/user-2.png"} alt={payment.patient.name} />
                                <AvatarFallback>{payment.patient.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <span>{payment.patient.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>{payment.invoice}</TableCell>
                          <TableCell>{payment.date}</TableCell>
                          <TableCell className="text-right">${payment.amount.toFixed(2)}</TableCell>
                          <TableCell>{payment.method}</TableCell>
                          <TableCell className="hidden md:table-cell">{payment.failureReason || "Unknown error"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" className="h-8">
                                <CreditCard className="mr-2 h-4 w-4" />
                                <span className="hidden sm:inline">Retry</span>
                              </Button>
                              <Button size="sm" variant="outline" className="h-8" asChild>
                                <Link href={`/billing/payments/${payment.id}`}>
                                  <FileText className="mr-2 h-4 w-4" />
                                  <span className="hidden sm:inline">Details</span>
                                </Link>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Total Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              $
              {payments
                .filter((payment) => payment.status === "Completed")
                .reduce((total, payment) => total + payment.amount, 0)
                .toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">From {payments.filter((payment) => payment.status === "Completed").length} transactions</p>
            <div className="mt-2 h-1 w-full bg-muted">
              <div
                className="h-1 bg-green-500"
                style={{
                  width: `${(payments.filter((payment) => payment.status === "Completed").length / payments.length) * 100}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pending Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              $
              {payments
                .filter((payment) => payment.status === "Pending" || payment.status === "Processing")
                .reduce((total, payment) => total + payment.amount, 0)
                .toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">From {payments.filter((payment) => payment.status === "Pending" || payment.status === "Processing").length} transactions</p>
            <div className="mt-2 h-1 w-full bg-muted">
              <div
                className="h-1 bg-amber-500"
                style={{
                  width: `${(payments.filter((payment) => payment.status === "Pending" || payment.status === "Processing").length / payments.length) * 100}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Failed Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              $
              {payments
                .filter((payment) => payment.status === "Failed")
                .reduce((total, payment) => total + payment.amount, 0)
                .toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">From {payments.filter((payment) => payment.status === "Failed").length} transactions</p>
            <div className="mt-2 h-1 w-full bg-muted">
              <div
                className="h-1 bg-red-500"
                style={{
                  width: `${(payments.filter((payment) => payment.status === "Failed").length / payments.length) * 100}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Credit Card</span>
                <span className="text-sm font-medium">{payments.filter((payment) => payment.method === "Credit Card").length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Debit Card</span>
                <span className="text-sm font-medium">{payments.filter((payment) => payment.method === "Debit Card").length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Cash</span>
                <span className="text-sm font-medium">{payments.filter((payment) => payment.method === "Cash").length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Other</span>
                <span className="text-sm font-medium">{payments.filter((payment) => payment.method !== "Credit Card" && payment.method !== "Debit Card" && payment.method !== "Cash").length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
