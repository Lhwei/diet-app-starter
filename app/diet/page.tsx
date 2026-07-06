import DietRecordList from '@/components/DietRecordList'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DietPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <>
      <main className="max-w-3xl mx-auto px-4 pb-8 space-y-6">
        <h1 className="text-2xl font-bold hidden">飲食紀錄</h1>
        <DietRecordList />
      </main>
    </>
  )
}
