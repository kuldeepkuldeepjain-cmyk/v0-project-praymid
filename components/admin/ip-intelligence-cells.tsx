"use client"

import { useEffect, useRef, useState } from "react"
import useSWR from "swr"
import { adminFetch } from "@/lib/auth"

type IpIntelligence = {
  city: string | null
  region: string | null
  country: string | null
  isp: string | null
  organization: string | null
  asn: string | null
}

type IpIntelligenceResponse = {
  success: boolean
  data: IpIntelligence | null
  error?: string
}

let sharedObserver: IntersectionObserver | null = null
const observerCallbacks = new Map<Element, () => void>()

function observeWhenVisible(element: Element, callback: () => void) {
  if (typeof IntersectionObserver === "undefined") {
    callback()
    return () => undefined
  }

  sharedObserver ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const onVisible = observerCallbacks.get(entry.target)
        if (!onVisible) continue
        observerCallbacks.delete(entry.target)
        sharedObserver?.unobserve(entry.target)
        onVisible()
      }
    },
    { rootMargin: "350px" },
  )

  observerCallbacks.set(element, callback)
  sharedObserver.observe(element)

  return () => {
    observerCallbacks.delete(element)
    sharedObserver?.unobserve(element)
  }
}

async function fetchIpIntelligence(url: string) {
  const response = await adminFetch(url)
  const payload = (await response.json().catch(() => null)) as IpIntelligenceResponse | null

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error || "Unable to resolve IP details")
  }

  return payload.data
}

function formatIpLocation(data: IpIntelligence | null | undefined) {
  return [data?.city, data?.region, data?.country].filter(Boolean).join(", ") || "Not available"
}

export function IpLocationDetails({ ipAddress }: { ipAddress?: string | null }) {
  const locationRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const ip = ipAddress?.trim() || ""
  const lookupUrl = ip ? `/api/admin/ip-intelligence?ip=${encodeURIComponent(ip)}` : null
  const { data, error, isLoading } = useSWR(isVisible ? lookupUrl : null, fetchIpIntelligence, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  })

  useEffect(() => {
    const element = locationRef.current
    if (!element || !ip || isVisible) return
    return observeWhenVisible(element, () => setIsVisible(true))
  }, [ip, isVisible])

  const location = error ? "Lookup unavailable" : isLoading ? "Looking up location…" : formatIpLocation(data)

  return (
    <div ref={locationRef} className="flex min-w-0 flex-col gap-1" title="Approximate location inferred from the IP address; VPNs and proxies can affect accuracy.">
      <code className="break-all font-mono text-xs text-foreground">{ip || "IP not available"}</code>
      <span className="text-xs text-muted-foreground">{ip ? location : "Location unavailable"}</span>
    </div>
  )
}

export function IpIntelligenceCells({ ipAddress }: { ipAddress?: string | null }) {
  const locationCellRef = useRef<HTMLTableCellElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const ip = ipAddress?.trim() || ""
  const lookupUrl = ip ? `/api/admin/ip-intelligence?ip=${encodeURIComponent(ip)}` : null
  const { data, error, isLoading } = useSWR(isVisible ? lookupUrl : null, fetchIpIntelligence, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  })

  useEffect(() => {
    const element = locationCellRef.current
    if (!element || !ip || isVisible) return
    return observeWhenVisible(element, () => setIsVisible(true))
  }, [ip, isVisible])

  const location = error ? "Unavailable" : isLoading ? "Looking up…" : formatIpLocation(data)
  const network = error
    ? "Unavailable"
    : isLoading
      ? "Looking up…"
      : data?.isp || data?.organization || "Not available"
  const networkDetails = [data?.organization, data?.asn]
    .filter((value) => value && value !== network)
    .join(" · ")

  return (
    <>
      <td
        ref={locationCellRef}
        className="whitespace-nowrap px-4 py-3 text-xs text-slate-300"
        title="Approximate location inferred from the IP address; VPNs and proxies can affect accuracy."
      >
        {ip ? location : "IP not available"}
      </td>
      <td
        className="whitespace-nowrap px-4 py-3 text-xs text-slate-300"
        title="Network provider information inferred from the IP address."
      >
        {ip ? (
          <span className="flex flex-col gap-0.5">
            <span>{network}</span>
            {networkDetails && <span className="text-[11px] text-slate-500">{networkDetails}</span>}
          </span>
        ) : (
          "IP not available"
        )}
      </td>
    </>
  )
}
