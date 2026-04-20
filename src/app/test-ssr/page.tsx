import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export default async function TestSSRPage() {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        return (
            <div className="p-8 bg-[#0A0A0F] min-h-screen text-white">
                <h1 className="text-2xl font-bold mb-4 text-yellow-400">Supabase SSR Test</h1>
                <p className="text-white/50">Missing Supabase public env vars.</p>
            </div>
        )
    }

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Fetching data from Supabase on the server
    const { data: todos, error } = await supabase.from('todos').select()

    if (error) {
        return (
            <div className="p-8 bg-[#0A0A0F] min-h-screen text-white">
                <h1 className="text-2xl font-bold mb-4 text-red-500">Lỗi SSR fetch:</h1>
                <pre className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                    {JSON.stringify(error, null, 2)}
                </pre>
                <p className="mt-4 text-white/50">Đừng quên tạo bảng `todos` trong Database mới của bạn nhé!</p>
            </div>
        )
    }

    return (
        <div className="p-8 bg-[#0A0A0F] min-h-screen text-white">
            <h1 className="text-2xl font-bold mb-4">Supabase SSR Test</h1>
            {!todos || todos.length === 0 ? (
                <p className="text-white/50">Không có dữ liệu hoặc bảng trống. (Project mới: {process.env.NEXT_PUBLIC_SUPABASE_URL})</p>
            ) : (
                <ul className="space-y-2">
                    {todos.map((todo) => (
                        <li key={todo.id} className="p-4 bg-white/5 rounded-lg border border-white/10 italic">
                            {todo.name || todo.title || JSON.stringify(todo)}
                        </li>
                    ))}
                </ul>
            )}
            <div className="mt-8 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20 text-sm text-blue-300">
                ✨ Trang này được render trực tiếp từ Server (Next.js Server Component).
            </div>
        </div>
    )
}
