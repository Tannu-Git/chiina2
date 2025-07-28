import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sparkles, Copy, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

const AIInsights = ({ data = [], selectedClient }) => {
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [draftLoading, setDraftLoading] = useState(false)
  const [summary, setSummary] = useState('')
  const [draft, setDraft] = useState('')
  const [showSummary, setShowSummary] = useState(false)
  const [showDraft, setShowDraft] = useState(false)

  // Mock Gemini API call - replace with actual API integration
  const callGeminiAPI = async (prompt) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Mock response based on the prompt type
    if (prompt.includes('logistics analyst')) {
      const totalValue = data.reduce((sum, item) => sum + (item.AMOUNT || 0), 0)
      const topClient = data.reduce((acc, item) => {
        const client = item.CLIENT || 'Unknown'
        acc[client] = (acc[client] || 0) + (item.AMOUNT || 0)
        return acc
      }, {})
      const topClientName = Object.keys(topClient).reduce((a, b) => topClient[a] > topClient[b] ? a : b, '')
      
      return `This shipment contains ${data.length} items with a total value of $${totalValue.toLocaleString()}. The primary client is ${topClientName}, representing the largest portion of the shipment value. Key items include office supplies, sporting goods, and industrial components, indicating a diverse cargo mix suitable for multiple market segments.`
    } else {
      const clientData = data.filter(item => item.CLIENT === selectedClient)
      const totalValue = clientData.reduce((sum, item) => sum + (item.AMOUNT || 0), 0)
      const itemCount = clientData.length
      
      return `Subject: Shipment Update - Your Order is Being Processed

Dear ${selectedClient},

I hope this email finds you well. I wanted to provide you with an update on your recent shipment.

Your order is currently being processed and prepared for shipment. The total value of your goods in this container is approximately $${totalValue.toLocaleString()}.

Key items in your order include:
${clientData.slice(0, 3).map(item => `• ${item.DESCRIPTION} (Qty: ${item['T.QTY'] || 0})`).join('\n')}

We expect your shipment to be ready for dispatch within the next few business days. We will keep you updated on the progress and provide tracking information once available.

Thank you for your business. Please don't hesitate to contact us if you have any questions.

Best regards,
Logistics Team`
    }
  }

  const handleGenerateSummary = async () => {
    setSummaryLoading(true)
    setShowSummary(true)
    
    try {
      const dataSummary = data.slice(0, 10).map(item => ({
        description: item.DESCRIPTION,
        amount: item.AMOUNT,
        client: item.CLIENT,
        supplier: item.SUPPLIER,
        cbm: item['T.CBM']
      }))

      const prompt = `You are a logistics analyst. Analyze the following JSON data representing a shipment and provide a concise, insightful summary in 2-3 sentences for a manager. Mention the top client by value and the most significant items. Data: ${JSON.stringify(dataSummary)}`
      
      const result = await callGeminiAPI(prompt)
      setSummary(result)
    } catch (error) {
      toast.error('Failed to generate summary')
      setSummary('An error occurred while generating the summary. Please try again.')
    } finally {
      setSummaryLoading(false)
    }
  }

  const handleGenerateDraft = async () => {
    if (!selectedClient || selectedClient === 'All') {
      toast.error('Please select a specific client to generate a draft')
      return
    }

    setDraftLoading(true)
    setShowDraft(true)
    
    try {
      const clientData = data.filter(item => item.CLIENT === selectedClient)
      const prompt = `Generate email draft for client ${selectedClient} about shipment update`
      
      const result = await callGeminiAPI(prompt)
      setDraft(result)
    } catch (error) {
      toast.error('Failed to generate draft')
      setDraft('An error occurred while generating the draft. Please try again.')
    } finally {
      setDraftLoading(false)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard!')
  }

  return (
    <section className="mb-8 p-6 bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-semibold text-stone-800 mb-2 flex items-center">
        <Sparkles className="h-6 w-6 mr-2 text-amber-500" />
        AI-Powered Insights
      </h2>
      <p className="text-stone-500 mb-6">
        Use AI to generate summaries and draft communications based on the current data view.
      </p>
      
      {/* Summary Section */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-stone-800 mb-2">Shipment Summary</h3>
        <p className="text-sm text-stone-500 mb-4">
          Get a quick, human-readable overview of the filtered shipment data.
        </p>
        <Button 
          onClick={handleGenerateSummary}
          disabled={summaryLoading}
          className="bg-amber-500 hover:bg-amber-600 text-white"
        >
          {summaryLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          Generate Summary
        </Button>
        
        {showSummary && (
          <div className="mt-4 p-4 bg-stone-50 rounded-lg">
            {summaryLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
              </div>
            ) : (
              <p className="text-stone-600">{summary}</p>
            )}
          </div>
        )}
      </div>

      {/* Client Draft Section */}
      {selectedClient && selectedClient !== 'All' && (
        <div>
          <h3 className="text-lg font-semibold text-stone-800 mb-2">Client Communication</h3>
          <p className="text-sm text-stone-500 mb-4">
            Draft a professional shipment update for {selectedClient}.
          </p>
          <Button 
            onClick={handleGenerateDraft}
            disabled={draftLoading}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            {draftLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Draft Update for {selectedClient}
          </Button>
          
          {showDraft && (
            <div className="mt-4 relative">
              {draftLoading ? (
                <div className="flex items-center justify-center py-8 bg-stone-50 rounded-lg">
                  <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                </div>
              ) : (
                <div className="relative">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={12}
                    className="w-full p-4 border border-stone-300 rounded-lg shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                    placeholder="AI-generated draft will appear here..."
                  />
                  <Button
                    onClick={() => copyToClipboard(draft)}
                    size="sm"
                    variant="outline"
                    className="absolute top-2 right-2"
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export default AIInsights
