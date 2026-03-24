'use client'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { User, Settings, Shield, AlertTriangle, Trash2, CreditCard, User2 } from 'lucide-react'

function ErrorFallback({ error }: { error: string }) {
  return <div className="min-h-screen bg-slate-900 flex items-center justify-center p-8"><div className="text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl p-6 max-w-md"><h2 className="text-lg font-bold mb-2">Something went wrong</h2><p className="text-sm">{error}</p></div></div>
}

function Spinner() {
  return <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
}

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null)
  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [updatingProfile, setUpdatingProfile] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [profileForm, setProfileForm] = useState({ name: '', email: '' })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const router = useRouter()

  const supabase = useMemo(() => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!), [])

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    try {
      setLoading(true)
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error) {
        console.error('Auth error:', error)
        router.push('/login')
        return
      }

      if (!user) {
        router.push('/login')
        return
      }

      setUser(user)
      setProfileForm({ 
        name: user.user_metadata?.name || user.email?.split('@')[0] || '',
        email: user.email || ''
      })

      // Fetch user data from users_data table
      const { data: userDataResponse, error: userDataError } = await supabase
        .from('users_data')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (userDataError && userDataError.code !== 'PGRST116') {
        console.error('User data error:', userDataError)
      } else {
        setUserData(userDataResponse)
      }

    } catch (err) {
      console.error('Check user error:', err)
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function updateProfile(e: React.FormEvent) {
    e.preventDefault()
    try {
      setUpdatingProfile(true)
      
      const { error } = await supabase.auth.updateUser({
        data: { name: profileForm.name }
      })

      if (error) {
        console.error('Update profile error:', error)
        setError(error.message)
        return
      }

      // Update local state
      setUser(prev => ({
        ...prev,
        user_metadata: { ...prev.user_metadata, name: profileForm.name }
      }))

      alert('Profile updated successfully!')

    } catch (err) {
      console.error('Update profile error:', err)
      setError((err as Error).message)
    } finally {
      setUpdatingProfile(false)
    }
  }

  async function deleteAccount() {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true)
      return
    }

    try {
      setDeletingAccount(true)

      // Delete user data (cascade should handle related records)
      if (user) {
        const { error: deleteError } = await supabase
          .from('users_data')
          .delete()
          .eq('user_id', user.id)

        if (deleteError) {
          console.error('Delete user data error:', deleteError)
        }
      }

      // Sign out user
      await supabase.auth.signOut()
      
      alert('Account deleted successfully. You will be redirected to the homepage.')
      router.push('/')

    } catch (err) {
      console.error('Delete account error:', err)
      setError((err as Error).message)
    } finally {
      setDeletingAccount(false)
      setShowDeleteConfirm(false)
    }
  }

  if (error) {
    return <ErrorFallback error={error} />
  }

  try {
    return (
      <div className="min-h-screen bg-slate-900 text-white">
        {/* Header */}
        <div className="border-b border-slate-700 bg-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <Settings className="h-8 w-8 text-purple-500" />
                <h1 className="text-2xl font-bold">Settings</h1>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-6 space-y-8">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner />
            </div>
          ) : (
            <>
              {/* Profile Section */}
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <User2 className="h-6 w-6 text-purple-500" />
                  <h2 className="text-xl font-semibold">Profile Information</h2>
                </div>

                <form onSubmit={updateProfile} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Enter your name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={profileForm.email}
                      disabled
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-slate-400 cursor-not-allowed"
                    />
                    <p className="text-xs text-slate-400 mt-1">Email cannot be changed</p>
                  </div>

                  <button
                    type="submit"
                    disabled={updatingProfile}
                    className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center space-x-2"
                  >
                    {updatingProfile ? <Spinner /> : <User className="h-4 w-4" />}
                    <span>{updatingProfile ? 'Updating...' : 'Update Profile'}</span>
                  </button>
                </form>
              </div>

              {/* Plan Information */}
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <CreditCard className="h-6 w-6 text-blue-500" />
                  <h2 className="text-xl font-semibold">Subscription Plan</h2>
                </div>

                <div className="bg-slate-700 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">InvoiceAI Pro</h3>
                      <p className="text-slate-300">AI-powered invoice automation</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">$29</div>
                      <div className="text-sm text-slate-400">per month</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-slate-300">
                  <div className="flex items-center justify-between">
                    <span>Status</span>
                    <span className="text-green-400 font-medium">Active</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Next billing date</span>
                    <span>{new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Member since</span>
                    <span>{userData ? new Date(userData.created_at).toLocaleDateString() : 'N/A'}</span>
                  </div>
                </div>

                <button
                  onClick={() => alert('Billing management coming soon!')}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Manage Billing
                </button>
              </div>

              {/* Security Section */}
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <Shield className="h-6 w-6 text-green-500" />
                  <h2 className="text-xl font-semibold">Security</h2>
                </div>

                <div className="space-y-4">
                  <button
                    onClick={() => alert('Password change coming soon!')}
                    className="w-full bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white font-medium py-3 px-4 rounded-lg transition-colors text-left"
                  >
                    Change Password
                  </button>
                  
                  <button
                    onClick={() => alert('Two-factor authentication coming soon!')}
                    className="w-full bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white font-medium py-3 px-4 rounded-lg transition-colors text-left"
                  >
                    Enable Two-Factor Authentication
                  </button>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                  <h2 className="text-xl font-semibold text-red-400">Danger Zone</h2>
                </div>

                <p className="text-slate-300 mb-4">
                  Once you delete your account, there is no going back. Please be certain.
                </p>

                {!showDeleteConfirm ? (
                  <button
                    onClick={deleteAccount}
                    className="bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete Account</span>
                  </button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-red-400 font-medium">
                      Are you absolutely sure? This action cannot be undone.
                    </p>
                    <div className="flex space-x-3">
                      <button
                        onClick={deleteAccount}
                        disabled={deletingAccount}
                        className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center space-x-2"
                      >
                        {deletingAccount ? <Spinner /> : <Trash2 className="h-4 w-4" />}
                        <span>{deletingAccount ? 'Deleting...' : 'Yes, Delete Account'}</span>
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="bg-slate-600 hover:bg-slate-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    )
  } catch (e) {
    return <ErrorFallback error={(e as Error).message} />
  }
}