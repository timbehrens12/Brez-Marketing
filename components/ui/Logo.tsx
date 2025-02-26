import { UserButton } from "@clerk/nextjs"

export function Logo() {
  return (
    <div className="flex items-center justify-between px-4 py-4 border-b border-[#222222]">
      <img 
        src="/bm-logo.png" 
        alt="BM Logo" 
        className="h-8 w-auto"
      />
      <UserButton 
        appearance={{
          elements: {
            userButtonBox: "hover:bg-[#2A2A2A] rounded-full",
            userButtonTrigger: "rounded-full",
            userButtonPopup: "bg-[#1A1A1A] border border-[#333333]",
            userPreviewMainIdentifier: "text-white",
            userPreviewSecondaryIdentifier: "text-gray-400"
          }
        }}
      />
    </div>
  )
} 