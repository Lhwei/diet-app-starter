import { login } from './actions'
import LoginHero from '@/components/LoginHero'
import LoginMobileCTA from '@/components/LoginMobileCTA'

// 登入頁 v5 —— 溫暖手繪插畫風視覺系統
//
// 對應使用者提供的插畫參考（粉彩蠟筆質感義大利麵插畫）重新設計整體視覺語言：
// 1. 色調從冷色科技感(深色漸層/靛藍玫紅) -> 暖色手繪感(奶油白/珊瑚紅/霧藍/鵝黃)
// 2. 卡片邊框改用粗描邊+手繪陰影(offset shadow)，模仿蠟筆畫的厚實感，取代原本銳利的shadow-sm
// 3. 圖示改用更生活化、溫馨的emoji搭配手繪感圓角容器
// 4. 深色時間軸區塊改成暖色系(不用純黑)，維持亮暗對比節奏但風格統一於手繪美學
// 5. 文案調整為更貼近「像手繪筆記」的親切語氣，減少商業科技感詞彙

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#FFF8EE]">
      <LoginHero />

      <section className="max-w-5xl mx-auto px-5 sm:px-8 py-16 sm:py-24">
        <div className="text-center mb-10">
          <p className="text-xs font-bold text-[#E8846B] tracking-widest uppercase mb-2">為什麼要記錄</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#3A3A3A]">吃過就忘，記錄才不會遺忘</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2 sm:row-span-2 bg-white border-2 border-[#3A3A3A]/10 rounded-[2rem] p-8 flex flex-col justify-between min-h-[260px] shadow-[6px_6px_0_0_rgba(58,58,58,0.08)]">
            <div>
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-xl sm:text-2xl font-bold mb-2 text-[#3A3A3A]">10秒內記完一餐</h3>
              <p className="text-sm text-[#7A6A5A] leading-relaxed max-w-sm">
                用手快速粗算一餐的六大類食物份量<br/>
                十秒完成就取得熱量和三大營養素資訊
              </p>
            </div>
            <div className="flex gap-6 pt-6 mt-6 border-t-2 border-[#3A3A3A]/10">
              <div>
                <p className="text-2xl font-bold text-[#E8846B]">10秒</p>
                <p className="text-xs text-[#B0A392]">平均記錄時間</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[#E8846B]">0元</p>
                <p className="text-xs text-[#B0A392]">永久免費</p>
              </div>
            </div>
          </div>

          <div className="bg-[#BFDCE8]/40 border-2 border-[#3A3A3A]/10 rounded-[2rem] p-6 flex flex-col gap-2">
            <div className="text-3xl">📈</div>
            <h3 className="text-sm font-bold text-[#3A3A3A]">自動畫成趨勢圖</h3>
            <p className="text-xs text-[#7A6A5A] leading-relaxed">體重、飲食、生理數據自動整理成圖表</p>
          </div>

          <div className="bg-[#F6C567]/30 border-2 border-[#3A3A3A]/10 rounded-[2rem] p-6 flex flex-col gap-2">
            <div className="text-3xl">🔔</div>
            <h3 className="text-sm font-bold text-[#3A3A3A]">今天記了沒，一眼看懂</h3>
            <p className="text-xs text-[#7A6A5A] leading-relaxed">缺什麼補什麼，不用靠記憶硬記今天記錄過哪些項目</p>
          </div>

          <div className="sm:col-span-3 bg-white border-2 border-[#3A3A3A]/10 rounded-[2rem] p-6 sm:p-8 flex flex-col sm:flex-row  gap-5 shadow-[4px_4px_0_0_rgba(58,58,58,0.06)]">
            <div className="text-4xl shrink-0">💡</div>
            <div>
              <h3 className="text-sm font-bold text-[#3A3A3A] mb-1">把堅持變得有意義</h3>
              <p className="text-xs sm:text-sm text-[#7A6A5A] leading-relaxed">
                除了趨勢圖表，還能把累積的紀錄接上AI助手，讓AI更了解飲食脈絡，給出貼合狀況的建議
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#4A3F35] text-[#FFF8EE] py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-5 sm:px-8">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-[#F6C567] tracking-widest uppercase mb-2">未來性</p>
            <h2 className="text-2xl sm:text-3xl font-bold">每一筆都記錄未來的你</h2>
            <p className="text-sm text-[#C9BBAA] mt-2">一年365天，一天3餐，五年5475筆資料</p>
          </div>

          <div className="relative">
            <div className="absolute left-4 sm:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-[#E8846B] via-[#F6C567] to-[#BFDCE8] sm:-translate-x-1/2" />

            <div className="space-y-10">
              {[
                { time: '今天', icon: '📝', title: '養成一個10秒鐘的習慣', desc: '每餐記一筆，三餐零負擔' },
                { time: '幾個月後', icon: '🧠', title: '未來的AI，會比現在更懂你', desc: '接上你自己選擇的AI助手，讀懂完整脈絡，給出真正適合你狀況的建議' },
                { time: '看診那一刻', icon: '🩺', title: '有資料才有分析', desc: '不用靠印象回想，直接把累積的紀錄秀出來，讓專業人士更快對症下藥' },
                { time: '任何時候', icon: '🔑', title: '資料是你的，走到哪都帶著', desc: '存在你自己的Notion，不會被鎖住，隨時可以帶去接上更好的工具' },
              ].map((step, i) => (
                <div key={step.time} className={`relative flex flex-col sm:flex-row items-start gap-4 sm:gap-8 ${i % 2 === 1 ? 'sm:flex-row-reverse' : ''}`}>
                  <div className="absolute left-4 sm:left-1/2 w-3 h-3 rounded-full bg-[#FFF8EE] sm:-translate-x-1/2 mt-1.5 ring-4 ring-[#4A3F35]" />
                  <div className={`pl-12 sm:pl-0 sm:w-1/2 ${i % 2 === 1 ? 'sm:text-left sm:pl-8' : 'sm:text-right sm:pr-8'}`}>
                    <p className="text-xs text-[#C9BBAA] mb-1">{step.time}</p>
                    <div className="flex items-center gap-2 mb-1.5 sm:justify-end">
                      <span className={`text-xl ${i % 2 === 1 ? 'sm:order-first' : ''}`}>{step.icon}</span>
                      <h3 className="text-base font-bold">{step.title}</h3>
                    </div>
                    <p className="text-sm text-[#C9BBAA] leading-relaxed">{step.desc}</p>
                  </div>
                  <div className="hidden sm:block sm:w-1/2" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 收尾CTA */}
      <section className="max-w-3xl mx-auto px-5 sm:px-8 pt-20 pb-20 sm:py-28 text-center">
        <h2 className="text-2xl sm:text-4xl font-bold text-[#3A3A3A] mb-4">
          從今天的第一筆飲食開始
        </h2>
        <p className="text-sm sm:text-base text-[#7A6A5A] mb-8">
          一個 Google 帳號、一個 Notion 帳號就能開始
        </p>
        <div className="hidden sm:flex justify-center">
          <form>
            <button
              formAction={login}
              className="group flex items-center justify-center gap-2 bg-[#E8846B] text-white rounded-full px-9 py-4 text-base font-bold hover:bg-[#DD7458] transition-all shadow-[4px_4px_0_0_rgba(58,58,58,0.15)] hover:shadow-[2px_2px_0_0_rgba(58,58,58,0.15)] hover:translate-x-0.5 hover:translate-y-0.5"
            >
              使用 Google 登入，立即開始
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </button>
          </form>
        </div>
      </section>

      <LoginMobileCTA />
    </main>
  )
}
