'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

export function DownloadPdfButton({ targetId, filename, className, variant = 'outline' }: { targetId: string, filename: string, className?: string, variant?: 'outline' | 'default' | 'ghost' }) {
  const [isGenerating, setIsGenerating] = useState(false)

  const generatePdf = async () => {
    setIsGenerating(true)
    try {
      const element = document.getElementById(targetId)
      if (!element) throw new Error('Document target not found')

      // Temporarily add a class to ensure it renders for print formatting if needed
      element.classList.add('pdf-rendering')

      const canvas = await html2canvas(element, { 
        scale: 2, 
        useCORS: true,
        logging: false
      })
      
      element.classList.remove('pdf-rendering')

      const imgData = canvas.toDataURL('image/png')
      
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(filename)
      toast.success('PDF downloaded successfully')
    } catch (err) {
      console.error(err)
      toast.error('Failed to generate PDF')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Button onClick={generatePdf} disabled={isGenerating} className={className} variant={variant}>
      {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
      Download PDF
    </Button>
  )
}
