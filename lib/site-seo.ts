import type { Metadata } from "next"

export const SITE_ORIGIN = "https://www.elitefund.sbs"
export const SITE_NAME = "EliteFund"
export const SITE_IMAGE = "/images/elitefund-hero-wide.png"
export const SITE_DESCRIPTION =
  "EliteFund offers a trading workspace and optional funded trading challenge programs. Compare published fees and risk rules; profits and payouts are not guaranteed."

type SiteMetadataOptions = {
  title: string
  description: string
  canonicalPath?: string
  keywords?: string[]
  noIndex?: boolean
}

export function createSiteMetadata({
  title,
  description,
  canonicalPath,
  keywords,
  noIndex = false,
}: SiteMetadataOptions): Metadata {
  const canonicalUrl = canonicalPath
    ? new URL(canonicalPath, SITE_ORIGIN).toString()
    : undefined
  const socialTitle = `${title} | ${SITE_NAME}`

  return {
    title,
    description,
    ...(keywords ? { keywords } : {}),
    ...(noIndex
      ? { robots: { index: false, follow: true } }
      : canonicalPath
        ? { alternates: { canonical: canonicalPath } }
        : {}),
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: socialTitle,
      description,
      ...(canonicalUrl ? { url: canonicalUrl } : {}),
      images: [
        {
          url: SITE_IMAGE,
          alt: "EliteFund trading workspace and funded account plans",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [SITE_IMAGE],
    },
  }
}
