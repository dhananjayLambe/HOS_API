"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"

export function Pagination({ currentPage, totalPages, onPageChange }: { currentPage: number, totalPages: number, onPageChange: (page: number) => void }) {
  const handleFirstPage = () => {
    onPageChange(1)
  }

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1)
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1)
    }
  }

  const handleLastPage = () => {
    onPageChange(totalPages)
  }

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pageNumbers = []
    const maxPagesToShow = 5

    if (totalPages <= maxPagesToShow) {
      // If total pages is less than max pages to show, display all pages
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i)
      }
    } else {
      // Always include first page, last page, current page, and pages around current page
      const leftSiblingIndex = Math.max(currentPage - 1, 1)
      const rightSiblingIndex = Math.min(currentPage + 1, totalPages)

      // Show dots only if there's more than 1 page between the sibling and the boundary
      const showLeftDots = leftSiblingIndex > 2
      const showRightDots = rightSiblingIndex < totalPages - 1

      if (!showLeftDots && showRightDots) {
        // Show more pages at the beginning
        for (let i = 1; i <= 3; i++) {
          pageNumbers.push(i)
        }
        pageNumbers.push("...")
        pageNumbers.push(totalPages)
      } else if (showLeftDots && !showRightDots) {
        // Show more pages at the end
        pageNumbers.push(1)
        pageNumbers.push("...")
        for (let i = totalPages - 2; i <= totalPages; i++) {
          pageNumbers.push(i)
        }
      } else if (showLeftDots && showRightDots) {
        // Show dots on both sides
        pageNumbers.push(1)
        pageNumbers.push("...")
        pageNumbers.push(currentPage - 1)
        pageNumbers.push(currentPage)
        pageNumbers.push(currentPage + 1)
        pageNumbers.push("...")
        pageNumbers.push(totalPages)
      } else {
        // Show all pages
        for (let i = 1; i <= totalPages; i++) {
          pageNumbers.push(i)
        }
      }
    }

    return pageNumbers
  }

  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between flex-wrap gap-4 px-2 py-4">
      <div className="text-sm text-muted-foreground">
        Showing page {currentPage} of {totalPages}
      </div>
      <div className="flex items-center flex-wrap gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={handleFirstPage}
          disabled={currentPage === 1}
          aria-label="First page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handlePreviousPage}
          disabled={currentPage === 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {getPageNumbers().map((page, index) =>
          page === "..." ? (
            <span key={`ellipsis-${index}`} className="px-2">
              ...
            </span>
          ) : (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "outline"}
              size="icon"
              onClick={() => onPageChange(Number(page))}
              aria-label={`Page ${page}`}
              aria-current={currentPage === page ? "page" : undefined}
            >
              {page}
            </Button>
          ),
        )}

        <Button
          variant="outline"
          size="icon"
          onClick={handleNextPage}
          disabled={currentPage === totalPages}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleLastPage}
          disabled={currentPage === totalPages}
          aria-label="Last page"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
