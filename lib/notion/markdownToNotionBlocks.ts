// lib/notion/markdownToNotionBlocks.ts
//
// 把簡易markdown文字轉換成Notion block物件陣列，支援：
// - # / ## / ### 開頭 → heading_1 / heading_2 / heading_3
// - ``` 包住的區塊 → code block（灰底樣式）
// - --- 單獨一行 → divider（分隔線）
// - 1. / 2. 開頭 → numbered_list_item
// - **粗體文字** → 該段落內的粗體 rich_text annotation
// - 其餘一般文字行 → paragraph
//
// 不支援巢狀語法（例如粗體裡再包斜體），滿足目前AI用PROMPT頁面需求即可。

type NotionBlock = Record<string, any>
type RichTextItem = { type: 'text'; text: { content: string }; annotations?: { bold?: boolean } }

// 把一行文字依 **粗體** 語法拆成多個rich_text片段，支援單行內多組粗體
function parseInlineRichText(line: string): RichTextItem[] {
  const segments: RichTextItem[] = []
  const regex = /\*\*(.+?)\*\*/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', text: { content: line.slice(lastIndex, match.index) } })
    }
    segments.push({
      type: 'text',
      text: { content: match[1] },
      annotations: { bold: true },
    })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < line.length) {
    segments.push({ type: 'text', text: { content: line.slice(lastIndex) } })
  }

  return segments.length > 0 ? segments : [{ type: 'text', text: { content: line } }]
}

function richText(content: string): RichTextItem[] {
  return [{ type: 'text', text: { content } }]
}

export function markdownToNotionBlocks(markdown: string): NotionBlock[] {
  const lines = markdown.split('\n')
  const blocks: NotionBlock[] = []

  let inCodeBlock = false
  let codeBuffer: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // 處理 code block 開始/結束
    if (line.trim().startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true
        codeBuffer = []
      } else {
        inCodeBlock = false
        blocks.push({
          object: 'block',
          type: 'code',
          code: {
            rich_text: richText(codeBuffer.join('\n')),
            language: 'plain text',
          },
        })
      }
      continue
    }

    if (inCodeBlock) {
      codeBuffer.push(line)
      continue
    }

    const trimmed = line.trim()

    if (trimmed === '') continue // 跳過空行，避免產生一堆空白paragraph block

    if (trimmed === '---') {
      blocks.push({ object: 'block', type: 'divider', divider: {} })
      continue
    }

    if (trimmed.startsWith('### ')) {
      blocks.push({
        object: 'block',
        type: 'heading_3',
        heading_3: { rich_text: parseInlineRichText(trimmed.slice(4)) },
      })
      continue
    }

    if (trimmed.startsWith('## ')) {
      blocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: { rich_text: parseInlineRichText(trimmed.slice(3)) },
      })
      continue
    }

    if (trimmed.startsWith('# ')) {
      blocks.push({
        object: 'block',
        type: 'heading_1',
        heading_1: { rich_text: parseInlineRichText(trimmed.slice(2)) },
      })
      continue
    }

    const numberedMatch = trimmed.match(/^\d+\.\s+(.*)/)
    if (numberedMatch) {
      blocks.push({
        object: 'block',
        type: 'numbered_list_item',
        numbered_list_item: { rich_text: parseInlineRichText(numberedMatch[1]) },
      })
      continue
    }

    // 一般段落文字（含粗體解析），Notion單一rich_text content上限約2000字，超長時切段
    if (trimmed.length > 1800) {
      const chunks = trimmed.match(/.{1,1800}/g) ?? [trimmed]
      for (const chunk of chunks) {
        blocks.push({
          object: 'block',
          type: 'paragraph',
          paragraph: { rich_text: parseInlineRichText(chunk) },
        })
      }
    } else {
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: { rich_text: parseInlineRichText(trimmed) },
      })
    }
  }

  return blocks
}
