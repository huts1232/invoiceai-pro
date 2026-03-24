'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { MessageCircle, Calendar, Clock, Bot, User, ArrowLeft, Search, Filter } from 'lucide-react'

function ErrorFallback({ error }: { error: string }) {
  return <div className="min-h-screen bg-slate-900 flex items-center justify-center p-8"><div className="text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl p-6 max-w-md"><h2 className="text-lg font-bold mb-2">Something went wrong</h2><p className="text-sm">{error}</p></div></div>
}

function LoadingSpinner() {
  return (
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
  )
}

interface Conversation {
  id: string
  chatbot_id: string
  visitor_message: string
  bot_response: string
  created_at: string
  duration_seconds: number
  chatbot_name: string
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedChatbot, setSelectedChatbot] = useState('')
  const [chatbots, setChatbots] = useState<{ id: string; name: string }[]>([])

  const supabase = useMemo(() => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), [])

  const fetchConversations = async () => {
    try {
      setLoading(true)
      setError('')

      // First fetch chatbots to get names
      const { data: chatbotsData, error: chatbotsError } = await supabase
        .from('chatbots')
        .select('id, name')

      if (chatbotsError) {
        console.error('Supabase chatbots error:', chatbotsError)
        setError(`Failed to fetch chatbots: ${chatbotsError.message}`)
        return
      }

      console.log('Chatbots response:', chatbotsData)
      setChatbots(chatbotsData || [])

      // Mock conversations data since we don't have a conversations table
      // In a real app, this would be a proper Supabase query
      const mockConversations: Conversation[] = [
        {
          id: '1',
          chatbot_id: chatbotsData?.[0]?.id || '1',
          visitor_message: 'What are your pricing plans?',
          bot_response: 'We offer flexible pricing starting at $29/month for our Professional plan. This includes unlimited invoice processing, email integration, and approval workflows.',
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          duration_seconds: 45,
          chatbot_name: chatbotsData?.[0]?.name || 'Support Bot'
        },
        {
          id: '2',
          chatbot_id: chatbotsData?.[0]?.id || '1',
          visitor_message: 'How do I integrate with QuickBooks?',
          bot_response: 'You can integrate with QuickBooks by going to Settings > Integrations and clicking "Connect QuickBooks". You\'ll need admin access to your QuickBooks account.',
          created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          duration_seconds: 120,
          chatbot_name: chatbotsData?.[0]?.name || 'Support Bot'
        },
        {
          id: '3',
          chatbot_id: chatbotsData?.[1]?.id || '2',
          visitor_message: 'Can I upload invoices in bulk?',
          bot_response: 'Yes! Our bulk upload feature supports ZIP files containing multiple PDF invoices. You can upload up to 50 invoices at once.',
          created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          duration_seconds: 30,
          chatbot_name: chatbotsData?.[1]?.name || 'Sales Bot'
        },
        {
          id: '4',
          chatbot_id: chatbotsData?.[0]?.id || '1',
          visitor_message: 'Is my data secure?',
          bot_response: 'Absolutely. We use enterprise-grade encryption, regular security audits, and comply with SOC 2 standards. Your data is stored securely and never shared.',
          created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
          duration_seconds: 60,
          chatbot_name: chatbotsData?.[0]?.name || 'Support Bot'
        }
      ]

      setConversations(mockConversations)

    } catch (err) {
      console.error('Fetch conversations error:', err)
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConversations()
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
  }

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.visitor_message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         conv.bot_response.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         conv.chatbot_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesChatbot = !selectedChatbot || conv.chatbot_id === selectedChatbot
    return matchesSearch && matchesChatbot
  })

  if (error) {
    return <ErrorFallback error={error} />
  }

  try {
    return (
      <div className="min-h-screen bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto p-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Link 
              href="/dashboard" 
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                Conversations
              </h1>
              <p className="text-slate-400 mt-1">Monitor chatbot interactions and visitor engagement</p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-slate-800 rounded-xl p-6 mb-8">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search conversations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-slate-400"
                  />
                </div>
              </div>
              <div className="lg:w-64">
                <div className="relative">
                  <Filter className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                  <select
                    value={selectedChatbot}
                    onChange={(e) => setSelectedChatbot(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white appearance-none cursor-pointer"
                  >
                    <option value="">All Chatbots</option>
                    {chatbots.map(bot => (
                      <option key={bot.id} value={bot.id}>{bot.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="bg-slate-800 rounded-xl p-8 text-center">
              <LoadingSpinner />
              <p className="text-slate-400 mt-4">Loading conversations...</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredConversations.length === 0 && (
            <div className="bg-slate-800 rounded-xl p-12 text-center">
              <MessageCircle className="h-16 w-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No conversations yet</h3>
              <p className="text-slate-400 max-w-md mx-auto">
                {searchTerm || selectedChatbot 
                  ? "No conversations match your current filters. Try adjusting your search or filter criteria."
                  : "Your chatbots haven't had any conversations yet. Once visitors start chatting, they'll appear here."
                }
              </p>
              {(searchTerm || selectedChatbot) && (
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setSelectedChatbot('')
                  }}
                  className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}

          {/* Conversations Table */}
          {!loading && filteredConversations.length > 0 && (
            <div className="bg-slate-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-700">
                    <tr>
                      <th className="text-left py-4 px-6 font-semibold text-slate-300">
                        <div className="flex items-center gap-2">
                          <Bot className="h-4 w-4" />
                          Chatbot
                        </div>
                      </th>
                      <th className="text-left py-4 px-6 font-semibold text-slate-300">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Visitor Message
                        </div>
                      </th>
                      <th className="text-left py-4 px-6 font-semibold text-slate-300">Response</th>
                      <th className="text-left py-4 px-6 font-semibold text-slate-300">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Date
                        </div>
                      </th>
                      <th className="text-left py-4 px-6 font-semibold text-slate-300">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Duration
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {filteredConversations.map((conversation, index) => (
                      <tr key={conversation.id} className="hover:bg-slate-700/50 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
                              <Bot className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <div className="font-medium text-white">{conversation.chatbot_name}</div>
                              <div className="text-sm text-slate-400">ID: {conversation.chatbot_id.slice(0, 8)}...</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="max-w-xs">
                            <p className="text-white truncate" title={conversation.visitor_message}>
                              {conversation.visitor_message}
                            </p>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="max-w-md">
                            <p className="text-slate-300 truncate" title={conversation.bot_response}>
                              {conversation.bot_response}
                            </p>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-slate-300">
                            {formatDate(conversation.created_at)}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-slate-400" />
                            <span className="text-slate-300">
                              {formatDuration(conversation.duration_seconds)}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Stats Footer */}
              <div className="bg-slate-700 px-6 py-4 border-t border-slate-600">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="text-slate-300">
                    Showing {filteredConversations.length} conversation{filteredConversations.length !== 1 ? 's' : ''}
                  </div>
                  <div className="flex items-center gap-6 text-sm text-slate-400">
                    <div>
                      Avg Duration: {
                        filteredConversations.length > 0
                          ? formatDuration(Math.round(filteredConversations.reduce((sum, c) => sum + c.duration_seconds, 0) / filteredConversations.length))
                          : '0s'
                      }
                    </div>
                    <div>
                      Total Interactions: {filteredConversations.length}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  } catch (e) {
    return <ErrorFallback error={(e as Error).message} />
  }
}