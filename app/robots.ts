import type { MetadataRoute } from "next"

const siteUrl = "https://www.elitefund.sbs"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/lending", "/leaderboard", "/privacy", "/terms", "/cookies"],
        disallow: ["/admin/", "/api/", "/participant/dashboard/", "/finalflow/dashboard/", "/superadmin/", "/customer-care/dashboard/", "/test-db/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
