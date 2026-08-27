'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Dashboard Error:', error)
  }, [error])

  return (
    <div className="flex h-[80vh] w-full flex-col items-center justify-center space-y-6">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-red-600">
        <AlertTriangle className="h-10 w-10" />
      </div>
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          We encountered an issue
        </h1>
        <p className="text-gray-500 max-w-[500px]">
          {error.message || 'An unexpected error occurred while loading this view.'}
        </p>
      </div>
      <div className="flex space-x-4">
        <Button onClick={() => reset()} className="bg-gray-900">
          Try again
        </Button>
        <Button variant="outline" onClick={() => window.location.href = '/'}>
          Go to Dashboard
        </Button>
      </div>
    </div>
  )
}
