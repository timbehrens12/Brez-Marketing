import { Button } from "@/components/ui/button"

interface PlatformCardProps {
  name: string
  icon: string
  isConnected: boolean
  onConnect: () => void
  onManage?: () => void
  onDisconnect?: () => void
}

export function PlatformCard({ 
  name, 
  icon, 
  isConnected, 
  onConnect, 
  onManage, 
  onDisconnect 
}: PlatformCardProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-[#222222] rounded-lg">
      <div className="flex items-center gap-3">
        <img src={icon} alt={name} className="w-8 h-8" />
        <span>{name}</span>
      </div>
      {isConnected ? (
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="bg-transparent"
            onClick={onManage}
          >
            Manage
          </Button>
          <Button 
            variant="outline" 
            className="bg-transparent text-red-500"
            onClick={onDisconnect}
          >
            Disconnect
          </Button>
        </div>
      ) : (
        <Button 
          className="bg-blue-600 hover:bg-blue-700"
          onClick={onConnect}
        >
          Connect
        </Button>
      )}
    </div>
  )
} 