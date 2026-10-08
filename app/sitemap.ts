import type { MetadataRoute } from "next"

const siteUrl = "https://www.elitefund.sbs"

const publicRoutes = [
  "",
  "/lending",
  "/leaderboard",
  "/privacy",
  "/terms",
  "/cookies",
] as const

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  return publicRoutes.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: now,
    changeFrequency: path === "" || path === "/lending" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path === "/lending" ? 0.8 : 0.6,
  }))
}
