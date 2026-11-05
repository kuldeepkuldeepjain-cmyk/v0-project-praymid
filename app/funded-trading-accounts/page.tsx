import { FundedTradingGuide } from "@/components/funded-trading-guide"
import { createSiteMetadata, SITE_NAME, SITE_ORIGIN } from "@/lib/site-seo"

const title = "Funded Trading Accounts: Rules, Fees & Payouts"
const description = "Learn how funded trading accounts and prop trading challenges work. Compare evaluation fees, daily loss limits, drawdown rules, and USDT payout conditions."
const url = `${SITE_ORIGIN}/funded-trading-accounts`

export const metadata = createSiteMetadata({
  title,
  description,
  canonicalPath: "/funded-trading-accounts",
})

export default function FundedTradingAccountsPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${url}#article`,
        headline: "Funded trading accounts: challenges, fees, drawdown and payouts",
        description,
        mainEntityOfPage: url,
        inLanguage: "en",
        author: { "@type": "Organization", "@id": `${SITE_ORIGIN}/#organization`, name: SITE_NAME, url: SITE_ORIGIN },
        publisher: { "@id": `${SITE_ORIGIN}/#organization` },
        isPartOf: { "@id": `${SITE_ORIGIN}/#website` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_ORIGIN}/` },
          { "@type": "ListItem", position: 2, name: "Funded trading guide", item: url },
        ],
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <FundedTradingGuide />
    </>
  )
}
