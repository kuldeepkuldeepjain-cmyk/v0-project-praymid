"use client"

import Image from "next/image"
import { useState } from "react"
import { Award, Check, Download, Loader2, ShieldCheck, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { formatPayoutAmount, formatPayoutDate } from "@/lib/payout-presentation"

export interface PayoutCertificateData {
  id: string
  recipient: string
  amount: number | string
  accountLabel: "Funded Account" | "Challenge Account"
  payoutLabel: "Funded profit payout" | "Challenge reward payout"
  method: string
  issuedAt?: string | null
  transactionReference?: string | null
}

const ELITEFUND_LOGO_PATH = "/elite-fund-terminal-logo.png"

function loadCertificateLogo() {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image()
    image.crossOrigin = "anonymous"
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("EliteFund logo could not be loaded"))
    image.src = ELITEFUND_LOGO_PATH
  })
}

async function createCertificateLogoDataUrl() {
  const image = await loadCertificateLogo()
  const cropX = Math.round(image.naturalWidth * 0.24)
  const cropY = Math.round(image.naturalHeight * 0.15)
  const cropWidth = Math.round(image.naturalWidth * 0.58)
  const cropHeight = Math.round(image.naturalHeight * 0.42)
  const canvas = document.createElement("canvas")
  const context = canvas.getContext("2d")

  if (!context) throw new Error("Certificate logo could not be prepared")

  canvas.width = cropWidth
  canvas.height = cropHeight
  context.drawImage(image, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight)

  const logoPixels = context.getImageData(0, 0, cropWidth, cropHeight)
  for (let index = 0; index < logoPixels.data.length; index += 4) {
    const brightness = Math.max(logoPixels.data[index], logoPixels.data[index + 1], logoPixels.data[index + 2])
    if (brightness < 20) logoPixels.data[index + 3] = 0
    else if (brightness < 55) logoPixels.data[index + 3] = Math.round(logoPixels.data[index + 3] * ((brightness - 20) / 35))
  }
  context.putImageData(logoPixels, 0, 0)

  return canvas.toDataURL("image/png")
}

function getCertificateNumber(data: PayoutCertificateData) {
  const accountCode = data.accountLabel === "Funded Account" ? "FND" : "CHL"
  const reference = data.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12).toUpperCase()
  return `EF-${accountCode}-${reference}`
}

function CertificateArtwork({ data }: { data: PayoutCertificateData }) {
  const certificateNumber = getCertificateNumber(data)

  return (
    <article className="payout-certificate" aria-label={`Payout certificate for ${data.recipient}`}>
      <span className="payout-certificate-corner payout-certificate-corner-top" aria-hidden="true" />
      <span className="payout-certificate-corner payout-certificate-corner-bottom" aria-hidden="true" />
      <header className="payout-certificate-header">
        <div className="payout-certificate-brand" aria-label="EliteFund">
          <span className="payout-certificate-logo" aria-hidden="true">
            <Image src={ELITEFUND_LOGO_PATH} alt="" width={88} height={88} />
          </span>
          <span><strong>ELITEFUND</strong><small>CAPITAL MARKETS</small></span>
        </div>
        <Badge variant="outline" className="payout-certificate-badge"><ShieldCheck aria-hidden="true" />Verified payout</Badge>
      </header>

      <div className="payout-certificate-body">
        <div className="payout-certificate-kicker"><Sparkles aria-hidden="true" /> Certificate of payout <Sparkles aria-hidden="true" /></div>
        <p>This certificate is proudly presented to</p>
        <h3>{data.recipient}</h3>
        <div className="payout-certificate-rule" aria-hidden="true"><span /></div>
        <p>in recognition of a successfully completed</p>
        <h4>{data.payoutLabel}</h4>
        <strong className="payout-certificate-amount">{formatPayoutAmount(data.amount)}</strong>
        <p className="payout-certificate-currency">United States Dollars</p>
      </div>

      <dl className="payout-certificate-details">
        <div><dt>Account</dt><dd>{data.accountLabel}</dd></div>
        <div><dt>Payment method</dt><dd>{data.method || "Not recorded"}</dd></div>
        <div><dt>Issued</dt><dd>{formatPayoutDate(data.issuedAt)}</dd></div>
        <div><dt>Certificate no.</dt><dd>{certificateNumber}</dd></div>
      </dl>

      <footer className="payout-certificate-footer">
        <div className="payout-certificate-signature"><span>EliteFund</span><small>Authorized payout desk</small></div>
        <div className="payout-certificate-seal" aria-label="EliteFund verified"><Award aria-hidden="true" /><span>VERIFIED</span></div>
        <div className="payout-certificate-signature payout-certificate-signature-right"><span>{formatPayoutDate(data.issuedAt)}</span><small>Date of issue</small></div>
      </footer>
      <p className="payout-certificate-verification"><Check aria-hidden="true" /> Authenticity is tied to payout reference {data.id}{data.transactionReference ? ` and transfer reference ${data.transactionReference}` : ""}.</p>
    </article>
  )
}

