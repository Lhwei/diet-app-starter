import ProfilePageContainer from '@/components/ProfilePageContainer'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <>
      <main className="max-w-3xl mx-auto px-4 pt-8 pb-20 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">個人資料</h1>
          <p className="text-text-subtle text-sm mt-1">
            填寫身高、體重、目標與飲食習慣，作為儀表板目標比對與AI建議的基礎資料
          </p>
        </div>
        <ProfilePageContainer />
      </main>
    </>
  )
}
