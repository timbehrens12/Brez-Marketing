"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { 
  Send, 
  Loader2, 
  Copy, 
  Check,
  Clock
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface SelfServiceConnectButtonProps {
  brandId: string
  brandName: string
  platformType: 'shopify' | 'meta'
  disabled?: boolean
  className?: string
}

export function SelfServiceConnectButton({ 
  brandId, 
  brandName,
  platformType, 
  disabled = false,
  className 
}: SelfServiceConnectButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [inviteUrl, setInviteUrl] = useState("")

  const [copied, setCopied] = useState(false)

  const platformDisplayName = platformType === 'shopify' ? 'Shopify' : 'Meta Ads'

  const handleGenerateInvitation = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch('/api/platform-connection-invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brandId,
          platformType,
          expiresInDays: 7
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate invitation')
      }

      setInviteUrl(data.inviteUrl)
      
      if (data.isExisting) {
        toast.success('Existing invitation found', {
          description: 'An active invitation already exists for this platform.'
        })
      } else {
        toast.success('Invitation created', {
          description: `Self-service ${platformDisplayName} connection invitation generated successfully.`
        })
      }
    } catch (error) {
      console.error('Error generating invitation:', error)
      toast.error('Failed to generate invitation', {
        description: error instanceof Error ? error.message : 'Please try again.'
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      toast.success('Link copied', {
        description: 'Invitation link copied to clipboard.'
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error('Failed to copy link')
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setInviteUrl("")
    setCopied(false)
  }

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={disabled ? "cursor-not-allowed" : ""}>
              <Button 
                variant="outline" 
                size="sm"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  if (!disabled) {
                    setIsOpen(true);
                    handleGenerateInvitation();
                  }
                }}
                disabled={disabled}
                className={cn(
                  "text-black text-xs py-1 px-2 rounded-md shadow-lg",
                  disabled 
                    ? "bg-gray-500 opacity-50 pointer-events-none"
                    : "bg-gradient-to-r from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 hover:shadow-xl",
                  className
                )}
              >
                <Send className="w-3 h-3 mr-1" />
                Copy Link
              </Button>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="text-sm">
              Generate a secure link for the brand owner to connect their own {platformDisplayName} account 
              without sharing login credentials with you.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md bg-[#1a1a1a] border-[#333] text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Send className="w-5 h-5 text-gray-400" />
              {platformDisplayName} Connection Link
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Copy the secure link below and send it to {brandName} owner to connect their {platformDisplayName} account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!inviteUrl ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                <span className="text-gray-400">Generating secure link...</span>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-green-500/20 rounded-full mb-3">
                      <Check className="w-6 h-6 text-green-400" />
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">Link Generated!</h3>
                    <p className="text-gray-400 text-sm">
                      Copy the link below and send it to the brand owner
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={inviteUrl}
                        readOnly
                        className="flex-1 bg-[#333] border-[#555] text-white text-sm"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyUrl}
                        className="px-3 bg-[#333] border-[#555] text-white hover:bg-[#444]"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Link expires in 7 days for security
                    </p>
                  </div>

                  <div className="bg-[#0f3f0f] p-3 rounded-lg border border-green-500/20">
                    <div className="text-xs text-green-400">
                      <p className="font-medium">What happens next:</p>
                      <ul className="mt-1 space-y-1 text-green-300">
                        <li>• Brand owner clicks the link</li>
                        <li>• They sign in with their {platformDisplayName} credentials</li>
                        <li>• Platform automatically connects to your dashboard</li>
                        <li>• You'll see the connection status update</li>
                      </ul>
                    </div>
                  </div>

                  <Button 
                    onClick={handleClose}
                    variant="outline"
                    className="w-full bg-[#333] border-[#555] text-white hover:bg-[#444]"
                  >
                    Done
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
} 