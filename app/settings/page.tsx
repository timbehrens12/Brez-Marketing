"use client"

import { useUser } from "@clerk/nextjs"
import { supabase } from "@/utils/supabase"
import { useEffect, useState } from "react"

export default function SettingsPage() {
  const { user } = useUser()
  const [testMessage, setTestMessage] = useState("")

  useEffect(() => {
    if (user) {
      // Test database connection
      const testConnection = async () => {
        const { data, error } = await supabase
          .from('brands')
          .select('name')
          .limit(1)

        if (error) {
          setTestMessage("Database connection error: " + error.message)
        } else {
          setTestMessage("Database connected successfully!")
        }
      }

      testConnection()
    }
  }, [user])

  return (
    <div className="p-4">
      <h1>Settings</h1>
      <p>{testMessage}</p>
      {user && (
        <div>
          <p>Logged in as: {user.emailAddresses[0].emailAddress}</p>
        </div>
      )}
    </div>
  )
}