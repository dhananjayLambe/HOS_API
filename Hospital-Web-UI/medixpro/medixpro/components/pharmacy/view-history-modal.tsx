"use client"

import { useState } from "react"
import { Calendar, Download, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface ViewHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  medicine: {
    id: string
    name: string
  }
}

export function ViewHistoryModal({ isOpen, onClose, medicine }: ViewHistoryModalProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("all")

  // Sample transaction history data
  const transactionHistory = [
    {
      id: "TRX001",
      date: "2024-04-15",
      type: "Dispensed",
      quantity: -30,
      reference: "PRE20240415001",
      user: "Dr. Sarah Johnson",
      notes: "Prescribed to patient #PAT-1234",
    },
    {
      id: "TRX002",
      date: "2024-04-10",
      type: "Dispensed",
      quantity: -20,
      reference: "PRE20240410003",
      user: "Dr. Michael Chen",
      notes: "Prescribed to patient #PAT-5678",
    },
    {
      id: "TRX003",
      date: "2024-04-05",
      type: "Dispensed",
      quantity: -15,
      reference: "PRE20240405002",
      user: "Dr. Robert Williams",
      notes: "Prescribed to patient #PAT-9012",
    },
    {
      id: "TRX004",
      date: "2024-04-01",
      type: "Stock Adjustment",
      quantity: -5,
      reference: "ADJ20240401",
      user: "Jane Smith",
      notes: "Damaged inventory",
    },
    {
      id: "TRX005",
      date: "2024-03-25",
      type: "Received",
      quantity: 500,
      reference: "PO20240325",
      user: "John Doe",
      notes: "Received from supplier ABC Pharma",
    },
    {
      id: "TRX006",
      date: "2024-03-10",
      type: "Received",
      quantity: 250,
      reference: "PO20240310",
      user: "John Doe",
      notes: "Received from supplier XYZ Medical",
    },
    {
      id: "TRX007",
      date: "2024-03-05",
      type: "Stock Adjustment",
      quantity: -10,
      reference: "ADJ20240305",
      user: "Jane Smith",
      notes: "Expired inventory",
    },
    {
      id: "TRX008",
      date: "2024-02-28",
      type: "Dispensed",
      quantity: -25,
      reference: "PRE20240228005",
      user: "Dr. Sarah Johnson",
      notes: "Prescribed to patient #PAT-3456",
    },
  ]

  // Filter transactions based on search term and filter type
  const filteredTransactions = transactionHistory.filter((transaction) => {
    const matchesSearch =
      transaction.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.notes.toLowerCase().includes(searchTerm.toLowerCase())

    if (filterType === "all") return matchesSearch
    return matchesSearch && transaction.type.toLowerCase() === filterType.toLowerCase()
  })

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Transaction History: {medicine.name}</DialogTitle>
          <DialogDescription>View all stock movements and transactions for this medicine</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by reference, user or notes..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="dispensed">Dispensed</SelectItem>
                <SelectItem value="stock adjustment">Stock Adjustment</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" className="w-full sm:w-auto">
              <Calendar className="mr-2 h-4 w-4" />
              Date Range
            </Button>

            <Button variant="outline" className="w-full sm:w-auto">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>

          <div className="rounded-md border">
            <Table className="whitespace-nowrap">
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="whitespace-nowrap">
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{transaction.date}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            transaction.type === "Received"
                              ? "default"
                              : transaction.type === "Dispensed"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {transaction.type}
                        </Badge>
                      </TableCell>
                      <TableCell className={transaction.quantity < 0 ? "text-red-500" : "text-green-500"}>
                        {transaction.quantity > 0 ? `+${transaction.quantity}` : transaction.quantity}
                      </TableCell>
                      <TableCell>{transaction.reference}</TableCell>
                      <TableCell>{transaction.user}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={transaction.notes}>
                        {transaction.notes}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No transactions found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
