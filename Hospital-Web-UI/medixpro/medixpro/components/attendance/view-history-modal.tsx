"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, FileText, AlertTriangle, CheckCircle2, CircleXIcon as XCircle2, Clock3 } from "lucide-react"

interface ViewHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  staffMember: {
    id: number
    name: string
    role: string
    department: string
  }
}

export function ViewHistoryModal({ isOpen, onClose, staffMember }: ViewHistoryModalProps) {
  // Mock data for attendance history
  const attendanceHistory = [
    {
      date: "2023-05-15",
      checkIn: "08:45 AM",
      checkOut: "05:30 PM",
      status: "Present",
      hours: "8.75",
      notes: null,
    },
    {
      date: "2023-05-14",
      checkIn: "08:50 AM",
      checkOut: "05:15 PM",
      status: "Present",
      hours: "8.42",
      notes: null,
    },
    {
      date: "2023-05-13",
      checkIn: null,
      checkOut: null,
      status: "Weekend",
      hours: "0",
      notes: null,
    },
    {
      date: "2023-05-12",
      checkIn: "09:20 AM",
      checkOut: "05:45 PM",
      status: "Late",
      hours: "8.42",
      notes: "Traffic delay reported",
    },
    {
      date: "2023-05-11",
      checkIn: "08:40 AM",
      checkOut: "05:10 PM",
      status: "Present",
      hours: "8.5",
      notes: null,
    },
    {
      date: "2023-05-10",
      checkIn: "08:30 AM",
      checkOut: "04:30 PM",
      status: "Present",
      hours: "8.0",
      notes: "Left early - approved",
    },
    {
      date: "2023-05-09",
      checkIn: null,
      checkOut: null,
      status: "Absent",
      hours: "0",
      notes: "Sick leave",
    },
  ]

  // Mock data for time edits
  const timeEdits = [
    {
      date: "2023-05-12",
      field: "Check In",
      oldValue: "09:30 AM",
      newValue: "09:20 AM",
      editedBy: "Lisa Thompson",
      editedOn: "2023-05-12 10:15 AM",
      reason: "Corrected time - system error",
    },
    {
      date: "2023-05-10",
      field: "Check Out",
      oldValue: "05:30 PM",
      newValue: "04:30 PM",
      editedBy: "Lisa Thompson",
      editedOn: "2023-05-10 05:45 PM",
      reason: "Approved early departure",
    },
  ]

  // Mock data for notes
  const notes = [
    {
      date: "2023-05-12",
      type: "General",
      note: "Traffic delay reported by employee",
      addedBy: "Lisa Thompson",
      addedOn: "2023-05-12 09:45 AM",
    },
    {
      date: "2023-05-10",
      type: "Approval",
      note: "Approved early departure for medical appointment",
      addedBy: "Dr. William Smith",
      addedOn: "2023-05-10 02:30 PM",
    },
    {
      date: "2023-05-09",
      type: "Exception",
      note: "Sick leave - doctor's note received",
      addedBy: "Lisa Thompson",
      addedOn: "2023-05-10 09:15 AM",
    },
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Attendance History</DialogTitle>
          <DialogDescription>
            Viewing attendance history for {staffMember.name} ({staffMember.role} - {staffMember.department})
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="attendance" className="w-full mt-4">
          <TabsList>
            <TabsTrigger value="attendance">
              <Calendar className="h-4 w-4 mr-2" />
              Attendance Log
            </TabsTrigger>
            <TabsTrigger value="edits">
              <Clock className="h-4 w-4 mr-2" />
              Time Edits
            </TabsTrigger>
            <TabsTrigger value="notes">
              <FileText className="h-4 w-4 mr-2" />
              Notes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="attendance" className="mt-4">
            <div className="rounded-md border">
              <Table className="whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="whitespace-nowrap">
                  {attendanceHistory.map((record, index) => (
                    <TableRow key={index}>
                      <TableCell>{record.date}</TableCell>
                      <TableCell>
                        {record.checkIn ? (
                          <div className="flex items-center">
                            <Clock3 className="h-3 w-3 mr-1 text-muted-foreground" />
                            {record.checkIn}
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {record.checkOut ? (
                          <div className="flex items-center">
                            <Clock3 className="h-3 w-3 mr-1 text-muted-foreground" />
                            {record.checkOut}
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={record.status} />
                      </TableCell>
                      <TableCell>{record.hours}</TableCell>
                      <TableCell>
                        {record.notes ? (
                          <div className="flex items-center">
                            <FileText className="h-3 w-3 mr-1 text-muted-foreground" />
                            {record.notes}
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="edits" className="mt-4">
            {timeEdits.length > 0 ? (
              <div className="rounded-md border">
                <Table className="whitespace-nowrap">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Field</TableHead>
                      <TableHead>Old Value</TableHead>
                      <TableHead>New Value</TableHead>
                      <TableHead>Edited By</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="whitespace-nowrap">
                    {timeEdits.map((edit, index) => (
                      <TableRow key={index}>
                        <TableCell>{edit.date}</TableCell>
                        <TableCell>{edit.field}</TableCell>
                        <TableCell>{edit.oldValue}</TableCell>
                        <TableCell>{edit.newValue}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{edit.editedBy}</span>
                            <span className="text-xs text-muted-foreground">{edit.editedOn}</span>
                          </div>
                        </TableCell>
                        <TableCell>{edit.reason}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <p className="text-muted-foreground">No time edits found for this employee.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="notes" className="mt-4">
            {notes.length > 0 ? (
              <div className="rounded-md border">
                <Table className="whitespace-nowrap">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Note</TableHead>
                      <TableHead>Added By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="whitespace-nowrap">
                    {notes.map((note, index) => (
                      <TableRow key={index}>
                        <TableCell>{note.date}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{note.type}</Badge>
                        </TableCell>
                        <TableCell>{note.note}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{note.addedBy}</span>
                            <span className="text-xs text-muted-foreground">{note.addedOn}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <p className="text-muted-foreground">No notes found for this employee.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => window.print()}>Print History</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Helper component for status badges
function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "Present":
      return (
        <Badge variant="default" className="bg-emerald-600 text-white hover:bg-emerald-700">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Present
        </Badge>
      )
    case "Late":
      return (
        <Badge variant="warning" className="bg-amber-600 text-white hover:bg-amber-700">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Late
        </Badge>
      )
    case "Absent":
      return (
        <Badge variant="destructive">
          <XCircle2 className="h-3 w-3 mr-1" />
          Absent
        </Badge>
      )
    case "Weekend":
      return <Badge variant="outline">Weekend</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}
