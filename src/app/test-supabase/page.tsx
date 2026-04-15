"use client";

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'

export default function TestSupabasePage() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [todos, setTodos] = useState<any[]>([])

    useEffect(() => {
        async function getTodos() {
            const { data: todos, error } = await supabase.from('todos').select()

            if (error) {
                console.error('Chi tiết lỗi Supabase:', error)
                setTodos([{ id: 'error', name: `Lỗi: ${error.message || JSON.stringify(error)} (Mã: ${error.code})` }])
            } else if (todos) {
                setTodos(todos)
            }
        }

        getTodos()
    }, [])

    return (
        <div className="p-8 bg-[#0A0A0F] min-h-screen text-white">
            <h1 className="text-2xl font-bold mb-4">Supabase Connection Test</h1>
            {todos.length === 0 ? (
                <p className="text-white/50">No todos found or loading...</p>
            ) : (
                <ul className="space-y-2">
                    {todos.map((todo) => (
                        <li key={todo.id} className="p-4 bg-white/5 rounded-lg border border-white/10">
                            {todo.name || todo.title || JSON.stringify(todo)}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
