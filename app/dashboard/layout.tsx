export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      <div className="w-64 flex-shrink-0">
        {/* This div takes up space equal to sidebar width */}
      </div>
      <div className="flex-1 p-8">
        {children}
      </div>
    </div>
  )
} 