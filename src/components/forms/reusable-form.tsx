import { useForm, FieldValues, SubmitHandler, DefaultValues } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface ReusableFormProps<T extends FieldValues> {
  defaultValues: DefaultValues<T>
  onSubmit: SubmitHandler<T>
  children: React.ReactNode
  submitLabel?: string
  isSubmitting?: boolean
}

export function ReusableForm<T extends FieldValues>({
  defaultValues,
  onSubmit,
  children,
  submitLabel = "Save",
  isSubmitting = false
}: ReusableFormProps<T>) {
  
  const form = useForm<T>({
    defaultValues,
  })

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {children}
      <div className="flex justify-end pt-4 border-t">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
