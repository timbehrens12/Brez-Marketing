import { redirect } from "next/navigation"

interface ShopDetails {
  name: string
  email: string
}

export default async function DashboardPage({
  params,
}: {
  params: { shop: string }
}) {
  if (!params.shop) {
    redirect("/")
  }

  // Decode the shop parameter since it might be URL-encoded
  const shop = decodeURIComponent(params.shop)

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/shopify/shop?shop=${shop}`, {
      cache: "no-store",
    })

    if (!response.ok) {
      throw new Error("Failed to fetch shop details")
    }

    const shopDetails: ShopDetails = await response.json()

    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Shop Details</h2>
          <div className="space-y-2">
            <p>Shop Name: {shopDetails.name}</p>
            <p>Email: {shopDetails.email}</p>
          </div>
        </div>
      </div>
    )
  } catch (error) {
    return (
      <div className="p-8">
        <div className="text-red-500">
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p>{error instanceof Error ? error.message : "Failed to load shop details"}</p>
          <p className="mt-2 text-sm">
            Debug info:
            <br />
            API URL: {process.env.NEXT_PUBLIC_API_URL}
            <br />
            Shop: {shop}
          </p>
        </div>
      </div>
    )
  }
}

