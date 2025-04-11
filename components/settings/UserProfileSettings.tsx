"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { toast } from "react-hot-toast"
import { User } from "@clerk/nextjs/dist/types/server"
import { Bell, User as UserIcon, Mail, Shield } from "lucide-react"

interface UserProfileSettingsProps {
  user: User | null
}

export function UserProfileSettings({ user }: UserProfileSettingsProps) {
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [weeklyReports, setWeeklyReports] = useState(true)
  const [dataAlerts, setDataAlerts] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  
  const handleSavePreferences = async () => {
    setIsLoading(true)
    try {
      // Here you would typically save these preferences to your database
      // For now we'll just simulate a successful save
      setTimeout(() => {
        toast.success("Preferences saved successfully")
        setIsLoading(false)
      }, 500)
    } catch (error) {
      console.error("Error saving preferences:", error)
      toast.error("Failed to save preferences")
      setIsLoading(false)
    }
  }
  
  if (!user) {
    return (
      <Card className="bg-[#1A1A1A] border-[#2A2A2A]">
        <CardContent className="p-6">
          <div className="text-center text-gray-400">
            Please sign in to access your profile settings
          </div>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card className="bg-[#1A1A1A] border-[#2A2A2A]">
      <CardHeader>
        <CardTitle className="text-lg font-medium text-white">User Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* User profile info */}
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user.imageUrl} alt={user.username || user.firstName || "User"} />
            <AvatarFallback className="bg-[#333] text-white">
              {user.firstName?.[0] || user.username?.[0] || "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-xl font-medium text-white">
              {user.firstName && user.lastName 
                ? `${user.firstName} ${user.lastName}` 
                : user.username || user.emailAddresses[0]?.emailAddress}
            </h2>
            <p className="text-gray-400">{user.emailAddresses[0]?.emailAddress}</p>
          </div>
        </div>
        
        {/* Notification preferences */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-white flex items-center">
            <Bell className="h-4 w-4 mr-2" />
            Notification Preferences
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm text-white">Email Notifications</Label>
                <p className="text-xs text-gray-400">Receive important updates via email</p>
              </div>
              <Switch 
                checked={emailNotifications} 
                onCheckedChange={setEmailNotifications} 
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm text-white">Weekly Reports</Label>
                <p className="text-xs text-gray-400">Get a summary of your weekly performance</p>
              </div>
              <Switch 
                checked={weeklyReports} 
                onCheckedChange={setWeeklyReports} 
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm text-white">Data Anomaly Alerts</Label>
                <p className="text-xs text-gray-400">Get notified about unusual data patterns</p>
              </div>
              <Switch 
                checked={dataAlerts} 
                onCheckedChange={setDataAlerts} 
              />
            </div>
          </div>
        </div>
        
        {/* Security settings */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-white flex items-center">
            <Shield className="h-4 w-4 mr-2" />
            Security Settings
          </h3>
          
          <div className="space-y-3">
            <Button 
              variant="outline" 
              className="border-[#333] text-gray-300 hover:text-white w-full justify-start"
              onClick={() => window.open("https://accounts.clerk.dev/account/security", "_blank")}
            >
              <Shield className="h-4 w-4 mr-2" />
              Manage Account Security
            </Button>
            
            <Button 
              variant="outline" 
              className="border-[#333] text-gray-300 hover:text-white w-full justify-start"
              onClick={() => window.open("https://accounts.clerk.dev/account/details", "_blank")}
            >
              <UserIcon className="h-4 w-4 mr-2" />
              Edit Profile Details
            </Button>
            
            <Button 
              variant="outline" 
              className="border-[#333] text-gray-300 hover:text-white w-full justify-start"
              onClick={() => window.open("https://accounts.clerk.dev/account/communication", "_blank")}
            >
              <Mail className="h-4 w-4 mr-2" />
              Update Email Address
            </Button>
          </div>
        </div>
        
        <Button 
          className="w-full bg-blue-600 hover:bg-blue-700"
          onClick={handleSavePreferences}
          disabled={isLoading}
        >
          {isLoading ? "Saving..." : "Save Preferences"}
        </Button>
      </CardContent>
    </Card>
  )
} 