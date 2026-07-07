import DashboardContent from '@/components/DashboardContent'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <>
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        <div>
          <h1 className="text-2xl font-bold">健康儀表板</h1>
          <p className="text-gray-400 text-sm mt-1">追蹤飲食、體重與身體組成的變化趨勢</p>
        </div>

        <DashboardContent />
      </main>
    </>
  )
}
