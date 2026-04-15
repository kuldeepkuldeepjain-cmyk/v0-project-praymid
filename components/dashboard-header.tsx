"use client"

import { RefreshCw, Bell, Search, Command } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"
import { getAdminData } from "@/lib/auth"
import { CreateAdminDialog } from "@/components/create-admin-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type DashboardHeaderProps = {
  onRefresh: () => void
  isRefreshing: boolean
}

export function DashboardHeader({ onRefresh, isRefreshing }: DashboardHeaderProps) {
  const [adminData, setAdminData] = useState<{ email: string; role: string } | null>(null)

  useEffect(() => {
    const data = getAdminData()
    setAdminData(data)
  }, [])

  return (
    <header className="h-16 glass border-b-0 sticky top-0 z-50 shadow-lg">
      <div className="flex items-center justify-between h-full px-6">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative w-72 hidden md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search participants..."
              className="pl-9 pr-12 h-10 bg-white/80 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-[#E85D3B] focus:ring-[#E85D3B]/20 rounded-xl shadow-sm transition-all duration-300"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <kbd className="pointer-events-none h-5 select-none items-center gap-1 rounded-lg border border-gray-200 bg-gray-100 px-1.5 font-mono text-[10px] font-medium opacity-100 hidden sm:flex text-gray-500">
                <Command className="h-3 w-3" />K
              </kbd>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <CreateAdminDialog />

          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-gray-600 hover:text-[#E85D3B] hover:bg-[#E85D3B]/10 rounded-xl transition-all duration-300"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 relative text-gray-600 hover:text-[#7c3aed] hover:bg-[#7c3aed]/10 rounded-xl transition-all duration-300"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute top-2 right-2 h-2 w-2 bg-[#E85D3B] rounded-full animate-pulse" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 glass border-0 shadow-xl rounded-xl">
              <DropdownMenuLabel className="text-gray-900 font-semibold">Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-100" />
              <DropdownMenuItem className="flex flex-col items-start gap-1 py-3 focus:bg-[#E85D3B]/5 rounded-lg cursor-pointer">
                <span className="font-medium text-gray-900">New participant registered</span>
                <span className="text-xs text-gray-500">sheetal@gmail.com joined 2 hours ago</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex flex-col items-start gap-1 py-3 focus:bg-[#E85D3B]/5 rounded-lg cursor-pointer">
                <span className="font-medium text-gray-900">Contribution submitted</span>
                <span className="text-xs text-gray-500">$100 USDT awaiting verification</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-100" />
              <DropdownMenuItem className="text-center text-[#E85D3B] focus:bg-[#E85D3B]/5 rounded-lg cursor-pointer font-medium">
                View all notifications
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-10 gap-2 pl-2 pr-3 ml-1 text-gray-900 hover:bg-gray-100 rounded-xl transition-all duration-300"
              >
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#E85D3B] to-[#f97316] flex items-center justify-center shadow-md">
                  <span className="text-sm font-bold text-white">
                    {adminData?.email?.charAt(0).toUpperCase() || "A"}
                  </span>
                </div>
                <div className="hidden sm:flex flex-col items-start">
                  <span className="text-sm font-semibold leading-none text-gray-900">
                    {adminData?.email?.split("@")[0] || "Admin"}
                  </span>
                  <span className="text-[10px] text-[#E85D3B] capitalize font-medium">
                    {adminData?.role || "admin"}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 glass border-0 shadow-xl rounded-xl">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-900">{adminData?.email || "admin@system.com"}</span>
                  <Badge className="w-fit mt-1.5 capitalize text-xs bg-gradient-to-r from-[#E85D3B] to-[#f97316] text-white border-0 shadow-sm">
                    {adminData?.role || "admin"}
                  </Badge>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-100" />
              <DropdownMenuItem className="focus:bg-[#E85D3B]/5 text-gray-700 rounded-lg cursor-pointer">
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuItem className="focus:bg-[#E85D3B]/5 text-gray-700 rounded-lg cursor-pointer">
                Preferences
              </DropdownMenuItem>
              <DropdownMenuItem className="focus:bg-[#E85D3B]/5 text-gray-700 rounded-lg cursor-pointer">
                Help & Support
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
