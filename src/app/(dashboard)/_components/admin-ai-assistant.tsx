'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { requestAdminAnalytics } from '@/lib/services/ai.service'
import { toast } from 'sonner'
import { Loader2, Search, BarChart3, ChevronRight, MessageSquare } from 'lucide-react'

export function AdminAiAssistant() {
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [response, setResponse] = useState<any>(null)
  
  const handleAsk = async (q: string = query) => {
    if (!q) return
    setIsLoading(true)
    try {
      const res = await requestAdminAnalytics(q)
      setResponse(res.ai_response)
      setQuery(q)
    } catch (e:any) {
      toast.error(e.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white border rounded-xl shadow-sm overflow-hidden flex flex-col h-[500px]">
      <div className="bg-slate-900 text-white p-4 flex items-center">
        <BarChart3 className="w-5 h-5 mr-3 text-blue-400" />
        <div>
          <h2 className="font-semibold text-sm">Administrative AI Assistant</h2>
          <p className="text-xs text-slate-400">Natural language hospital analytics</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-slate-50 relative">
        {!response && !isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <MessageSquare className="w-8 h-8 text-slate-300 mb-3" />
            <p className="text-sm text-slate-500 mb-4">Ask any question about hospital operations, bed occupancy, or OPD volume.</p>
            <div className="space-y-2 w-full max-w-sm">
              <button onClick={() => handleAsk("What is our current bed occupancy?")} className="block w-full text-left text-xs bg-white border p-3 rounded-md hover:border-blue-400 hover:text-blue-700 transition">
                "What is our current bed occupancy?"
              </button>
              <button onClick={() => handleAsk("How many OPD patients did we have this month?")} className="block w-full text-left text-xs bg-white border p-3 rounded-md hover:border-blue-400 hover:text-blue-700 transition">
                "How many OPD patients did we have this month?"
              </button>
              <button onClick={() => handleAsk("How many lab reports are pending?")} className="block w-full text-left text-xs bg-white border p-3 rounded-md hover:border-blue-400 hover:text-blue-700 transition">
                "How many lab reports are pending?"
              </button>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        )}

        {response && !isLoading && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <div className="bg-blue-600 text-white p-3 rounded-lg rounded-tr-none text-sm max-w-[85%]">
                {query}
              </div>
            </div>
            
            <div className="flex justify-start">
              <div className="bg-white border shadow-sm p-4 rounded-lg rounded-tl-none text-sm max-w-[95%] space-y-4">
                <p className="text-slate-800 leading-relaxed">{response.answer}</p>
                
                {response.chartData && response.chartData.length > 0 && (
                  <div className="bg-slate-50 p-4 rounded-md border mt-3">
                    <h4 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">Data Breakdown</h4>
                    <div className="space-y-2">
                      {response.chartData.map((d:any, i:number) => {
                        const max = Math.max(...response.chartData.map((x:any)=>x.value))
                        const pct = (d.value / max) * 100
                        return (
                          <div key={i} className="flex items-center text-xs">
                            <div className="w-20 truncate pr-2 text-slate-600 font-medium">{d.label}</div>
                            <div className="flex-1 bg-slate-200 h-2 rounded-full overflow-hidden">
                              <div className="bg-blue-500 h-full" style={{ width: `${pct}%` }}></div>
                            </div>
                            <div className="w-10 text-right pl-2 font-semibold">{d.value}</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {response.suggestedFollowUps && response.suggestedFollowUps.length > 0 && (
                  <div className="pt-3 border-t">
                    <p className="text-xs text-slate-500 mb-2">Suggested follow-ups:</p>
                    <div className="flex flex-wrap gap-2">
                      {response.suggestedFollowUps.map((q:string, i:number) => (
                        <button key={i} onClick={() => handleAsk(q)} className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-full hover:bg-slate-200 flex items-center">
                          {q} <ChevronRight className="w-3 h-3 ml-1" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-3 bg-white border-t flex gap-2">
        <Input 
          placeholder="Ask a question..." 
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAsk()}
          className="text-sm border-slate-300"
        />
        <Button onClick={() => handleAsk()} disabled={isLoading} className="shrink-0 bg-blue-600 hover:bg-blue-700">
          <Search className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
