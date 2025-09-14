import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Calendar, Download, Edit, Package, PillIcon, Printer } from "lucide-react";
import Link from "next/link";
import { use } from "react";

export default function MedicineDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  // In a real application, you would fetch the medicine data based on the ID
  // For this example, we'll use a mock medicine object
  const { id } = use(params)      
  const medicine = {
    id: id,
    name: "Amoxicillin 500mg",
    generic: "Amoxicillin",
    category: "Antibiotics",
    type: "Prescription",
    manufacturer: "PharmaCorp Inc.",
    stock: 1250,
    batchNumber: "BAT20240315",
    expiryDate: "2025-06-15",
    purchaseDate: "2023-12-10",
    purchasePrice: 0.75,
    sellingPrice: 1.25,
    location: "Shelf A-12",
    status: "In Stock",
    description: "Amoxicillin is a penicillin antibiotic that fights bacteria. It is used to treat many different types of infection caused by bacteria, such as tonsillitis, bronchitis, pneumonia, and infections of the ear, nose, throat, skin, or urinary tract.",
    dosage: "One capsule three times daily, or as directed by physician.",
    sideEffects: "Diarrhea, nausea, vomiting, rash, allergic reactions in some patients.",
    contraindications: "Known hypersensitivity to penicillins or cephalosporins.",
    storage: "Store at room temperature between 15-30°C (59-86°F). Keep away from moisture and heat.",
    batchHistory: [
      { batch: "BAT20240315", quantity: 2000, received: "2023-12-10", expiry: "2025-06-15", remaining: 1250 },
      { batch: "BAT20230610", quantity: 1500, received: "2023-06-10", expiry: "2024-12-20", remaining: 0 },
      { batch: "BAT20221205", quantity: 1800, received: "2022-12-05", expiry: "2024-06-05", remaining: 0 },
    ],
    transactionHistory: [
      { date: "2024-04-15", type: "Dispensed", quantity: 30, reference: "PRE20240415001", patient: "John Doe" },
      { date: "2024-04-10", type: "Dispensed", quantity: 20, reference: "PRE20240410003", patient: "Jane Smith" },
      { date: "2024-04-05", type: "Dispensed", quantity: 15, reference: "PRE20240405002", patient: "Robert Johnson" },
      { date: "2024-04-01", type: "Stock Adjustment", quantity: -5, reference: "ADJ20240401", patient: "N/A" },
      { date: "2024-03-25", type: "Received", quantity: 500, reference: "PO20240325", patient: "N/A" },
    ],
    alternatives: [
      { name: "Augmentin 500mg", generic: "Amoxicillin/Clavulanate", stock: 850 },
      { name: "Azithromycin 250mg", generic: "Azithromycin", stock: 620 },
      { name: "Cefuroxime 500mg", generic: "Cefuroxime", stock: 480 },
    ],
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="icon" asChild>
            <Link href="/pharmacy/medicines">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{medicine.name}</h1>
          <Badge variant={medicine.status === "In Stock" ? "default" : medicine.status === "Low Stock" ? "outline" : "destructive"}>{medicine.status}</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button size="sm" asChild>
            <Link href={`/pharmacy/medicines/${id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Medicine Information</CardTitle>
            <CardDescription>Basic details about this medicine</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">ID</dt>
                <dd className="text-sm font-semibold">{medicine.id}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Generic Name</dt>
                <dd className="text-sm font-semibold">{medicine.generic}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Category</dt>
                <dd className="text-sm font-semibold">{medicine.category}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Type</dt>
                <dd className="text-sm font-semibold">{medicine.type}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Manufacturer</dt>
                <dd className="text-sm font-semibold">{medicine.manufacturer}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Current Stock</dt>
                <dd className="text-sm font-semibold">{medicine.stock} units</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Batch Number</dt>
                <dd className="text-sm font-semibold">{medicine.batchNumber}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Expiry Date</dt>
                <dd className="text-sm font-semibold">{medicine.expiryDate}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Purchase Price</dt>
                <dd className="text-sm font-semibold">${medicine.purchasePrice.toFixed(2)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Selling Price</dt>
                <dd className="text-sm font-semibold">${medicine.sellingPrice.toFixed(2)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Storage Location</dt>
                <dd className="text-sm font-semibold">{medicine.location}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Clinical Information</CardTitle>
            <CardDescription>Medical details and usage information</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Description</h3>
              <p className="text-sm">{medicine.description}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Dosage</h3>
              <p className="text-sm">{medicine.dosage}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Side Effects</h3>
              <p className="text-sm">{medicine.sideEffects}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Contraindications</h3>
              <p className="text-sm">{medicine.contraindications}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Storage Instructions</h3>
              <p className="text-sm">{medicine.storage}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transactions" className="w-full">
        <TabsList>
          <TabsTrigger value="transactions">Transaction History</TabsTrigger>
          <TabsTrigger value="batches">Batch History</TabsTrigger>
          <TabsTrigger value="alternatives">Alternatives</TabsTrigger>
        </TabsList>
        <TabsContent value="transactions" className="border rounded-md mt-6 p-4">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
            <h3 className="text-lg font-semibold">Recent Transactions</h3>
            <Button variant="outline" size="sm">
              <Calendar className="mr-2 h-4 w-4" />
              Filter by Date
            </Button>
          </div>
          <Table className="whitespace-nowrap">
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Patient/Supplier</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="whitespace-nowrap">
              {medicine.transactionHistory.map((transaction, index) => (
                <TableRow key={index}>
                  <TableCell>{transaction.date}</TableCell>
                  <TableCell>
                    <Badge variant={transaction.type === "Received" ? "default" : transaction.type === "Dispensed" ? "secondary" : "outline"}>{transaction.type}</Badge>
                  </TableCell>
                  <TableCell className={transaction.type === "Dispensed" || (transaction.type === "Stock Adjustment" && transaction.quantity < 0) ? "text-red-500" : "text-green-500"}>
                    {transaction.type === "Dispensed" || (transaction.type === "Stock Adjustment" && transaction.quantity < 0) ? transaction.quantity : `+${transaction.quantity}`}
                  </TableCell>
                  <TableCell>{transaction.reference}</TableCell>
                  <TableCell>{transaction.patient}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
        <TabsContent value="batches" className="border rounded-md mt-6 p-4">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
            <h3 className="text-lg font-semibold">Batch History</h3>
            <Button variant="outline" size="sm">
              <Package className="mr-2 h-4 w-4" />
              Add Batch
            </Button>
          </div>
          <Table className="whitespace-nowrap">
            <TableHeader>
              <TableRow>
                <TableHead>Batch Number</TableHead>
                <TableHead>Quantity Received</TableHead>
                <TableHead>Date Received</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Remaining</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="whitespace-nowrap">
              {medicine.batchHistory.map((batch, index) => (
                <TableRow key={index}>
                  <TableCell>{batch.batch}</TableCell>
                  <TableCell>{batch.quantity}</TableCell>
                  <TableCell>{batch.received}</TableCell>
                  <TableCell>{batch.expiry}</TableCell>
                  <TableCell>{batch.remaining}</TableCell>
                  <TableCell>
                    <Badge variant={batch.remaining > 0 ? "default" : "secondary"}>{batch.remaining > 0 ? "Active" : "Depleted"}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
        <TabsContent value="alternatives" className="border rounded-md mt-6 p-4">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
            <h3 className="text-lg font-semibold">Alternative Medicines</h3>
            <Button variant="outline" size="sm">
              <PillIcon className="mr-2 h-4 w-4" />
              Add Alternative
            </Button>
          </div>
          <Table className="whitespace-nowrap">
            <TableHeader>
              <TableRow>
                <TableHead>Medicine Name</TableHead>
                <TableHead>Generic Name</TableHead>
                <TableHead>Current Stock</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="whitespace-nowrap">
              {medicine.alternatives.map((alt, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{alt.name}</TableCell>
                  <TableCell>{alt.generic}</TableCell>
                  <TableCell>{alt.stock} units</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </div>
  );
}
