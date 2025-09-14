import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, CreditCard, Download, FileText, Mail, Printer, Receipt } from "lucide-react";
import Link from "next/link";
import { use } from "react";

// Sample invoices data - this would normally come from an API or database
const invoices = [
  {
    id: "INV-001",
    patient: {
      name: "John Smith",
      image: "/colorful-abstract-shapes.png",
      id: "P12345",
      email: "john.smith@example.com",
      phone: "(555) 123-4567",
      address: "123 Main St, Anytown, CA 12345",
    },
    date: "2024-04-15",
    dueDate: "2024-05-15",
    amount: 250.0,
    paid: 200.0,
    balance: 50.0,
    status: "Partially Paid",
    items: [
      { description: "General Consultation", quantity: 1, unitPrice: 150.0, amount: 150.0 },
      { description: "Blood Test", quantity: 1, unitPrice: 100.0, amount: 100.0 },
    ],
    insurance: {
      provider: "Blue Cross Blue Shield",
      policyNumber: "BCBS-123456789",
      claimStatus: "Approved",
      claimAmount: 200.0,
      claimDate: "2024-04-18",
    },
    payments: [{ date: "2024-04-20", amount: 200.0, method: "Credit Card", reference: "PAY-12345" }],
    doctor: "Dr. Sarah Johnson",
    department: "General Medicine",
    notes: "Patient requested itemized receipt for insurance reimbursement.",
  },
  {
    id: "INV-002",
    patient: {
      name: "Emily Davis",
      image: "/colorful-abstract-shapes.png",
      id: "P23456",
      email: "emily.davis@example.com",
      phone: "(555) 234-5678",
      address: "456 Oak Ave, Somewhere, NY 23456",
    },
    date: "2024-04-16",
    dueDate: "2024-05-16",
    amount: 350.0,
    paid: 0.0,
    balance: 350.0,
    status: "Unpaid",
    items: [
      { description: "Specialist Consultation", quantity: 1, unitPrice: 200.0, amount: 200.0 },
      { description: "X-Ray", quantity: 1, unitPrice: 150.0, amount: 150.0 },
    ],
    insurance: {
      provider: "Aetna",
      policyNumber: "AET-987654321",
      claimStatus: "Pending",
      claimAmount: 280.0,
      claimDate: "2024-04-18",
    },
    payments: [],
    doctor: "Dr. Michael Chen",
    department: "Radiology",
    notes: "",
  },
  {
    id: "INV-003",
    patient: {
      name: "Robert Wilson",
      image: "/user-3.png",
      id: "P34567",
      email: "robert.wilson@example.com",
      phone: "(555) 345-6789",
      address: "789 Pine St, Elsewhere, TX 34567",
    },
    date: "2024-04-10",
    dueDate: "2024-05-10",
    amount: 175.0,
    paid: 175.0,
    balance: 0.0,
    status: "Paid",
    items: [
      { description: "Follow-up Consultation", quantity: 1, unitPrice: 100.0, amount: 100.0 },
      { description: "Prescription Renewal", quantity: 1, unitPrice: 75.0, amount: 75.0 },
    ],
    insurance: {
      provider: "UnitedHealthcare",
      policyNumber: "UHC-456789123",
      claimStatus: "Approved",
      claimAmount: 140.0,
      claimDate: "2024-04-12",
    },
    payments: [{ date: "2024-04-15", amount: 175.0, method: "Bank Transfer", reference: "PAY-67890" }],
    doctor: "Dr. Lisa Brown",
    department: "Family Medicine",
    notes: "Patient requested electronic receipt.",
  },
];

