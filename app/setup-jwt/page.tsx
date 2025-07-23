'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/contexts/AuthContext"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"

export default function SetupJwtPage() {
  const { jwtTemplateError, isSupabaseAuthenticated } = useAuth()
  const router = useRouter()
  const [supabaseJwtSecret, setSupabaseJwtSecret] = useState("")
  
  // If there's no JWT error, redirect to dashboard
  useEffect(() => {
    if (!jwtTemplateError && isSupabaseAuthenticated) {
      router.push('/dashboard')
    }
  }, [jwtTemplateError, isSupabaseAuthenticated, router])
  
  // Function to copy text to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        alert('Copied to clipboard!')
      })
      .catch(err => {
        console.error('Failed to copy: ', err)
      })
  }
  
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl bg-[#1A1A1A] border-[#333] text-white">
        <CardHeader>
          <CardTitle className="text-2xl">Setup JWT Template for Supabase</CardTitle>
          <CardDescription className="text-gray-400">
            Follow these steps to connect Clerk authentication with your Supabase database
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="step1" className="w-full">
            <TabsList className="grid grid-cols-3 mb-6">
              <TabsTrigger value="step1">Step 1: Get JWT Secret</TabsTrigger>
              <TabsTrigger value="step2">Step 2: Create Template</TabsTrigger>
              <TabsTrigger value="step3">Step 3: Verify</TabsTrigger>
            </TabsList>
            
            <TabsContent value="step1" className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Get your Supabase JWT Secret Key</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-300">
                  <li>Log in to your <a href="https://app.supabase.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Supabase Dashboard</a></li>
                  <li>Select your project</li>
                  <li>In the sidebar, navigate to <strong>Project Settings &gt; API</strong></li>
                  <li>Under the <strong>JWT Settings</strong> section, find the <strong>JWT Secret</strong> field</li>
                  <li>Copy the JWT Secret value</li>
                  <li>Paste it below for the next step</li>
                </ol>
                
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-2">Your Supabase JWT Secret</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={supabaseJwtSecret}
                      onChange={(e) => setSupabaseJwtSecret(e.target.value)}
                      placeholder="Paste your JWT Secret here"
                      className="flex-1 px-3 py-2 bg-[#333] border border-[#444] rounded-md text-white"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">This is only stored locally in your browser for convenience</p>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="step2" className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Create a Supabase JWT Template in Clerk</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-300">
                  <li>Go to your <a href="https://dashboard.clerk.dev" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Clerk Dashboard</a></li>
                  <li>Navigate to <strong>JWT Templates</strong> in the sidebar</li>
                  <li>Click <strong>New template</strong></li>
                  <li>Select <strong>Supabase</strong> from the list of options</li>
                  <li>Configure your template:
                    <ul className="list-disc list-inside ml-6 mt-2">
                      <li>Name: <strong>supabase</strong> (this exact name is required)</li>
                      <li>Signing algorithm: <strong>HS256</strong> (default)</li>
                      <li>Signing key: Paste your Supabase JWT Secret from Step 1</li>
                    </ul>
                  </li>
                  <li>Click <strong>Save</strong></li>
                </ol>
                
                {supabaseJwtSecret && (
                  <div className="mt-4 p-3 bg-[#222] border border-[#333] rounded-md">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium">Your JWT Secret</h4>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="h-8 border-[#444] text-blue-400 hover:text-blue-300"
                        onClick={() => copyToClipboard(supabaseJwtSecret)}
                      >
                        Copy
                      </Button>
                    </div>
                    <p className="text-sm font-mono break-all text-gray-300">{supabaseJwtSecret}</p>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="step3" className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Verify Your Setup</h3>
                <p className="text-gray-300">After creating the JWT template, you need to verify that it's working correctly:</p>
                
                <ol className="list-decimal list-inside space-y-2 text-gray-300">
                  <li>Return to your application</li>
                  <li>Refresh the page</li>
                  <li>If everything is set up correctly, you should be redirected to the dashboard</li>
                  <li>If you still see errors, double-check that:
                    <ul className="list-disc list-inside ml-6 mt-2">
                      <li>The template is named exactly <strong>supabase</strong></li>
                      <li>The signing algorithm is <strong>HS256</strong></li>
                      <li>The signing key matches your Supabase JWT Secret</li>
                    </ul>
                  </li>
                </ol>
                
                <div className="mt-6 flex justify-center">
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => window.location.reload()}
                  >
                    Refresh Page to Verify
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        
        <CardFooter className="border-t border-[#333] pt-4 flex justify-between">
          <p className="text-sm text-gray-400">
            Having trouble? Check the <a href="https://clerk.com/docs/integrations/databases/supabase" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Clerk + Supabase documentation</a>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
} 