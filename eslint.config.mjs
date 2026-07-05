import { FlatCompat } from '@eslint/eslintrc'
import { dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

// Next.js 16 + eslint 9 使用 flat config 格式，透過 FlatCompat 相容舊版 eslint-config-next 規則集
const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
]

export default eslintConfig
