import { profileFields, ProfileFieldConfig } from './profileFieldsConfig'

export function formValuesToProfileProperties(values: Record<string, any>, userId: string) {
  const properties: Record<string, any> = {
    'user_id': { rich_text: [{ text: { content: userId } }] },
  }

  for (const field of profileFields) {
    const value = values[field.key]
    if (value === undefined || value === null || value === '') continue
    properties[field.notionProp] = buildPropertyValue(field, value)
  }

  return properties
}

function buildPropertyValue(field: ProfileFieldConfig, value: any) {
  switch (field.type) {
    case 'title':
      return { title: [{ text: { content: String(value) } }] }
    case 'select':
      return { select: { name: value } }
    case 'multi_select':
      return { multi_select: (Array.isArray(value) ? value : [value]).map((v) => ({ name: v })) }
    case 'number':
      return { number: Number(value) }
    case 'rich_text':
      return { rich_text: [{ text: { content: String(value) } }] }
    case 'date':
      return { date: { start: value } }
    case 'checkbox':
      return { checkbox: Boolean(value) }
    default:
      return { rich_text: [{ text: { content: String(value) } }] }
  }
}

export function notionPageToProfileRecord(page: any) {
  const props = page.properties
  const record: Record<string, any> = { id: page.id }

  for (const field of profileFields) {
    const prop = props[field.notionProp]
    if (!prop) continue
    record[field.key] = extractPropertyValue(field, prop)
  }

  return record
}

// 修正重點：原本的 switch 沒有處理 'title' 型別（暱稱欄位），
// 導致落入 default 分支回傳 null，把上面已經正確設定好的 nickname 蓋掉，
// 這就是「Notion裡明明有暱稱，儲存後網頁卻顯示空白」的根本原因。
// 現在補上 'title' 分支，直接從 prop.title[0].plain_text 取值。
function extractPropertyValue(field: ProfileFieldConfig, prop: any) {
  switch (field.type) {
    case 'title':
      return prop.title?.[0]?.plain_text ?? ''
    case 'select':
      return prop.select?.name ?? null
    case 'multi_select':
      return (prop.multi_select ?? []).map((o: any) => o.name)
    case 'number':
      return prop.number ?? null
    case 'rich_text':
      return prop.rich_text?.[0]?.plain_text ?? ''
    case 'date':
      return prop.date?.start ?? null
    case 'checkbox':
      return prop.checkbox ?? false
    default:
      return null
  }
}
