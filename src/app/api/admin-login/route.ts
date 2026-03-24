import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { email, password, adminKey } = await req.json()
  if (adminKey !== process.env.ADMIN_SECRET_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: existing } = await supabase.auth.admin.listUsers()
  const user = existing?.users?.find(u => u.email === email)
  if (!user) {
    await supabase.auth.admin.createUser({ email, password, email_confirm: true })
  } else {
    await supabase.auth.admin.updateUserById(user.id, { email_confirm: true, password })
  }
  return NextResponse.json({ success: true })
}