async function createPayoutCertificatePdf(data: PayoutCertificateData) {
  const { jsPDF } = await import("jspdf")
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
  const width = doc.internal.pageSize.getWidth()
  const height = doc.internal.pageSize.getHeight()
  const certificateNumber = getCertificateNumber(data)
  const amount = formatPayoutAmount(data.amount)
  const issued = formatPayoutDate(data.issuedAt)
  const logoDataUrl = await createCertificateLogoDataUrl()

  doc.setFillColor(7, 18, 34)
  doc.rect(0, 0, width, height, "F")
  doc.setDrawColor(98, 169, 232)
  doc.setLineWidth(1.4)
  doc.rect(8, 8, width - 16, height - 16)
  doc.setDrawColor(42, 77, 112)
  doc.setLineWidth(0.35)
  doc.rect(11, 11, width - 22, height - 22)

  doc.setFillColor(10, 31, 54)
  doc.triangle(8, 8, 72, 8, 8, 60, "F")
  doc.triangle(width - 8, height - 8, width - 72, height - 8, width - 8, height - 60, "F")

  doc.addImage(logoDataUrl, "PNG", 17, 14, 28, 20, "elitefund-logo", "FAST")
  doc.setTextColor(238, 246, 255)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(13)
  doc.text("ELITEFUND", 50, 22)
  doc.setTextColor(144, 173, 201)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(6.5)
  doc.text("CAPITAL MARKETS", 50, 28)

  doc.setDrawColor(98, 169, 232)
  doc.roundedRect(width - 61, 17, 43, 11, 2, 2, "S")
  doc.setTextColor(98, 169, 232)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(7.5)
  doc.text("VERIFIED PAYOUT", width - 39.5, 24, { align: "center" })

  doc.setTextColor(98, 169, 232)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.text("CERTIFICATE OF PAYOUT", width / 2, 50, { align: "center", charSpace: 1.4 })
  doc.setTextColor(151, 177, 201)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8.5)
  doc.text("THIS CERTIFICATE IS PROUDLY PRESENTED TO", width / 2, 64, { align: "center" })

  doc.setTextColor(244, 249, 255)
  doc.setFont("times", "bold")
  doc.setFontSize(27)
  const displayRecipient = data.recipient.trim() || "EliteFund Trader"
  doc.text(displayRecipient, width / 2, 80, { align: "center", maxWidth: 185 })
  doc.setDrawColor(98, 169, 232)
  doc.setLineWidth(0.5)
  doc.line(77, 87, width - 77, 87)
  doc.setTextColor(151, 177, 201)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.text("in recognition of a successfully completed", width / 2, 99, { align: "center" })
  doc.setTextColor(218, 232, 246)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.text(data.payoutLabel.toUpperCase(), width / 2, 110, { align: "center" })
  doc.setTextColor(98, 169, 232)
  doc.setFontSize(29)
  doc.text(amount, width / 2, 128, { align: "center" })
  doc.setTextColor(151, 177, 201)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.text("UNITED STATES DOLLARS", width / 2, 136, { align: "center", charSpace: 1 })

  const detailY = 151
  const details = [
    ["ACCOUNT", data.accountLabel],
    ["PAYMENT METHOD", data.method || "Not recorded"],
    ["ISSUED", issued],
    ["CERTIFICATE NO.", certificateNumber],
  ]
  const columnWidth = 59
  const startX = (width - columnWidth * details.length) / 2
  details.forEach(([label, value], index) => {
    const center = startX + columnWidth * index + columnWidth / 2
    if (index > 0) {
      doc.setDrawColor(42, 77, 112)
      doc.line(startX + columnWidth * index, detailY, startX + columnWidth * index, detailY + 17)
    }
    doc.setTextColor(117, 151, 182)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(6.5)
    doc.text(label, center, detailY + 4, { align: "center" })
    doc.setTextColor(226, 238, 249)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(8.5)
    doc.text(String(value), center, detailY + 12, { align: "center", maxWidth: columnWidth - 8 })
  })

  doc.setTextColor(226, 238, 249)
  doc.setFont("times", "italic")
  doc.setFontSize(13)
  doc.text("EliteFund", 50, 179, { align: "center" })
  doc.setDrawColor(77, 112, 145)
  doc.line(27, 183, 73, 183)
  doc.setTextColor(117, 151, 182)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(6.5)
  doc.text("AUTHORIZED PAYOUT DESK", 50, 188, { align: "center" })

  doc.setFillColor(10, 31, 54)
  doc.setDrawColor(98, 169, 232)
  doc.setLineWidth(0.7)
  doc.circle(width / 2, 179, 13, "FD")
  doc.circle(width / 2, 179, 9.5, "S")
  doc.setTextColor(98, 169, 232)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(7)
  doc.text("EF", width / 2, 177, { align: "center" })
  doc.setFontSize(5.5)
  doc.text("VERIFIED", width / 2, 183, { align: "center" })

  doc.setTextColor(226, 238, 249)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.text(issued, width - 50, 179, { align: "center" })
  doc.setDrawColor(77, 112, 145)
  doc.line(width - 73, 183, width - 27, 183)
  doc.setTextColor(117, 151, 182)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(6.5)
  doc.text("DATE OF ISSUE", width - 50, 188, { align: "center" })

  doc.setProperties({
    title: `EliteFund Payout Certificate ${certificateNumber}`,
    subject: `${data.accountLabel} payout certificate`,
    author: "EliteFund",
    creator: "EliteFund Payout Desk",
    keywords: `EliteFund, payout, certificate, ${certificateNumber}`,
  })
  doc.save(`${certificateNumber}-payout-certificate.pdf`)
}

