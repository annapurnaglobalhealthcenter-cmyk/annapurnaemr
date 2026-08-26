import { AppSidebar } from "./app-sidebar"
import { AppHeader } from "./app-header"

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      <AppSidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <AppHeader />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50/50 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
