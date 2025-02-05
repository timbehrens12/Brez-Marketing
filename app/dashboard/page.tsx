import { redirect } from "next/navigation"

// This is the default dashboard page that redirects to home
export default function DashboardPage() {
  redirect("/")
}

