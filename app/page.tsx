import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: connection } = await supabase
    .from('notion_connections')
    .select('status, init_step')
    .eq('user_id', user.id)
    .maybeSingle()

  const notionReady = connection?.status === 'connected' && connection?.init_step === 'completed'

  if (!notionReady) {
    redirect('/settings?setup=notion')
  }

  redirect('/diet')
}
