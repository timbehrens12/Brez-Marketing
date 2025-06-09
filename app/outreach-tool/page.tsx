"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Send, Users, Mail, Calendar, BarChart3 } from "lucide-react"

export default function OutreachToolPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Outreach Manager</h1>
          <p className="text-gray-400">Manage and track your lead outreach campaigns</p>
        </div>

        {/* Coming Soon Section */}
        <div className="text-center py-20">
          <div className="max-w-2xl mx-auto">
            <div className="mb-8">
              <Send className="w-24 h-24 text-blue-500 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-white mb-4">Outreach Manager Coming Soon</h2>
              <p className="text-gray-400 text-lg mb-8">
                This powerful outreach tool will help you manage your lead campaigns, track engagement, 
                and convert prospects into clients. Perfect for marketing agencies looking to scale their 
                client acquisition process.
              </p>
            </div>

            {/* Feature Preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              <Card className="bg-[#111] border-[#333]">
                <CardContent className="p-6 text-center">
                  <Mail className="w-8 h-8 text-blue-500 mx-auto mb-3" />
                  <h3 className="font-semibold text-white mb-2">Email Campaigns</h3>
                  <p className="text-sm text-gray-400">Automated email sequences and templates</p>
                </CardContent>
              </Card>

              <Card className="bg-[#111] border-[#333]">
                <CardContent className="p-6 text-center">
                  <Users className="w-8 h-8 text-green-500 mx-auto mb-3" />
                  <h3 className="font-semibold text-white mb-2">Lead Management</h3>
                  <p className="text-sm text-gray-400">Organize and track your prospects</p>
                </CardContent>
              </Card>

              <Card className="bg-[#111] border-[#333]">
                <CardContent className="p-6 text-center">
                  <Calendar className="w-8 h-8 text-purple-500 mx-auto mb-3" />
                  <h3 className="font-semibold text-white mb-2">Follow-up Scheduling</h3>
                  <p className="text-sm text-gray-400">Never miss a follow-up opportunity</p>
                </CardContent>
              </Card>

              <Card className="bg-[#111] border-[#333]">
                <CardContent className="p-6 text-center">
                  <BarChart3 className="w-8 h-8 text-orange-500 mx-auto mb-3" />
                  <h3 className="font-semibold text-white mb-2">Performance Analytics</h3>
                  <p className="text-sm text-gray-400">Track open rates, responses, and conversions</p>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <p className="text-gray-500">
                For now, leads sent from the Lead Generator will be queued for when this feature launches.
              </p>
              <Button variant="outline" className="bg-[#1A1A1A] border-[#333] text-gray-400 hover:bg-[#222]">
                <Send className="w-4 h-4 mr-2" />
                Notify Me When Available
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 