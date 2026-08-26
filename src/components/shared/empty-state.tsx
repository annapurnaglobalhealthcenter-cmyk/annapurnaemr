import { FileQuestion } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EmptyStateProps {
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  icon?: React.ElementType
}

export function EmptyState({ 
  title, 
  description, 
  actionLabel, 
  onAction,
  icon: Icon = FileQuestion
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-white border border-dashed rounded-lg min-h-[300px]">
      <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-gray-100">
        <Icon className="w-6 h-6 text-gray-500" />
      </div>
      <h3 className="mb-1 text-lg font-semibold text-gray-900">{title}</h3>
      {description && (
        <p className="mb-4 text-sm text-gray-500 max-w-sm">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="outline">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
