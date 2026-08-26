import { EmptyState } from "@/components/shared/empty-state"
import { ShieldAlert } from "lucide-react"

export default function UnauthorizedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[600px]">
      <EmptyState 
        icon={ShieldAlert}
        title="Access Denied"
        description="You do not have the required permissions to view this page or perform this action. Please contact your Hospital Administrator if you believe this is a mistake."
      />
    </div>
  )
}
