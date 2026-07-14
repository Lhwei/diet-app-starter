// lib/api/errorResponse.ts
import { NextResponse } from 'next/server'
import { NotionApiError } from '@/lib/notion/client'

export function handleApiError(e: unknown, fallbackCode: string) {
  if (e instanceof NotionApiError) {
    return NextResponse.json({ error: e.message }, { status: e.status })
  }
  // 詳細內容只留伺服器 log，不回給前端
  console.error(`[api_error] ${fallbackCode}:`, e)
  return NextResponse.json({ error: fallbackCode }, { status: 500 })
}