import Link from "next/link"
import { Compass, Home } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#080c14] flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-2xl border border-white/10 bg-[#0d1220] shadow-2xl p-8 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center mb-5 ring-1 ring-cyan-500/30">
          <Compass className="h-8 w-8 text-cyan-400" />
        </div>

        <p className="text-sm font-mono tracking-widest text-cyan-400 mb-1">404</p>
        <h1 className="text-2xl font-bold text-slate-50 mb-2 text-balance">Page Not Found</h1>
        <p className="text-slate-400 mb-6 text-pretty">
          The page you&apos;re looking for doesn&apos;t exist or may have been moved.
        </p>

        <Link
          href="/"
          className="inline-flex w-full h-12 items-center justify-center gap-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition-colors"
        >
          <Home className="h-4 w-4" />
          Back to Homepage
        </Link>
      </div>
    </div>
  )
}
