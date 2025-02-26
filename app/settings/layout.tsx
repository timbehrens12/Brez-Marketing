export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      <div className="w-64 flex-shrink-0">
        {/* Sidebar space */}
      </div>
      <div className="flex-1 p-8">
        {children}
      </div>
    </div>
  )
} 