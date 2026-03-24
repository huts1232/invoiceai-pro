'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { User, Bell, Trash2, Save, Settings, ArrowLeft, Shield, Eye, EyeOff } from 'lucide-react'

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

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
    </div>
  )
}

function ConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message,
  isLoading 
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  isLoading: boolean
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full border border-slate-700">
        <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
        <p className="text-slate-300 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? <LoadingSpinner /> : <Trash2 className="h-4 w-4" />}
            Delete Account
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  
  // Profile form data
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  // Notification settings
  const [notifications, setNotifications] = useState({
    emailInvoices: true,
    emailApprovals: true,
    emailIntegrations: false,
    pushInvoices: true,
    pushApprovals: true,
    weeklyReports: true,
    monthlyReports: false
  })

  const router = useRouter()
  
  const supabase = useMemo(() => 
    createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!), 
    []
  )

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    try {
      setLoading(true)
      
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      console.log('Auth user:', user, userError)
      
      if (userError) {
        setError(userError.message)
        return
      }
      
      if (!user) {
        router.push('/login')
        return
      }

      setUserEmail(user.email || '')
      setProfileData({
        name: user.user_metadata?.name || user.email?.split('@')[0] || '',
        email: user.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })

      // Load user preferences from users_data table if exists
      const { data: userData, error: dataError } = await supabase
        .from('users_data')
        .select('*')
        .eq('user_id', user.id)
        .single()

      console.log('User data:', userData, dataError)
      
      if (dataError && dataError.code !== 'PGRST116') {
        console.error('Error loading user data:', dataError)
      }

    } catch (err) {
      console.error('Load user data error:', err)
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleProfileSave = async () => {
    try {
      setSaving(true)
      
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        setError('Authentication required')
        return
      }

      // Update profile metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: { name: profileData.name }
      })

      if (updateError) {
        setError(updateError.message)
        return
      }

      // Update password if provided
      if (profileData.newPassword) {
        if (profileData.newPassword !== profileData.confirmPassword) {
          setError('New passwords do not match')
          return
        }

        const { error: passwordError } = await supabase.auth.updateUser({
          password: profileData.newPassword
        })

        if (passwordError) {
          setError(passwordError.message)
          return
        }
      }

      // Ensure user_data record exists
      const { error: upsertError } = await supabase
        .from('users_data')
        .upsert({
          user_id: user.id,
          created_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })

      console.log('Upsert result:', upsertError)

      alert('Profile updated successfully!')
      
      // Clear password fields
      setProfileData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }))

    } catch (err) {
      console.error('Profile save error:', err)
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleNotificationsSave = async () => {
    try {
      setSaving(true)
      
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        setError('Authentication required')
        return
      }

      // In a real app, you'd save these to a preferences table
      // For now, we'll just simulate the save
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      alert('Notification preferences saved!')

    } catch (err) {
      console.error('Notifications save error:', err)
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    try {
      setDeleting(true)
      
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        setError('Authentication required')
        return
      }

      // Delete all user data
      const tables = [
        'approval_requests',
        'approval_workflows', 
        'accounting_integrations',
        'currency_rates',
        'email_accounts',
        'invoice_line_items',
        'invoices',
        'chatbots',
        'users_data'
      ]

      for (const table of tables) {
        const { error: deleteError } = await supabase
          .from(table)
          .delete()
          .eq('user_id', user.id)
        
        if (deleteError) {
          console.error(`Error deleting from ${table}:`, deleteError)
        }
      }

      // Sign out (cannot delete auth user from client)
      await supabase.auth.signOut()
      
      alert('Account data deleted successfully. Please contact support to permanently delete your account.')
      router.push('/')

    } catch (err) {
      console.error('Delete account error:', err)
      setError((err as Error).message)
    } finally {
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  if (error) {
    return <ErrorFallback error={error} />
  }

  try {
    return (
      <div className="min-h-screen bg-slate-900 text-white">
        {/* Header */}
        <div className="bg-slate-800 border-b border-slate-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <Link 
                  href="/dashboard"
                  className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Dashboard
                </Link>
              </div>
              <div className="flex items-center gap-3">
                <Settings className="h-5 w-5 text-purple-400" />
                <h1 className="text-xl font-bold">Settings</h1>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-6">
          {loading ? (
            <LoadingSpinner />
          ) : (
            <>
              {/* Tabs */}
              <div className="flex gap-1 mb-8 bg-slate-800 p-1 rounded-lg">
                {[
                  { id: 'profile', label: 'Profile', icon: User },
                  { id: 'notifications', label: 'Notifications', icon: Bell },
                  { id: 'danger', label: 'Danger Zone', icon: Shield }
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors flex-1 justify-center ${
                      activeTab === id
                        ? 'bg-purple-600 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                  <div className="flex items-center gap-3 mb-6">
                    <User className="h-5 w-5 text-purple-400" />
                    <h2 className="text-xl font-bold">Profile Settings</h2>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Display Name
                        </label>
                        <input
                          type="text"
                          value={profileData.name}
                          onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="Your name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={profileData.email}
                          readOnly
                          className="w-full p-3 bg-slate-600 border border-slate-600 rounded-lg text-slate-400 cursor-not-allowed"
                        />
                        <p className="text-xs text-slate-400 mt-1">Email cannot be changed</p>
                      </div>
                    </div>

                    <div className="border-t border-slate-700 pt-6">
                      <h3 className="text-lg font-semibold mb-4">Change Password</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Current Password
                          </label>
                          <div className="relative">
                            <input
                              type={showPassword ? "text" : "password"}
                              value={profileData.currentPassword}
                              onChange={(e) => setProfileData(prev => ({ ...prev, currentPassword: e.target.value }))}
                              className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-10"
                              placeholder="Enter current password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white"
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                              New Password
                            </label>
                            <input
                              type="password"
                              value={profileData.newPassword}
                              onChange={(e) => setProfileData(prev => ({ ...prev, newPassword: e.target.value }))}
                              className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              placeholder="New password"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                              Confirm Password
                            </label>
                            <input
                              type="password"
                              value={profileData.confirmPassword}
                              onChange={(e) => setProfileData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                              className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              placeholder="Confirm new password"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={handleProfileSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {saving ? <LoadingSpinner /> : <Save className="h-4 w-4" />}
                        Save Changes
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                  <div className="flex items-center gap-3 mb-6">
                    <Bell className="h-5 w-5 text-purple-400" />
                    <h2 className="text-xl font-bold">Notification Preferences</h2>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Email Notifications</h3>
                      <div className="space-y-4">
                        {[
                          { key: 'emailInvoices', label: 'New invoices processed', description: 'Get notified when new invoices are uploaded or extracted' },
                          { key: 'emailApprovals', label: 'Approval requests', description: 'Receive email when invoices need approval' },
                          { key: 'emailIntegrations', label: 'Integration sync status', description: 'Updates about accounting software synchronization' }
                        ].map(({ key, label, description }) => (
                          <div key={key} className="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
                            <div>
                              <h4 className="font-medium text-white">{label}</h4>
                              <p className="text-sm text-slate-400">{description}</p>
                            </div>
                            <button
                              onClick={() => setNotifications(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                notifications[key as keyof typeof notifications] ? 'bg-purple-600' : 'bg-slate-600'
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  notifications[key as keyof typeof notifications] ? 'translate-x-6' : 'translate-x-1'
                                }`}
                              />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-4">Push Notifications</h3>
                      <div className="space-y-4">
                        {[
                          { key: 'pushInvoices', label: 'Invoice updates', description: 'Real-time notifications for invoice status changes' },
                          { key: 'pushApprovals', label: 'Approval alerts', description: 'Instant notifications for approval requests' }
                        ].map(({ key, label, description }) => (
                          <div key={key} className="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
                            <div>
                              <h4 className="font-medium text-white">{label}</h4>
                              <p className="text-sm text-slate-400">{description}</p>
                            </div>
                            <button
                              onClick={() => setNotifications(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                notifications[key as keyof typeof notifications] ? 'bg-purple-600' : 'bg-slate-600'
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  notifications[key as keyof typeof notifications] ? 'translate-x-6' : 'translate-x-1'
                                }`}
                              />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-4">Reports</h3>
                      <div className="space-y-4">
                        {[
                          { key: 'weeklyReports', label: 'Weekly summary', description: 'Get weekly reports of your invoice activity' },
                          { key: 'monthlyReports', label: 'Monthly analytics', description: 'Detailed monthly reports with insights and trends' }
                        ].map(({ key, label, description }) => (
                          <div key={key} className="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
                            <div>
                              <h4 className="font-medium text-white">{label}</h4>
                              <p className="text-sm text-slate-400">{description}</p>
                            </div>
                            <button
                              onClick={() => setNotifications(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                notifications[key as keyof typeof notifications] ? 'bg-purple-600' : 'bg-slate-600'
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  notifications[key as keyof typeof notifications] ? 'translate-x-6' : 'translate-x-1'
                                }`}
                              />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={handleNotificationsSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {saving ? <LoadingSpinner /> : <Save className="h-4 w-4" />}
                        Save Preferences
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Danger Zone Tab */}
              {activeTab === 'danger' && (
                <div className="bg-slate-800 rounded-xl p-6 border border-red-500/20">
                  <div className="flex items-center gap-3 mb-6">
                    <Shield className="h-5 w-5 text-red-400" />
                    <h2 className="text-xl font-bold text-red-400">Danger Zone</h2>
                  </div>

                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-red-400 mb-2">Delete Account</h3>
                        <div className="text-slate-300 space-y-2">
                          <p>Permanently delete your account and all associated data.</p>
                          <p className="text-sm text-slate-400">This action will:</p>
                          <ul className="text-sm text-slate-400 list-disc list-inside space-y-1">
                            <li>Delete all your invoices and line items</li>
                            <li>Remove all approval workflows and requests</li>
                            <li>Delete integration settings and sync data</li>
                            <li>Remove all email account connections</li>
                            <li>Delete all chatbots and configurations</li>
                          </ul>
                          <p className="text-sm font-medium text-red-400">This action cannot be undone.</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowDeleteModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete Account
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteAccount}
          title="Delete Account"
          message="Are you absolutely sure? This will permanently delete your account and all data. This action cannot be undone."
          isLoading={deleting}
        />
      </div>
    )
  } catch (e) {
    return <ErrorFallback error={(e as Error).message} />
  }
}