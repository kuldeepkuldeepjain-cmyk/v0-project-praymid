import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AlertCircle, ArrowLeft } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Not Found</h1>
            <p className="text-slate-600 text-sm">
              The matched contribution details you're looking for could not be found. This might happen if the contribution ID is invalid or the match has expired.
            </p>
          </div>
          <div className="space-y-2">
            <Link href="/participant/dashboard/contribute" className="block">
              <Button className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Contributions
              </Button>
            </Link>
            <Link href="/participant/dashboard" className="block">
              <Button variant="outline" className="w-full">
                Go to Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
