'use client'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  DollarSign, 
  TrendingUp, 
  Activity,
  Mail,
  Users,
  Calendar,
  ArrowUp,
  ArrowDown
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

function Spinner() {
  return (
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
  )
}

interface AnalyticsData {
  totalInvoices: number
  totalAmount: number
  approvedInvoices: number
  pendingInvoices: number
  avgProcessingTime: number
  monthlyData: Array<{ month: string; invoices: number; amount: number }>
  recentActivity: Array<{
    id: string
    type: 'invoice_created' | 'invoice_approved' | 'invoice_rejected' | 'email_processed'
    description: string
    timestamp: string
    amount?: number
    status?: string
  }>
}

export default function AnalyticsPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const router = useRouter()

  const supabase = useMemo(() => 
    createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!), 
    []
  )

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (user) {
      fetchAnalyticsData()
    }
  }, [user])

  async function checkUser() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      console.log('Auth session:', session, error)
      
      if (error) {
        console.error('Auth error:', error)
        setError(error.message)
        return
      }
      
      if (!session) {
        router.push('/login')
        return
      }
      
      setUser(session.user)
    } catch (err) {
      console.error('Check user error:', err)
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function fetchAnalyticsData() {
    if (!user) return
    
    setLoading(true)
    try {
      // Fetch invoices data
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      console.log('Invoices data:', invoices, invoicesError)
      
      if (invoicesError) {
        console.error('Invoices error:', invoicesError)
        setError(invoicesError.message)
        return
      }

      // Fetch approval requests for processing time calculation
      const { data: approvals, error: approvalsError } = await supabase
        .from('approval_requests')
        .select('*')
        .eq('user_id', user.id)
        .not('approved_at', 'is', null)
      
      console.log('Approvals data:', approvals, approvalsError)
      
      if (approvalsError) {
        console.error('Approvals error:', approvalsError)
      }

      // Process data
      const totalInvoices = invoices?.length || 0
      const totalAmount = invoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0
      const approvedInvoices = invoices?.filter(inv => inv.approval_status === 'approved').length || 0
      const pendingInvoices = invoices?.filter(inv => inv.approval_status === 'pending').length || 0

      // Calculate average processing time (in hours)
      let avgProcessingTime = 0
      if (approvals && approvals.length > 0) {
        const totalProcessingTime = approvals.reduce((sum, approval) => {
          if (approval.created_at && approval.approved_at) {
            const created = new Date(approval.created_at).getTime()
            const approved = new Date(approval.approved_at).getTime()
            return sum + (approved - created)
          }
          return sum
        }, 0)
        avgProcessingTime = totalProcessingTime / approvals.length / (1000 * 60 * 60) // Convert to hours
      }

      // Generate monthly data for the last 6 months
      const monthlyData = []
      const now = new Date()
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthName = date.toLocaleDateString('en-US', { month: 'short' })
        const monthInvoices = invoices?.filter(inv => {
          const invDate = new Date(inv.created_at)
          return invDate.getMonth() === date.getMonth() && invDate.getFullYear() === date.getFullYear()
        }) || []
        
        monthlyData.push({
          month: monthName,
          invoices: monthInvoices.length,
          amount: monthInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0)
        })
      }

      // Generate recent activity
      const recentActivity = []
      
      // Add recent invoices
      const recentInvoices = (invoices || []).slice(0, 10)
      for (const invoice of recentInvoices) {
        recentActivity.push({
          id: invoice.id,
          type: 'invoice_created' as const,
          description: `Invoice ${invoice.invoice_number} from ${invoice.vendor_name}`,
          timestamp: invoice.created_at,
          amount: invoice.total_amount,
          status: invoice.approval_status
        })
      }

      // Add recent approvals
      const recentApprovals = (approvals || []).slice(0, 5)
      for (const approval of recentApprovals) {
        const invoice = invoices?.find(inv => inv.id === approval.invoice_id)
        recentActivity.push({
          id: approval.id,
          type: 'invoice_approved' as const,
          description: `Invoice ${invoice?.invoice_number || 'Unknown'} approved`,
          timestamp: approval.approved_at || approval.created_at,
          amount: invoice?.total_amount
        })
      }

      // Sort by timestamp descending
      recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

      setAnalyticsData({
        totalInvoices,
        totalAmount,
        approvedInvoices,
        pendingInvoices,
        avgProcessingTime,
        monthlyData,
        recentActivity: recentActivity.slice(0, 10)
      })
      
    } catch (err) {
      console.error('Fetch analytics error:', err)
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  if (error) {
    return <ErrorFallback error={error} />
  }

  try {
    return (
      <div className="min-h-screen bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Analytics Dashboard</h1>
              <p className="text-slate-400">Track your invoice processing performance and trends</p>
            </div>
            <Link
              href="/dashboard"
              className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl transition-colors duration-200"
            >
              Back to Dashboard
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Spinner />
            </div>
          ) : !analyticsData ? (
            <div className="text-center py-20">
              <Activity className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No analytics data available</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-sm font-medium">Total Invoices</p>
                      <p className="text-2xl font-bold text-white mt-1">
                        {analyticsData.totalInvoices.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-purple-500/10 p-3 rounded-lg">
                      <FileText className="h-6 w-6 text-purple-500" />
                    </div>
                  </div>
                  <div className="flex items-center mt-4 text-sm">
                    <ArrowUp className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-green-500">12%</span>
                    <span className="text-slate-400 ml-1">vs last month</span>
                  </div>
                </div>

                <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-sm font-medium">Total Amount</p>
                      <p className="text-2xl font-bold text-white mt-1">
                        ${analyticsData.totalAmount.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-green-500/10 p-3 rounded-lg">
                      <DollarSign className="h-6 w-6 text-green-500" />
                    </div>
                  </div>
                  <div className="flex items-center mt-4 text-sm">
                    <ArrowUp className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-green-500">8%</span>
                    <span className="text-slate-400 ml-1">vs last month</span>
                  </div>
                </div>

                <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-sm font-medium">Approved</p>
                      <p className="text-2xl font-bold text-white mt-1">
                        {analyticsData.approvedInvoices}
                      </p>
                    </div>
                    <div className="bg-blue-500/10 p-3 rounded-lg">
                      <CheckCircle className="h-6 w-6 text-blue-500" />
                    </div>
                  </div>
                  <div className="flex items-center mt-4 text-sm">
                    <span className="text-slate-400">
                      {analyticsData.totalInvoices > 0 
                        ? Math.round((analyticsData.approvedInvoices / analyticsData.totalInvoices) * 100)
                        : 0}% approval rate
                    </span>
                  </div>
                </div>

                <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-sm font-medium">Avg Processing Time</p>
                      <p className="text-2xl font-bold text-white mt-1">
                        {analyticsData.avgProcessingTime.toFixed(1)}h
                      </p>
                    </div>
                    <div className="bg-orange-500/10 p-3 rounded-lg">
                      <Clock className="h-6 w-6 text-orange-500" />
                    </div>
                  </div>
                  <div className="flex items-center mt-4 text-sm">
                    <ArrowDown className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-green-500">15%</span>
                    <span className="text-slate-400 ml-1">vs last month</span>
                  </div>
                </div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Invoice Volume Chart */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-white mb-6">Invoice Volume (Last 6 Months)</h3>
                  <div className="h-64">
                    <svg className="w-full h-full" viewBox="0 0 400 200">
                      {/* Chart background */}
                      <rect width="400" height="200" fill="transparent" />
                      
                      {/* Grid lines */}
                      {[0, 1, 2, 3, 4].map(i => (
                        <line
                          key={i}
                          x1="40"
                          y1={40 + i * 30}
                          x2="380"
                          y2={40 + i * 30}
                          stroke="#334155"
                          strokeWidth="0.5"
                        />
                      ))}
                      
                      {/* Y-axis labels */}
                      {[0, 1, 2, 3, 4].map(i => {
                        const maxInvoices = Math.max(...analyticsData.monthlyData.map(d => d.invoices))
                        const value = Math.round((maxInvoices * (4 - i)) / 4)
                        return (
                          <text
                            key={i}
                            x="30"
                            y={40 + i * 30 + 5}
                            fill="#94a3b8"
                            fontSize="12"
                            textAnchor="end"
                          >
                            {value}
                          </text>
                        )
                      })}
                      
                      {/* Bars */}
                      {analyticsData.monthlyData.map((data, i) => {
                        const maxInvoices = Math.max(...analyticsData.monthlyData.map(d => d.invoices), 1)
                        const barHeight = (data.invoices / maxInvoices) * 120
                        const barWidth = 40
                        const barX = 60 + i * 60
                        const barY = 160 - barHeight
                        
                        return (
                          <g key={i}>
                            <rect
                              x={barX}
                              y={barY}
                              width={barWidth}
                              height={barHeight}
                              fill="url(#gradient)"
                              rx="4"
                            />
                            <text
                              x={barX + barWidth / 2}
                              y="180"
                              fill="#94a3b8"
                              fontSize="12"
                              textAnchor="middle"
                            >
                              {data.month}
                            </text>
                            <text
                              x={barX + barWidth / 2}
                              y={barY - 5}
                              fill="#ffffff"
                              fontSize="12"
                              textAnchor="middle"
                            >
                              {data.invoices}
                            </text>
                          </g>
                        )
                      })}
                      
                      {/* Gradient definition */}
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#8b5cf6" />
                          <stop offset="100%" stopColor="#3b82f6" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                </div>

                {/* Amount Processed Chart */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-white mb-6">Amount Processed (Last 6 Months)</h3>
                  <div className="h-64">
                    <svg className="w-full h-full" viewBox="0 0 400 200">
                      {/* Chart background */}
                      <rect width="400" height="200" fill="transparent" />
                      
                      {/* Grid lines */}
                      {[0, 1, 2, 3, 4].map(i => (
                        <line
                          key={i}
                          x1="40"
                          y1={40 + i * 30}
                          x2="380"
                          y2={40 + i * 30}
                          stroke="#334155"
                          strokeWidth="0.5"
                        />
                      ))}
                      
                      {/* Y-axis labels */}
                      {[0, 1, 2, 3, 4].map(i => {
                        const maxAmount = Math.max(...analyticsData.monthlyData.map(d => d.amount))
                        const value = Math.round((maxAmount * (4 - i)) / 4000) * 1000
                        return (
                          <text
                            key={i}
                            x="30"
                            y={40 + i * 30 + 5}
                            fill="#94a3b8"
                            fontSize="11"
                            textAnchor="end"
                          >
                            ${value / 1000}k
                          </text>
                        )
                      })}
                      
                      {/* Area chart */}
                      {analyticsData.monthlyData.length > 1 && (
                        <>
                          {/* Area fill */}
                          <path
                            d={`M 60 160 ${analyticsData.monthlyData.map((data, i) => {
                              const maxAmount = Math.max(...analyticsData.monthlyData.map(d => d.amount), 1)
                              const pointHeight = (data.amount / maxAmount) * 120
                              const pointY = 160 - pointHeight
                              const pointX = 80 + i * 60
                              return `L ${pointX} ${pointY}`
                            }).join(' ')} L ${80 + (analyticsData.monthlyData.length - 1) * 60} 160 Z`}
                            fill="url(#areaGradient)"
                            opacity="0.3"
                          />
                          
                          {/* Line */}
                          <path
                            d={`M ${analyticsData.monthlyData.map((data, i) => {
                              const maxAmount = Math.max(...analyticsData.monthlyData.map(d => d.amount), 1)
                              const pointHeight = (data.amount / maxAmount) * 120
                              const pointY = 160 - pointHeight
                              const pointX = 80 + i * 60
                              return `${i === 0 ? 'M' : 'L'} ${pointX} ${pointY}`
                            }).join(' ')}`}
                            stroke="#10b981"
                            strokeWidth="3"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          
                          {/* Points */}
                          {analyticsData.monthlyData.map((data, i) => {
                            const maxAmount = Math.max(...analyticsData.monthlyData.map(d => d.amount), 1)
                            const pointHeight = (data.amount / maxAmount) * 120
                            const pointY = 160 - pointHeight
                            const pointX = 80 + i * 60
                            
                            return (
                              <g key={i}>
                                <circle
                                  cx={pointX}
                                  cy={pointY}
                                  r="4"
                                  fill="#10b981"
                                  stroke="#0f172a"
                                  strokeWidth="2"
                                />
                                <text
                                  x={pointX}
                                  y="180"
                                  fill="#94a3b8"
                                  fontSize="12"
                                  textAnchor="middle"
                                >
                                  {data.month}
                                </text>
                              </g>
                            )
                          })}
                        </>
                      )}
                      
                      {/* Gradient definition */}
                      <defs>
                        <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#10b981" />
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-6">Recent Activity</h3>
                <div className="space-y-4">
                  {analyticsData.recentActivity.length === 0 ? (
                    <div className="text-center py-8">
                      <Activity className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-slate-400">No recent activity</p>
                    </div>
                  ) : (
                    analyticsData.recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                        <div className="flex items-center">
                          <div className="bg-slate-600 p-2 rounded-lg mr-4">
                            {activity.type === 'invoice_created' && <FileText className="h-4 w-4 text-blue-400" />}
                            {activity.type === 'invoice_approved' && <CheckCircle className="h-4 w-4 text-green-400" />}
                            {activity.type === 'invoice_rejected' && <Activity className="h-4 w-4 text-red-400" />}
                            {activity.type === 'email_processed' && <Mail className="h-4 w-4 text-purple-400" />}
                          </div>
                          <div>
                            <p className="text-white font-medium">{activity.description}</p>
                            <p className="text-slate-400 text-sm">
                              {new Date(activity.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {activity.amount && (
                            <p className="text-white font-bold">${activity.amount.toLocaleString()}</p>
                          )}
                          {activity.status && (
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                              activity.status === 'approved' 
                                ? 'bg-green-500/10 text-green-400'
                                : activity.status === 'rejected'
                                ? 'bg-red-500/10 text-red-400'
                                : 'bg-yellow-500/10 text-yellow-400'
                            }`}>
                              {activity.status}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
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