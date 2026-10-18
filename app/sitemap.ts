import type { MetadataRoute } from "next"

const siteUrl = "https://elitefund.sbs"

const publicRoutes = [
  "",
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
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.6,
  }))
}
