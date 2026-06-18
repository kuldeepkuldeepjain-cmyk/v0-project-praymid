export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="h-12 w-12 mx-auto border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
        <p className="text-slate-600 font-medium">Loading contribution details...</p>
      </div>
    </div>
  )
}
