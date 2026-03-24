'use client'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Home, 
  FileText, 
  Upload, 
  Mail, 
  CheckCircle, 
  Settings, 
  Plus, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  Users,
  X,
  Loader2
} from 'lucide-react'

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
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
    </div>
  )
}

interface Invoice {
  id: string
  invoice_number: string
  vendor_name: string
  total_amount: number
  currency: string
  status: string
  approval_status: string
  due_date: string
  created_at: string
}

interface Stats {
  totalInvoices: number
  pendingApprovals: number
  totalAmount: number
  monthlyAmount: number
}

export default function DashboardPage() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState<Stats>({ totalInvoices: 0, pendingApprovals: 0, totalAmount: 0, monthlyAmount: 0 })
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const router = useRouter()

  const supabase = useMemo(() => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), [])

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (user) {
      fetchStats()
      fetchRecentInvoices()
    }
  }, [user])

  const checkAuth = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      console.log('Auth check:', user, error)
      
      if (error || !user) {
        router.push('/login')
        return
      }
      
      setUser(user)
      setLoading(false)
    } catch (err) {
      console.error('Auth error:', err)
      setError((err as Error).message)
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('total_amount, currency, approval_status, created_at')
        .eq('user_id', user?.id)
      
      console.log('Stats response:', invoices, error)
      
      if (error) {
        console.error('Stats error:', error)
        return
      }

      if (invoices) {
        const totalInvoices = invoices.length
        const pendingApprovals = invoices.filter(inv => inv.approval_status === 'pending').length
        const totalAmount = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0)
        
        const currentMonth = new Date().getMonth()
        const currentYear = new Date().getFullYear()
        const monthlyAmount = invoices
          .filter(inv => {
            const date = new Date(inv.created_at)
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear
          })
          .reduce((sum, inv) => sum + (inv.total_amount || 0), 0)

        setStats({ totalInvoices, pendingApprovals, totalAmount, monthlyAmount })
      }
    } catch (err) {
      console.error('Fetch stats error:', err)
    }
  }

  const fetchRecentInvoices = async () => {
    try {
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5)
      
      console.log('Recent invoices response:', invoices, error)
      
      if (error) {
        console.error('Recent invoices error:', error)
        return
      }

      if (invoices) {
        setRecentInvoices(invoices)
      }
    } catch (err) {
      console.error('Fetch recent invoices error:', err)
    }
  }

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateLoading(true)
    
    try {
      const formData = new FormData(e.target as HTMLFormElement)
      const invoiceData = {
        user_id: user?.id,
        invoice_number: `INV-${Date.now()}`,
        vendor_name: formData.get('vendorName') as string,
        vendor_email: formData.get('vendorEmail') as string,
        total_amount: parseFloat(formData.get('totalAmount') as string),
        currency: 'USD',
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: formData.get('dueDate') as string,
        status: 'draft',
        approval_status: 'pending',
        category: formData.get('category') as string,
        notes: formData.get('notes') as string,
        source_type: 'manual'
      }

      const { data, error } = await supabase
        .from('invoices')
        .insert(invoiceData)
        .select()
        .single()

      console.log('Create invoice response:', data, error)

      if (error) {
        setError(error.message)
        console.error('Create invoice error:', error)
        return
      }

      setShowCreateModal(false)
      await fetchStats()
      await fetchRecentInvoices()
      
      const form = e.target as HTMLFormElement
      form.reset()
    } catch (err) {
      console.error('Create invoice error:', err)
      setError((err as Error).message)
    } finally {
      setCreateLoading(false)
    }
  }

  if (error) return <ErrorFallback error={error} />
  if (loading) return <LoadingSpinner />

  try {
    return (
      <div className="min-h-screen bg-slate-900 text-white">
        <div className="flex">
          {/* Sidebar */}
          <div className="w-64 bg-slate-800 border-r border-slate-700 min-h-screen">
            <div className="p-6 border-b border-slate-700">
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                InvoiceAI Pro
              </h1>
            </div>
            
            <nav className="p-4">
              <div className="space-y-2">
                <Link href="/dashboard" className="flex items-center space-x-3 px-3 py-2 rounded-lg bg-purple-600/20 text-purple-300 border border-purple-500/30">
                  <Home className="w-5 h-5" />
                  <span>Dashboard</span>
                </Link>
                <Link href="/invoices" className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white transition-colors">
                  <FileText className="w-5 h-5" />
                  <span>Invoices</span>
                </Link>
                <Link href="/upload" className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white transition-colors">
                  <Upload className="w-5 h-5" />
                  <span>Upload</span>
                </Link>
                <Link href="/email-processing" className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white transition-colors">
                  <Mail className="w-5 h-5" />
                  <span>Email Processing</span>
                </Link>
                <Link href="/approvals" className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white transition-colors">
                  <CheckCircle className="w-5 h-5" />
                  <span>Approvals</span>
                </Link>
                <Link href="/integrations" className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white transition-colors">
                  <Users className="w-5 h-5" />
                  <span>Integrations</span>
                </Link>
                <Link href="/settings" className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white transition-colors">
                  <Settings className="w-5 h-5" />
                  <span>Settings</span>
                </Link>
              </div>
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-8">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold">Welcome back!</h1>
                <p className="text-slate-400 mt-1">Here's what's happening with your invoices today.</p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 px-6 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-purple-500/25"
              >
                <Plus className="w-5 h-5" />
                <span>Create Invoice</span>
              </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Total Invoices</p>
                    <p className="text-2xl font-bold">{stats.totalInvoices}</p>
                  </div>
                  <FileText className="w-8 h-8 text-purple-400" />
                </div>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Pending Approvals</p>
                    <p className="text-2xl font-bold">{stats.pendingApprovals}</p>
                  </div>
                  <Clock className="w-8 h-8 text-orange-400" />
                </div>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Total Amount</p>
                    <p className="text-2xl font-bold">${stats.totalAmount.toLocaleString()}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-400" />
                </div>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">This Month</p>
                    <p className="text-2xl font-bold">${stats.monthlyAmount.toLocaleString()}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-blue-400" />
                </div>
              </div>
            </div>

            {/* Recent Invoices */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Recent Invoices</h2>
                <Link href="/invoices" className="text-purple-400 hover:text-purple-300 text-sm font-medium">
                  View all →
                </Link>
              </div>

              {recentInvoices.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">No invoices yet</p>
                  <p className="text-slate-500 text-sm">Create your first invoice to get started</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-3 text-slate-400 font-medium">Invoice #</th>
                        <th className="text-left py-3 text-slate-400 font-medium">Vendor</th>
                        <th className="text-left py-3 text-slate-400 font-medium">Amount</th>
                        <th className="text-left py-3 text-slate-400 font-medium">Status</th>
                        <th className="text-left py-3 text-slate-400 font-medium">Due Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentInvoices.map((invoice) => (
                        <tr key={invoice.id} className="border-b border-slate-700/50">
                          <td className="py-4 font-medium">{invoice.invoice_number}</td>
                          <td className="py-4 text-slate-300">{invoice.vendor_name}</td>
                          <td className="py-4">${invoice.total_amount?.toLocaleString()} {invoice.currency}</td>
                          <td className="py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              invoice.status === 'paid' 
                                ? 'bg-green-400/10 text-green-400 border border-green-400/20' 
                                : invoice.status === 'pending'
                                ? 'bg-orange-400/10 text-orange-400 border border-orange-400/20'
                                : 'bg-slate-400/10 text-slate-400 border border-slate-400/20'
                            }`}>
                              {invoice.status}
                            </span>
                          </td>
                          <td className="py-4 text-slate-300">
                            {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Create Invoice Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold">Create New Invoice</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateInvoice} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Vendor Name *
                  </label>
                  <input
                    type="text"
                    name="vendorName"
                    required
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white"
                    placeholder="Enter vendor name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Vendor Email
                  </label>
                  <input
                    type="email"
                    name="vendorEmail"
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white"
                    placeholder="vendor@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Total Amount *
                  </label>
                  <input
                    type="number"
                    name="totalAmount"
                    step="0.01"
                    min="0"
                    required
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    name="dueDate"
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Category
                  </label>
                  <select
                    name="category"
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white"
                  >
                    <option value="">Select category</option>
                    <option value="office_supplies">Office Supplies</option>
                    <option value="utilities">Utilities</option>
                    <option value="software">Software</option>
                    <option value="travel">Travel</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white"
                    placeholder="Additional notes..."
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-6 py-3 bg-slate-700 text-slate-300 rounded-xl hover:bg-slate-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createLoading}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {createLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Create Invoice'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    )
  } catch (e) {
    return <ErrorFallback error={(e as Error).message} />
  }
}