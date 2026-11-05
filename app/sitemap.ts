import type { MetadataRoute } from "next"
import { SITE_ORIGIN } from "@/lib/site-seo"

const publicRoutes = ["/", "/funded-trading-accounts", "/privacy", "/terms", "/cookies"] as const

export default function sitemap(): MetadataRoute.Sitemap {
  return publicRoutes.map((path) => ({
    url: new URL(path, SITE_ORIGIN).toString(),
  }))
}
