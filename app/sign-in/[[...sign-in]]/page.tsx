import { SignIn } from "@clerk/nextjs"

export default function SignInPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0A0A0A]">
      <SignIn />
    </div>
  )
}