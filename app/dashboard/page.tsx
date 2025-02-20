"use client"

import { useUser } from "@clerk/nextjs"
import { SettingsContent } from "@/components/settings/SettingsContent"

export default function DashboardPage() {
  const { user } = useUser()

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-white mb-4">Dashboard</h1>
      <SettingsContent />
    </div>
  )
}
