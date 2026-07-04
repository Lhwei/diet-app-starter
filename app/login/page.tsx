import { login } from './actions'

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-md p-8 text-center">
        <h1 className="text-2xl font-bold mb-2">飲食管理小幫手</h1>
        <p className="text-gray-500 mb-6">使用 Google 帳號登入，開始記錄你的健康生活</p>
        <form>
          <button
            formAction={login}
            className="w-full flex items-center justify-center gap-2 border rounded-xl py-3 font-medium hover:bg-gray-50 transition"
          >
            使用 Google 登入
          </button>
        </form>
      </div>
    </main>
  )
}
