import type { MetadataRoute } from "next"
import { SITE_ORIGIN } from "@/lib/site-seo"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/leaderboard", "/privacy", "/terms", "/cookies"],
        disallow: ["/admin/", "/api/", "/participant/dashboard/", "/finalflow/dashboard/", "/superadmin/", "/customer-care/dashboard/", "/test-db/"],
      },
    ],
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
    host: SITE_ORIGIN,
  }
}
