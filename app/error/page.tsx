import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function ErrorPage({
  searchParams,
}: {
  searchParams?: { message?: string }
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <CardTitle>Authentication Error</CardTitle>
          </div>
          <CardDescription>There was an error during the authentication process</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{searchParams?.message || "An unknown error occurred"}</p>
          <div className="flex justify-end gap-4">
            <Button variant="outline" asChild>
              <Link href="/">Return Home</Link>
            </Button>
            <Button asChild>
              <Link href="/install">Try Again</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

