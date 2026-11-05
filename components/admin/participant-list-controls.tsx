"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

export function ParticipantListControls({ sort, onSort, pageSize, onPageSize, expanded, onExpanded }: {
  sort: string; onSort: (value: string) => void; pageSize: number; onPageSize: (value: number) => void; expanded: boolean; onExpanded: (value: boolean) => void
}) {
  return <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-muted/30 p-4 text-foreground">
    <div className="flex flex-wrap items-center gap-4">
      <label className="flex items-center gap-2 text-sm">Sort by<select className="rounded-md border border-input bg-background px-3 py-2 text-foreground" value={sort} onChange={event => onSort(event.target.value)}><option value="original">Default order</option><option value="newest">Newest joined</option><option value="oldest">Oldest joined</option><option value="name">Name A–Z</option><option value="activity">Recently active</option></select></label>
      <label className="flex items-center gap-2 text-sm">Rows<select className="rounded-md border border-input bg-background px-3 py-2 text-foreground" value={pageSize} onChange={event => onPageSize(Number(event.target.value))}>{[25, 50, 100].map(size => <option key={size} value={size}>{size}</option>)}</select></label>
    </div>
    <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-primary" checked={expanded} onChange={event => onExpanded(event.target.checked)} />Show all columns</label>
  </div>
}

export function ParticipantPagination({ page, pages, count, pageSize, onPage }: { page: number; pages: number; count: number; pageSize: number; onPage: (value: number) => void }) {
  return <nav aria-label="Participant list pages" className="flex flex-wrap items-center justify-between gap-4 border-t border-border p-4 text-foreground">
    <p role="status" className="text-sm text-muted-foreground">{count ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, count)} of ${count} matching participants` : "0 matching participants"}</p>
    <div className="flex items-center gap-3"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft />Previous</Button><span className="text-sm">{page} / {pages}</span><Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next<ChevronRight /></Button></div>
  </nav>
}
