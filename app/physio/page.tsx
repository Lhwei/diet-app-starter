import PhysioRecordList from '@/components/PhysioRecordList'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function PhysioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <>
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold">生理紀錄</h1>
        <PhysioRecordList />
      </main>
    </>
  )
}
