"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EmailPaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function EmailPagination({ currentPage, totalPages, onPageChange }: EmailPaginationProps) {
  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1)
    }
  }

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1)
    }
  }

  return (
    <div className="flex items-center justify-between">
      <div className="text-sm text-muted-foreground">
        Page {currentPage} of {totalPages || 1}
      </div>
      <div className="flex items-center space-x-2">
        <Button variant="outline" size="icon" onClick={handlePrevious} disabled={currentPage <= 1}>
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Previous page</span>
        </Button>
        <Button variant="outline" size="icon" onClick={handleNext} disabled={currentPage >= totalPages}>
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">Next page</span>
        </Button>
      </div>
    </div>
  )
}
