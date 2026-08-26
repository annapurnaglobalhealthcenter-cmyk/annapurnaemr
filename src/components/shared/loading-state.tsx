import { Loader2 } from "lucide-react"

interface LoadingStateProps {
  message?: string
  fullPage?: boolean
}

export function LoadingState({ message = "Loading...", fullPage = false }: LoadingStateProps) {
  const containerClasses = fullPage 
    ? "fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm"
    : "flex flex-col items-center justify-center p-8 min-h-[200px]"

  return (
    <div className={containerClasses}>
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
      <p className="text-sm font-medium text-gray-500">{message}</p>
    </div>
  )
}
