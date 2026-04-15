"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, Loader2, CheckCircle2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function DeleteParticipantsPanel() {
  const { toast } = useToast()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [deleteResult, setDeleteResult] = useState<any>(null)

  const handleDeleteParticipants = async () => {
    if (!isConfirming) {
      setIsConfirming(true)
      return
    }

    setIsDeleting(true)
    setDeleteResult(null)

    try {
      console.log("[v0] Calling delete-all-participants API...")
      
      const response = await fetch("/api/admin/delete-all-participants-except", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete participants")
      }

      console.log("[v0] Deletion successful:", data)
      setDeleteResult(data)

      toast({
        title: "Success!",
        description: `Deleted ${data.deletedCount || 0} participants. Kept kuldeepkuldeepjain@gmail.com`,
      })
    } catch (error) {
      console.error("[v0] Delete error:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      
      setDeleteResult({ error: errorMessage })
    } finally {
      setIsDeleting(false)
      setIsConfirming(false)
    }
  }

  return (
    <Card className="border-red-700 bg-slate-900">
      <CardHeader className="border-b border-red-700 pb-4">
        <CardTitle className="text-red-400 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Delete All Participants (Except One)
        </CardTitle>
        <CardDescription className="text-slate-300">
          Permanently delete all participants except kuldeepkuldeepjain@gmail.com
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-6 space-y-4">
        <Alert className="border-red-700 bg-red-950/50">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-300">
            This action will permanently delete all participant records and their related data (payments, payouts, transactions, etc.). 
            This cannot be undone.
          </AlertDescription>
        </Alert>

        {deleteResult && !deleteResult.error && (
          <Alert className="border-green-700 bg-green-950/50">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            <AlertDescription className="text-green-300">
              <strong>Deletion Complete!</strong>
              <div className="mt-2 text-sm space-y-1">
                <p>• Participants deleted: {deleteResult.deletedCount || 0}</p>
                <p>• Protected email: {deleteResult.protectedEmail}</p>
                <p>• Total records processed: {deleteResult.totalRecordsDeleted || 0}</p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {deleteResult && deleteResult.error && (
          <Alert className="border-red-700 bg-red-950/50">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-300">
              <strong>Error:</strong> {deleteResult.error}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <Button
            onClick={handleDeleteParticipants}
            disabled={isDeleting}
            variant={isConfirming ? "destructive" : "outline"}
            className="w-full"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : isConfirming ? (
              "Click again to confirm deletion"
            ) : (
              "Delete All Participants"
            )}
          </Button>

          {isConfirming && (
            <Button
              onClick={() => setIsConfirming(false)}
              variant="outline"
              className="w-full"
            >
              Cancel
            </Button>
          )}
        </div>

        <p className="text-xs text-slate-400 text-center">
          Protected email: <span className="font-mono text-slate-300">kuldeepkuldeepjain@gmail.com</span>
        </p>
      </CardContent>
    </Card>
  )
}
