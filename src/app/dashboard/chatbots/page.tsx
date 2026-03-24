'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Plus, Edit, Trash2, Globe, MessageSquare, Power, PowerOff, Calendar, Loader2, X } from 'lucide-react'

function ErrorFallback({ error }: { error: string }) {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-8">
      <div className="text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl p-6 max-w-md">
        <h2 className="text-lg font-bold mb-2">Something went wrong</h2>
        <p className="text-sm">{error}</p>
      </div>
    </div>
  )
}

interface Chatbot {
  id: string
  user_id: string
  name: string
  description: string
  website_url: string
  welcome_message: string
  is_active: boolean
  created_at: string
}

export default function ChatbotsPage() {
  const [error, setError] = useState<string>('')
  const [chatbots, setChatbots] = useState<Chatbot[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [toggleLoading, setToggleLoading] = useState<string>('')
  const [deleteLoading, setDeleteLoading] = useState<string>('')

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    website_url: '',
    welcome_message: ''
  })

  const supabase = useMemo(() => 
    createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!), 
    []
  )

  const fetchChatbots = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('chatbots')
        .select('*')
        .order('created_at', { ascending: false })

      console.log('Supabase response:', data, error)

      if (error) {
        setError(error.message)
        console.error('Supabase error:', error)
        return
      }

      setChatbots(data || [])
    } catch (err) {
      const message = (err as Error).message
      setError(message)
      console.error('Fetch chatbots error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchChatbots()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.description.trim()) {
      setError('Name and description are required')
      return
    }

    try {
      setFormLoading(true)
      setError('')
      
      const { data, error } = await supabase
        .from('chatbots')
        .insert({
          name: formData.name.trim(),
          description: formData.description.trim(),
          website_url: formData.website_url.trim() || null,
          welcome_message: formData.welcome_message.trim() || 'Hello! How can I help you today?',
          is_active: true,
          user_id: 'current_user' // In real app, get from auth
        })
        .select()

      console.log('Supabase response:', data, error)

      if (error) {
        setError(error.message)
        console.error('Supabase error:', error)
        return
      }

      // Reset form and close modal
      setFormData({
        name: '',
        description: '',
        website_url: '',
        welcome_message: ''
      })
      setShowCreateModal(false)

      // Refresh the list
      await fetchChatbots()
    } catch (err) {
      const message = (err as Error).message
      setError(message)
      console.error('Create chatbot error:', err)
    } finally {
      setFormLoading(false)
    }
  }

  const handleToggleActive = async (chatbotId: string, currentStatus: boolean) => {
    try {
      setToggleLoading(chatbotId)
      setError('')

      const { data, error } = await supabase
        .from('chatbots')
        .update({ is_active: !currentStatus })
        .eq('id', chatbotId)
        .select()

      console.log('Supabase response:', data, error)

      if (error) {
        setError(error.message)
        console.error('Supabase error:', error)
        return
      }

      // Update local state
      setChatbots(prev => prev.map(bot => 
        bot.id === chatbotId ? { ...bot, is_active: !currentStatus } : bot
      ))
    } catch (err) {
      const message = (err as Error).message
      setError(message)
      console.error('Toggle chatbot error:', err)
    } finally {
      setToggleLoading('')
    }
  }

  const handleDelete = async (chatbotId: string) => {
    if (!confirm('Are you sure you want to delete this chatbot? This action cannot be undone.')) {
      return
    }

    try {
      setDeleteLoading(chatbotId)
      setError('')

      const { error } = await supabase
        .from('chatbots')
        .delete()
        .eq('id', chatbotId)

      console.log('Supabase response:', error)

      if (error) {
        setError(error.message)
        console.error('Supabase error:', error)
        return
      }

      // Remove from local state
      setChatbots(prev => prev.filter(bot => bot.id !== chatbotId))
    } catch (err) {
      const message = (err as Error).message
      setError(message)
      console.error('Delete chatbot error:', err)
    } finally {
      setDeleteLoading('')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  try {
    if (error) {
      return <ErrorFallback error={error} />
    }

    return (
      <div className="min-h-screen bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">AI Chatbots</h1>
              <p className="text-slate-400">
                Manage your intelligent customer support chatbots
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <Plus className="w-5 h-5" />
              Create New Chatbot
            </button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            </div>
          )}

          {/* Empty State */}
          {!loading && chatbots.length === 0 && (
            <div className="text-center py-12">
              <MessageSquare className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No chatbots yet</h3>
              <p className="text-slate-400 mb-6">
                Create your first AI chatbot to start automating customer support
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200"
              >
                Create Your First Chatbot
              </button>
            </div>
          )}

          {/* Chatbots Grid */}
          {!loading && chatbots.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {chatbots.map((chatbot) => (
                <div
                  key={chatbot.id}
                  className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 hover:bg-slate-800/70 transition-all duration-200"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-1">
                        {chatbot.name}
                      </h3>
                      <p className="text-sm text-slate-400 line-clamp-2">
                        {chatbot.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 ml-4">
                      {chatbot.is_active ? (
                        <div className="flex items-center gap-1 text-green-400">
                          <Power className="w-4 h-4" />
                          <span className="text-xs font-medium">Active</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-slate-500">
                          <PowerOff className="w-4 h-4" />
                          <span className="text-xs font-medium">Inactive</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Website URL */}
                  {chatbot.website_url && (
                    <div className="flex items-center gap-2 mb-3">
                      <Globe className="w-4 h-4 text-slate-400" />
                      <a
                        href={chatbot.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-400 hover:text-blue-300 truncate"
                      >
                        {chatbot.website_url}
                      </a>
                    </div>
                  )}

                  {/* Welcome Message */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-400">Welcome Message</span>
                    </div>
                    <p className="text-sm text-slate-300 bg-slate-700/50 p-3 rounded-lg line-clamp-2">
                      {chatbot.welcome_message}
                    </p>
                  </div>

                  {/* Created Date */}
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-400">
                      Created {formatDate(chatbot.created_at)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleActive(chatbot.id, chatbot.is_active)}
                      disabled={toggleLoading === chatbot.id}
                      className={`flex-1 px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                        chatbot.is_active
                          ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
                          : 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30'
                      } disabled:opacity-50`}
                    >
                      {toggleLoading === chatbot.id ? (
                        <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                      ) : chatbot.is_active ? (
                        'Deactivate'
                      ) : (
                        'Activate'
                      )}
                    </button>
                    
                    <button
                      onClick={() => {/* TODO: Edit functionality */}}
                      className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/20 rounded-lg transition-all duration-200"
                      title="Edit chatbot"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => handleDelete(chatbot.id)}
                      disabled={deleteLoading === chatbot.id}
                      className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-all duration-200 disabled:opacity-50"
                      title="Delete chatbot"
                    >
                      {deleteLoading === chatbot.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Create Modal */}
          {showCreateModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg">
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                  <h2 className="text-xl font-semibold text-white">Create New Chatbot</h2>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-700 transition-all duration-200"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Chatbot Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Enter chatbot name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Description *
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                      placeholder="Describe what this chatbot does"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Website URL
                    </label>
                    <input
                      type="url"
                      value={formData.website_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, website_url: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="https://example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Welcome Message
                    </label>
                    <textarea
                      value={formData.welcome_message}
                      onChange={(e) => setFormData(prev => ({ ...prev, welcome_message: e.target.value }))}
                      rows={2}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                      placeholder="Hello! How can I help you today?"
                    />
                  </div>

                  {error && (
                    <div className="text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg p-3 text-sm">
                      {error}
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-all duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={formLoading}
                      className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 text-white px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      {formLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Plus className="w-5 h-5" />
                          Create Chatbot
                        </>
                      )}
                    </button>
                  </div>
                </form>
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