export default function InvoiceDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  // Find the invoice with the matching ID
  const {id} = use(params)
  const invoice = invoices.find((inv) => inv.id === id) || invoices[0];

  // Calculate subtotal, tax, and total
  const subtotal = invoice.items.reduce((sum, item) => sum + item.amount, 0);
  const tax = subtotal * 0.08; // Assuming 8% tax
  const total = subtotal + tax;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="icon" asChild>
            <Link href="/billing">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Link>
          </Button>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Invoice {invoice.id}</h1>
          <Badge variant={invoice.status === "Paid" ? "default" : invoice.status === "Unpaid" ? "destructive" : "outline"} className={invoice.status === "Paid" ? "bg-green-500" : invoice.status === "Unpaid" ? "bg-red-500" : "border-amber-500 text-amber-500"}>
            {invoice.status}
          </Badge>
        </div>
          <div className="flex gap-3 flex-wrap">
          <Button variant="outline" size="sm">
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button variant="outline" size="sm">
            <Mail className="mr-2 h-4 w-4" />
            Email
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
          {invoice.status !== "Paid" && (
            <Button size="sm">
              <CreditCard className="mr-2 h-4 w-4" />
              Record Payment
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Invoice Number</p>
                <p className="font-medium">{invoice.id}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Date</p>
                <p>{invoice.date}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Due Date</p>
                <p>{invoice.dueDate}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Amount Due</p>
                <p className="font-bold">${invoice.balance.toFixed(2)}</p>
              </div>
            </div>
            <Separator />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Doctor</p>
              <p>{invoice.doctor}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Department</p>
              <p>{invoice.department}</p>
            </div>
            {invoice.notes && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Notes</p>
                <p className="text-sm">{invoice.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Patient Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={invoice.patient.image || "/user-2.png"} alt={invoice.patient.name} />
                <AvatarFallback>{invoice.patient.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{invoice.patient.name}</p>
                <p className="text-sm text-muted-foreground">{invoice.patient.id}</p>
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-1 gap-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p>{invoice.patient.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Phone</p>
                <p>{invoice.patient.phone}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Address</p>
                <p className="text-sm">{invoice.patient.address}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table className="whitespace-nowrap">
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="whitespace-nowrap">
              {invoice.items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">${item.unitPrice.toFixed(2)}</TableCell>
                  <TableCell className="text-right">${item.amount.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter>
          <div className="ml-auto space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Subtotal:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-medium">Tax (8%):</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-base font-bold">Total:</span>
              <span className="text-base font-bold">${total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-medium">Amount Paid:</span>
              <span>${invoice.paid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-medium">Balance Due:</span>
              <span className="font-bold">${invoice.balance.toFixed(2)}</span>
            </div>
          </div>
        </CardFooter>
      </Card>

      <Tabs defaultValue="insurance" className="w-full">
        <TabsList>
          <TabsTrigger value="insurance">Insurance</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>
        <TabsContent value="insurance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Insurance Information</CardTitle>
              <CardDescription>Details about the insurance claim for this invoice</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Provider</p>
                  <p>{invoice.insurance.provider}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Policy Number</p>
                  <p>{invoice.insurance.policyNumber}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Claim Status</p>
                  <Badge
                    variant={invoice.insurance.claimStatus === "Approved" ? "default" : invoice.insurance.claimStatus === "Pending" || invoice.insurance.claimStatus === "Submitted" ? "outline" : "secondary"}
                    className={invoice.insurance.claimStatus === "Approved" ? "bg-green-500" : invoice.insurance.claimStatus === "Pending" || invoice.insurance.claimStatus === "Submitted" ? "border-blue-500 text-blue-500" : "bg-gray-500"}
                  >
                    {invoice.insurance.claimStatus}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Claim Amount</p>
                  <p>${invoice.insurance.claimAmount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Claim Date</p>
                  <p>{invoice.insurance.claimDate}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Patient Responsibility</p>
                  <p>${(total - invoice.insurance.claimAmount).toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="ml-auto">
                <FileText className="mr-2 h-4 w-4" />
                View Claim Details
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>Record of payments made for this invoice</CardDescription>
            </CardHeader>
            <CardContent>
              {invoice.payments.length > 0 ? (
                <Table className="whitespace-nowrap">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="whitespace-nowrap">
                    {invoice.payments.map((payment, index) => (
                      <TableRow key={index}>
                        <TableCell>{payment.date}</TableCell>
                        <TableCell>{payment.reference}</TableCell>
                        <TableCell>{payment.method}</TableCell>
                        <TableCell className="text-right">${payment.amount.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <Receipt className="h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-lg font-semibold">No payments yet</h3>
                  <p className="mt-1 text-sm text-muted-foreground">No payments have been recorded for this invoice.</p>
                </div>
              )}
            </CardContent>
            {invoice.status !== "Paid" && (
              <CardFooter>
                <Button className="ml-auto" href="/billing/create">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Record New Payment
                </Button>
              </CardFooter>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
