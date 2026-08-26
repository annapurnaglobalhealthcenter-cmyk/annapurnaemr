"use client"

import { usePathname } from "next/navigation"
import { Bell, Search, User } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export function AppHeader() {
  const pathname = usePathname()
  
  // Very simple breadcrumb derivation for demo
  const paths = pathname.split('/').filter(Boolean)
  const breadcrumb = paths.length === 0 ? 'Dashboard' : paths[0].charAt(0).toUpperCase() + paths[0].slice(1)

  return (
    <header className="bg-white border-b h-16 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center flex-1">
        <h2 className="text-lg font-semibold text-gray-800 tracking-tight">{breadcrumb}</h2>
        
        <div className="ml-8 max-w-md flex-1 hidden md:block relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <Input 
            type="search" 
            placeholder="Global search (Patients, Invoices, Encounters...)" 
            className="w-full bg-gray-50 pl-9 border-none focus-visible:ring-1"
          />
        </div>
      </div>
      
      <div className="flex items-center space-x-4 ml-4">
        <Button variant="ghost" size="icon" className="relative text-gray-500">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-blue-100 text-blue-700">DR</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">Dr. Admin User</p>
                <p className="text-xs leading-none text-gray-500">
                  admin@annapurna.hospital
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Billing</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <form action={async () => {
              const { logout } = await import('@/app/login/actions')
              await logout()
            }}>
              <DropdownMenuItem>
                <button type="submit" className="w-full text-left text-red-600">
                  Log out
                </button>
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
