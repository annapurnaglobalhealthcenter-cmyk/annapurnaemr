"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EmptyState } from "./empty-state"
import { LoadingState } from "./loading-state"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

interface Column<T> {
  header: string
  accessorKey: keyof T | string
  cell?: (item: T) => React.ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  isLoading?: boolean
  searchPlaceholder?: string
  onSearch?: (term: string) => void
  emptyTitle?: string
  emptyDescription?: string
}

export function DataTable<T>({ 
  columns, 
  data, 
  isLoading,
  searchPlaceholder,
  onSearch,
  emptyTitle = "No data found",
  emptyDescription
}: DataTableProps<T>) {
  
  if (isLoading) {
    return <LoadingState />
  }

  return (
    <div className="space-y-4">
      {onSearch && (
        <div className="flex items-center space-x-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input 
              placeholder={searchPlaceholder || "Search..."} 
              className="pl-8 bg-white"
              onChange={(e) => onSearch(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="border rounded-md bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              {columns.map((col, i) => (
                <TableHead key={i} className="font-semibold">{col.header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-48">
                  <EmptyState title={emptyTitle} description={emptyDescription} />
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {columns.map((col, colIndex) => (
                    <TableCell key={colIndex}>
                      {col.cell 
                        ? col.cell(row) 
                        : (row as Record<string, unknown>)[col.accessorKey as string] as React.ReactNode}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Simple pagination placeholder */}
      {data.length > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-500 py-2 px-1">
          <div>Showing {data.length} results</div>
          <div className="flex space-x-2">
            <button className="px-3 py-1 border rounded hover:bg-gray-50" disabled>Previous</button>
            <button className="px-3 py-1 border rounded hover:bg-gray-50" disabled>Next</button>
          </div>
        </div>
      )}
    </div>
  )
}
