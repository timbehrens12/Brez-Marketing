"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { toast } from "react-hot-toast"
import { Paintbrush, Monitor, Moon, Sun } from "lucide-react"

type ThemeOption = "dark" | "light" | "system"
type AccentColorOption = "blue" | "purple" | "green" | "orange" | "default"

export function AppearanceSettings() {
  const [theme, setTheme] = useState<ThemeOption>("dark")
  const [accentColor, setAccentColor] = useState<AccentColorOption>("blue")
  const [isLoading, setIsLoading] = useState(false)
  
  const handleSaveAppearance = async () => {
    setIsLoading(true)
    try {
      // Here you would typically save these settings to localStorage or database
      // For now we'll just simulate a successful save
      localStorage.setItem("theme", theme)
      localStorage.setItem("accentColor", accentColor)
      
      setTimeout(() => {
        toast.success("Appearance settings saved")
        setIsLoading(false)
      }, 500)
    } catch (error) {
      console.error("Error saving appearance settings:", error)
      toast.error("Failed to save appearance settings")
      setIsLoading(false)
    }
  }
  
  return (
    <Card className="bg-[#1A1A1A] border-[#2A2A2A]">
      <CardHeader>
        <CardTitle className="text-lg font-medium text-white flex items-center">
          <Paintbrush className="h-4 w-4 mr-2" />
          Appearance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Theme selector */}
        <div className="space-y-3">
          <h3 className="text-md font-medium text-white">Theme</h3>
          <RadioGroup 
            value={theme} 
            onValueChange={(value) => setTheme(value as ThemeOption)}
            className="grid grid-cols-3 gap-2"
          >
            <div>
              <RadioGroupItem 
                value="light" 
                id="theme-light" 
                className="peer sr-only" 
              />
              <Label
                htmlFor="theme-light"
                className="flex flex-col items-center justify-between rounded-md border-2 border-[#333] bg-[#222] p-4 hover:bg-[#2a2a2a] hover:border-[#444] cursor-pointer peer-data-[state=checked]:border-blue-600"
              >
                <Sun className="h-5 w-5 mb-3 text-gray-300" />
                <span className="text-sm font-medium text-gray-300">Light</span>
              </Label>
            </div>
            
            <div>
              <RadioGroupItem 
                value="dark" 
                id="theme-dark" 
                className="peer sr-only" 
                defaultChecked 
              />
              <Label
                htmlFor="theme-dark"
                className="flex flex-col items-center justify-between rounded-md border-2 border-[#333] bg-[#222] p-4 hover:bg-[#2a2a2a] hover:border-[#444] cursor-pointer peer-data-[state=checked]:border-blue-600"
              >
                <Moon className="h-5 w-5 mb-3 text-gray-300" />
                <span className="text-sm font-medium text-gray-300">Dark</span>
              </Label>
            </div>
            
            <div>
              <RadioGroupItem 
                value="system" 
                id="theme-system" 
                className="peer sr-only" 
              />
              <Label
                htmlFor="theme-system"
                className="flex flex-col items-center justify-between rounded-md border-2 border-[#333] bg-[#222] p-4 hover:bg-[#2a2a2a] hover:border-[#444] cursor-pointer peer-data-[state=checked]:border-blue-600"
              >
                <Monitor className="h-5 w-5 mb-3 text-gray-300" />
                <span className="text-sm font-medium text-gray-300">System</span>
              </Label>
            </div>
          </RadioGroup>
        </div>
        
        {/* Accent color selector */}
        <div className="space-y-3">
          <h3 className="text-md font-medium text-white">Accent Color</h3>
          <RadioGroup 
            value={accentColor} 
            onValueChange={(value) => setAccentColor(value as AccentColorOption)}
            className="grid grid-cols-5 gap-2"
          >
            <div>
              <RadioGroupItem 
                value="default" 
                id="color-default" 
                className="peer sr-only" 
              />
              <Label
                htmlFor="color-default"
                className="flex flex-col items-center justify-between rounded-md border-2 border-[#333] bg-[#222] p-4 hover:bg-[#2a2a2a] hover:border-[#444] cursor-pointer peer-data-[state=checked]:border-white"
              >
                <div className="h-5 w-5 rounded-full bg-gray-500" />
              </Label>
            </div>
            
            <div>
              <RadioGroupItem 
                value="blue" 
                id="color-blue" 
                className="peer sr-only" 
                defaultChecked 
              />
              <Label
                htmlFor="color-blue"
                className="flex flex-col items-center justify-between rounded-md border-2 border-[#333] bg-[#222] p-4 hover:bg-[#2a2a2a] hover:border-[#444] cursor-pointer peer-data-[state=checked]:border-blue-600"
              >
                <div className="h-5 w-5 rounded-full bg-blue-600" />
              </Label>
            </div>
            
            <div>
              <RadioGroupItem 
                value="purple" 
                id="color-purple" 
                className="peer sr-only" 
              />
              <Label
                htmlFor="color-purple"
                className="flex flex-col items-center justify-between rounded-md border-2 border-[#333] bg-[#222] p-4 hover:bg-[#2a2a2a] hover:border-[#444] cursor-pointer peer-data-[state=checked]:border-purple-600"
              >
                <div className="h-5 w-5 rounded-full bg-purple-600" />
              </Label>
            </div>
            
            <div>
              <RadioGroupItem 
                value="green" 
                id="color-green" 
                className="peer sr-only" 
              />
              <Label
                htmlFor="color-green"
                className="flex flex-col items-center justify-between rounded-md border-2 border-[#333] bg-[#222] p-4 hover:bg-[#2a2a2a] hover:border-[#444] cursor-pointer peer-data-[state=checked]:border-green-600"
              >
                <div className="h-5 w-5 rounded-full bg-green-600" />
              </Label>
            </div>
            
            <div>
              <RadioGroupItem 
                value="orange" 
                id="color-orange" 
                className="peer sr-only" 
              />
              <Label
                htmlFor="color-orange"
                className="flex flex-col items-center justify-between rounded-md border-2 border-[#333] bg-[#222] p-4 hover:bg-[#2a2a2a] hover:border-[#444] cursor-pointer peer-data-[state=checked]:border-orange-600"
              >
                <div className="h-5 w-5 rounded-full bg-orange-600" />
              </Label>
            </div>
          </RadioGroup>
        </div>
        
        <Button 
          className="w-full bg-blue-600 hover:bg-blue-700 mt-4"
          onClick={handleSaveAppearance}
          disabled={isLoading}
        >
          {isLoading ? "Saving..." : "Save Appearance Settings"}
        </Button>
      </CardContent>
    </Card>
  )
} 