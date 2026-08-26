"use client" // Error components must be Client Components
 
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"
 
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])
 
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
      <div className="flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-red-100">
        <AlertCircle className="w-8 h-8 text-red-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong!</h2>
      <p className="text-gray-500 mb-6 max-w-md">
        An unexpected error occurred while loading this view. The technical details have been logged.
      </p>
      <Button onClick={() => reset()} variant="default">
        Try again
      </Button>
    </div>
  )
}
