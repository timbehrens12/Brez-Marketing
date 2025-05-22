import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import { SettingsContent } from "@/components/settings/SettingsContent"

// Loading component for Suspense fallback
function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center p-4">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <SettingsContent />
    </Suspense>
  )
}