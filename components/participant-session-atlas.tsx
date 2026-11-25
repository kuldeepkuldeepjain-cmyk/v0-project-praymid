"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Globe2 } from "lucide-react"
import styles from "./participant-session-atlas.module.css"

const hubs = [
  { city: "Tokyo", region: "Asia Pacific", zone: "Asia/Tokyo", currency: "JPY", start: 9, end: 18, note: "The yen anchors this session. Watch how USD/JPY moves as Japanese banks and exporters start their day." },
  { city: "London", region: "Europe", zone: "Europe/London", currency: "GBP", start: 8, end: 17, note: "London bridges Asia and North America. Its afternoon overlaps with New York’s morning, bringing both desks into the market." },
  { city: "New York", region: "North America", zone: "America/New_York", currency: "USD", start: 8, end: 17, note: "The dollar is in focus here. US economic releases often arrive early in the session, while London desks are still open." },
].map(hub => ({ ...hub, clock: new Intl.DateTimeFormat("en-GB", { timeZone: hub.zone, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }) }))

const hourLabel = (hour: number) => `${String(hour).padStart(2, "0")}:00`

export function ParticipantSessionAtlas() {
  const [index, select] = useState(0)
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    const tick = () => setNow(new Date())
    tick()
    const timer = window.setInterval(tick, 15000)
    return () => window.clearInterval(timer)
  }, [])
  const hub = hubs[index]
  const parts = now ? hub.clock.formatToParts(now) : []
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value
  const time = Number(part("hour")) + Number(part("minute")) / 60
  const weekday = part("weekday")
  const weekend = weekday === "Sat" || weekday === "Sun"
  return (
    <section className={styles.atlas} aria-labelledby="session-atlas-title">
      <header className={styles.header}>
        <div><p className={styles.label}><Globe2 size={16} aria-hidden="true" /> FX field guide</p><h2 id="session-atlas-title">Session atlas</h2></div>
        <fieldset className={styles.selector}><legend className="sr-only">Explore a financial center</legend>{hubs.map((item, i) => <label key={item.zone}><input type="radio" name="session-city" checked={index === i} onChange={() => select(i)} /><span>{item.city}</span></label>)}</fieldset>
      </header>
      <div className={styles.scene}>
        <div className={styles.art} aria-hidden="true"><Image src="/images/session-atlas.png" alt="" width={1500} height={500} sizes="(min-width: 900px) 1050px, 650px" style={{ transform: `translateX(-${index * 100 / 3}%)` }} /></div>
        <div key={hub.zone} className={styles.brief}>
          <p className={styles.label}>{hub.region} · {hub.currency}</p>
          <h3>{hub.city}</h3>
          <p className={styles.clock}><span>{now ? `${part("hour")}:${part("minute")}` : "--:--"}</span> local time</p>
          <p className={styles.note}>{hub.note}</p>
        </div>
      </div>
      <div className={styles.schedule}>
        <div className={styles.legend}><strong>Typical weekday session</strong><span>{hourLabel(hub.start)}–{hourLabel(hub.end)} local</span></div>
        <div className={styles.track} aria-hidden="true"><i style={{left: `${hub.start / 24 * 100}%`, width: `${(hub.end - hub.start) / 24 * 100}%`}} />{now && <b style={{left: `${time / 24 * 100}%`}} />}</div>
        <p>{!now ? 'Local schedule' : weekend ? 'Weekend · Outside usual hours' : time >= hub.start && time < hub.end ? 'Within usual hours' : 'Outside usual hours'} · Holiday hours may vary.</p>
      </div>
    </section>
  )
}
