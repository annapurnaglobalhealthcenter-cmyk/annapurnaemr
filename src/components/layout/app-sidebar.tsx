"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Activity, Users, Bed, CreditCard, Shield, Settings, CalendarDays, FlaskConical, Stethoscope, Microscope, ClipboardList, Pill, Calendar } from "lucide-react"

const navigation = [
  { name: 'Dashboard',    href: '/',             icon: Activity },
  { name: 'Patients',     href: '/patients',     icon: Users },
  { name: 'Appointments', href: '/appointments', icon: CalendarDays },
  { name: 'Doctor',       href: '/doctor',       icon: Stethoscope },
  { name: 'Laboratory',   href: '/lab',          icon: Microscope },
  { name: 'Operation Theatre', href: '/ot', icon: Calendar },
  { name: 'Radiology',    href: '/radiology',    icon: Microscope },
  { name: 'Pharmacy',     href: '/pharmacy',     icon: Pill },
  { name: 'IPD/Wards',    href: '/ipd',          icon: Bed },
  { name: 'Nursing',      href: '/nursing',      icon: Activity },
  { name: 'Billing',      href: '/billing',      icon: CreditCard },
  { name: 'Schemes',      href: '/schemes',      icon: Shield },
  { name: 'Audit Logs',   href: '/audit',        icon: ClipboardList },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-white border-r flex flex-col h-full">
      <div className="p-6 border-b">
        <h1 className="text-xl font-bold text-blue-900 tracking-tight">Annapurna EMR</h1>
        <p className="text-xs text-gray-500 mt-1">Enterprise HIS</p>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`) && item.href !== '/'
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                flex items-center px-3 py-2 text-sm font-medium rounded-md group transition-colors
                ${isActive 
                  ? 'bg-blue-50 text-blue-700' 
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }
              `}
            >
              <item.icon className={`w-5 h-5 mr-3 flex-shrink-0 ${isActive ? 'text-blue-700' : 'text-gray-400 group-hover:text-gray-500'}`} />
              {item.name}
            </Link>
          )
        })}
      </nav>
      <div className="p-4 border-t">
        <Link href="/settings" className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 transition-colors">
          <Settings className="w-5 h-5 mr-3 text-gray-400" />
          Settings
        </Link>
      </div>
    </aside>
  )
}
