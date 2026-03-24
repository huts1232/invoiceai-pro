'use client'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { Users, DollarSign, FileText, Activity, Trash2, Shield } from 'lucide-react'

function ErrorFallback({ error }: { error: string }) {
  return <div className="min-h-screen bg-slate-900 flex items-center justify-center p-8"><div className="text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl p-6 max-w-md"><h2 className="text-lg font-bold mb-2">Something went wrong</h2><p className="text-sm">{error}</p></div></div>
}

interface User {
  id: string
  email: string
  created_at: string
}

interface UserData {
  id: string
  user_id: string
  created_at: string
}

interface Invoice {
  id: string
  user_id: string
  invoice_number: string
  vendor_name: string
  total_amount: number
  currency: string
  status: string
  created_at: string
}

interface Stats {
  totalUsers: number
  totalRevenue: number
  totalInvoices: number
  activeUsers: number
}

export default function AdminPage() {
  const [error, setError] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthChecking, setIsAuthChecking] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [userDataList, setUserDataList] = useState<UserData[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalRevenue: 0,
    totalInvoices: 0,
    activeUsers: 0
  })
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const router = useRouter()

  const supabase = useMemo(() => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), [])

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        console.log('Auth check:', user, error)
        
        if (error || !user) {
          router.push('/login')
          return
        }

        // Check if user is admin (you can implement admin role check here)
        setIsAuthChecking(false)
        loadData()
      } catch (err) {
        console.error('Auth check error:', err)
        router.push('/login')
      }
    }

    checkAuth()
  }, [supabase, router])

  const loadData = async () => {
    setIsLoading(true)
    try {
      // Load users from auth.users
      const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers()
      console.log('Users response:', usersData, usersError)

      if (usersError) {
        console.error('Users error:', usersError)
        // Fallback: try to get from users_data table
        const { data: fallbackUsers, error: fallbackError } = await supabase
          .from('users_data')
          .select('*')
          .order('created_at', { ascending: false })
        
        if (fallbackError) {
          setError('Failed to load users: ' + fallbackError.message)
        } else {
          setUserDataList(fallbackUsers || [])
        }
      } else {
        setUsers(usersData?.users || [])
      }

      // Load user data
      const { data: userData, error: userDataError } = await supabase
        .from('users_data')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (userDataError) {
        console.error('User data error:', userDataError)
      } else {
        setUserDataList(userData || [])
      }

      // Load invoices for stats
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (invoicesError) {
        console.error('Invoices error:', invoicesError)
      } else {
        setInvoices(invoicesData || [])
      }

      // Calculate stats
      const { data: allInvoices, error: allInvoicesError } = await supabase
        .from('invoices')
        .select('total_amount, currency, user_id')
      
      if (!allInvoicesError && allInvoices) {
        const totalRevenue = allInvoices.reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0)
        const uniqueUsers = new Set(allInvoices.map(inv => inv.user_id)).size
        
        setStats({
          totalUsers: userDataList.length || users.length,
          totalRevenue,
          totalInvoices: allInvoices.length,
          activeUsers: uniqueUsers
        })
      }

    } catch (err) {
      console.error('Load data error:', err)
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This will delete all their data.')) {
      return
    }

    try {
      // Delete user data
      const { error: userDataError } = await supabase
        .from('users_data')
        .delete()
        .eq('user_id', userId)

      if (userDataError) {
        console.error('Delete user data error:', userDataError)
        alert('Error deleting user data: ' + userDataError.message)
        return
      }

      // Delete invoices
      const { error: invoicesError } = await supabase
        .from('invoices')
        .delete()
        .eq('user_id', userId)

      if (invoicesError) {
        console.error('Delete invoices error:', invoicesError)
      }

      // Try to delete from auth (requires admin privileges)
      const { error: authError } = await supabase.auth.admin.deleteUser(userId)
      if (authError) {
        console.error('Delete auth user error:', authError)
      }

      loadData()
    } catch (err) {
      console.error('Delete user error:', err)
      alert('Error deleting user: ' + (err as Error).message)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedUsers.size === 0) return
    
    if (!confirm(`Are you sure you want to delete ${selectedUsers.size} users? This cannot be undone.`)) {
      return
    }

    try {
      for (const userId of selectedUsers) {
        await handleDeleteUser(userId)
      }
      setSelectedUsers(new Set())
    } catch (err) {
      console.error('Bulk delete error:', err)
      alert('Error during bulk delete: ' + (err as Error).message)
    }
  }

  if (error) return <ErrorFallback error={error} />

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  try {
    return (
      <div className="min-h-screen bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto p-8">
          <div className="flex items-center gap-3 mb-8">
            <Shield className="h-8 w-8 text-purple-400" />
            <div>
              <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
              <p className="text-slate-400 mt-1">Manage InvoiceAI Pro platform</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-blue-400" />
                <div>
                  <p className="text-slate-400 text-sm">Total Users</p>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <div className="flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-green-400" />
                <div>
                  <p className="text-slate-400 text-sm">Total Revenue</p>
                  <p className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-purple-400" />
                <div>
                  <p className="text-slate-400 text-sm">Total Invoices</p>
                  <p className="text-2xl font-bold">{stats.totalInvoices}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <div className="flex items-center gap-3">
                <Activity className="h-8 w-8 text-orange-400" />
                <div>
                  <p className="text-slate-400 text-sm">Active Users</p>
                  <p className="text-2xl font-bold">{stats.activeUsers}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-400" />
                  Users Management
                </h2>
                {selectedUsers.size > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Selected ({selectedUsers.size})
                  </button>
                )}
              </div>
            </div>

            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                <p className="text-slate-400 mt-2">Loading users...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-700">
                    <tr>
                      <th className="text-left p-4">
                        <input
                          type="checkbox"
                          checked={selectedUsers.size > 0 && selectedUsers.size === (users.length || userDataList.length)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              const allIds = users.length ? users.map(u => u.id) : userDataList.map(u => u.user_id)
                              setSelectedUsers(new Set(allIds))
                            } else {
                              setSelectedUsers(new Set())
                            }
                          }}
                          className="rounded"
                        />
                      </th>
                      <th className="text-left p-4 text-slate-300">Email</th>
                      <th className="text-left p-4 text-slate-300">Joined</th>
                      <th className="text-left p-4 text-slate-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length > 0 ? (
                      users.map((user) => (
                        <tr key={user.id} className="border-t border-slate-700 hover:bg-slate-700/50">
                          <td className="p-4">
                            <input
                              type="checkbox"
                              checked={selectedUsers.has(user.id)}
                              onChange={(e) => {
                                const newSelected = new Set(selectedUsers)
                                if (e.target.checked) {
                                  newSelected.add(user.id)
                                } else {
                                  newSelected.delete(user.id)
                                }
                                setSelectedUsers(newSelected)
                              }}
                              className="rounded"
                            />
                          </td>
                          <td className="p-4">{user.email}</td>
                          <td className="p-4 text-slate-400">
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-4">
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-red-400 hover:text-red-300 p-2 hover:bg-red-400/10 rounded-lg transition-colors"
                              title="Delete User"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : userDataList.length > 0 ? (
                      userDataList.map((userData) => (
                        <tr key={userData.id} className="border-t border-slate-700 hover:bg-slate-700/50">
                          <td className="p-4">
                            <input
                              type="checkbox"
                              checked={selectedUsers.has(userData.user_id)}
                              onChange={(e) => {
                                const newSelected = new Set(selectedUsers)
                                if (e.target.checked) {
                                  newSelected.add(userData.user_id)
                                } else {
                                  newSelected.delete(userData.user_id)
                                }
                                setSelectedUsers(newSelected)
                              }}
                              className="rounded"
                            />
                          </td>
                          <td className="p-4">{userData.user_id}</td>
                          <td className="p-4 text-slate-400">
                            {new Date(userData.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-4">
                            <button
                              onClick={() => handleDeleteUser(userData.user_id)}
                              className="text-red-400 hover:text-red-300 p-2 hover:bg-red-400/10 rounded-lg transition-colors"
                              title="Delete User"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-slate-400">
                          No users found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 mt-8">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Activity className="h-5 w-5 text-purple-400" />
                Recent Invoices
              </h2>
            </div>

            {invoices.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-700">
                    <tr>
                      <th className="text-left p-4 text-slate-300">Invoice #</th>
                      <th className="text-left p-4 text-slate-300">Vendor</th>
                      <th className="text-left p-4 text-slate-300">Amount</th>
                      <th className="text-left p-4 text-slate-300">Status</th>
                      <th className="text-left p-4 text-slate-300">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice) => (
                      <tr key={invoice.id} className="border-t border-slate-700 hover:bg-slate-700/50">
                        <td className="p-4 font-mono">{invoice.invoice_number}</td>
                        <td className="p-4">{invoice.vendor_name || 'Unknown Vendor'}</td>
                        <td className="p-4">
                          {invoice.total_amount ? `${invoice.currency || 'USD'} ${invoice.total_amount.toLocaleString()}` : 'N/A'}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                            invoice.status === 'paid' ? 'bg-green-400/10 text-green-400' :
                            invoice.status === 'pending' ? 'bg-yellow-400/10 text-yellow-400' :
                            'bg-slate-400/10 text-slate-400'
                          }`}>
                            {invoice.status || 'draft'}
                          </span>
                        </td>
                        <td className="p-4 text-slate-400">
                          {new Date(invoice.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400">
                No recent invoices found
              </div>
            )}
          </div>
        </div>
      </div>
    )
  } catch (e) {
    return <ErrorFallback error={(e as Error).message} />
  }
}