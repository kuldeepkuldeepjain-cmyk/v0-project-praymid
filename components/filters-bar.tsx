"use client"

import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Search, Download } from "lucide-react"
import type { BalanceFilter, DateFilter, SortOrder } from "@/lib/types"

type FiltersBarProps = {
  searchQuery: string
  onSearchChange: (query: string) => void
  balanceFilter: BalanceFilter
  onBalanceFilterChange: (filter: BalanceFilter) => void
  dateFilter: DateFilter
  onDateFilterChange: (filter: DateFilter) => void
  sortOrder: SortOrder
  onSortOrderChange: (order: SortOrder) => void
  onExport: () => void
}

export function FiltersBar({
  searchQuery,
  onSearchChange,
  balanceFilter,
  onBalanceFilterChange,
  dateFilter,
  onDateFilterChange,
  sortOrder,
  onSortOrderChange,
  onExport,
}: FiltersBarProps) {
  return (
    <div className="flex flex-col md:flex-row gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by wallet address..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>
      <Select value={balanceFilter} onValueChange={(value) => onBalanceFilterChange(value as BalanceFilter)}>
        <SelectTrigger className="w-full md:w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Balances</SelectItem>
          <SelectItem value="hasBalance">Has Balance</SelectItem>
          <SelectItem value="noBalance">No Balance</SelectItem>
        </SelectContent>
      </Select>
      <Select value={dateFilter} onValueChange={(value) => onDateFilterChange(value as DateFilter)}>
        <SelectTrigger className="w-full md:w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Time</SelectItem>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="week">Last 7 Days</SelectItem>
          <SelectItem value="month">Last 30 Days</SelectItem>
        </SelectContent>
      </Select>
      <Select value={sortOrder} onValueChange={(value) => onSortOrderChange(value as SortOrder)}>
        <SelectTrigger className="w-full md:w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="asc">Ascending</SelectItem>
          <SelectItem value="desc">Descending</SelectItem>
        </SelectContent>
      </Select>
      <Button variant="outline" onClick={onExport}>
        <Download className="h-4 w-4 mr-2" />
        Export CSV
      </Button>
    </div>
  )
}