export function PayoutCertificateButton({ data, variant = "outline" }: { data: PayoutCertificateData; variant?: "outline" | "secondary" }) {
  const { toast } = useToast()
  const [downloading, setDownloading] = useState(false)

  async function downloadPdf() {
    if (downloading) return
    setDownloading(true)
    try {
      await createPayoutCertificatePdf(data)
      toast({ title: "Certificate downloaded", description: "Your verified payout certificate was saved as a PDF." })
    } catch {
      toast({ title: "Download failed", description: "The certificate PDF could not be created. Please try again.", variant: "destructive" })
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant={variant}><Award data-icon="inline-start" aria-hidden="true" />Payout certificate</Button>
      </DialogTrigger>
      <DialogContent className="payout-certificate-dialog max-w-4xl">
        <DialogHeader>
          <DialogTitle>Your payout certificate</DialogTitle>
          <DialogDescription>A verified record of your completed {data.accountLabel.toLowerCase()} payout.</DialogDescription>
        </DialogHeader>
        <div className="payout-certificate-frame"><CertificateArtwork data={data} /></div>
        <DialogFooter>
          <Button type="button" onClick={downloadPdf} disabled={downloading}>
            {downloading ? <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" /> : <Download data-icon="inline-start" aria-hidden="true" />}
            {downloading ? "Creating PDF..." : "Download as PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
