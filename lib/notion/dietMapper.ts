import { dietFields, DietFieldConfig } from './dietFieldsConfig'

// 前端表單資料（key 為英文）轉換成 Notion page properties 格式
export function formValuesToNotionProperties(values: Record<string, any>, recordTitle: string) {
  const properties: Record<string, any> = {
    '記錄時間': { title: [{ text: { content: recordTitle } }] },
  }

  for (const field of dietFields) {
    const value = values[field.key]
    if (value === undefined || value === null || value === '') continue
    properties[field.notionProp] = buildPropertyValue(field, value)
  }

  return properties
}

function buildPropertyValue(field: DietFieldConfig, value: any) {
  switch (field.type) {
    case 'select':
      return { select: { name: value } }
    case 'multi_select':
      return { multi_select: (Array.isArray(value) ? value : [value]).map((v) => ({ name: v })) }
    case 'number':
      return { number: Number(value) }
    case 'rich_text':
      return { rich_text: [{ text: { content: String(value) } }] }
    default:
      return { rich_text: [{ text: { content: String(value) } }] }
  }
}

// Notion page 物件轉換回前端可用的扁平物件
export function notionPageToRecord(page: any) {
  const props = page.properties
  const record: Record<string, any> = {
    id: page.id,
    createdTime: page.created_time,
  }

  const titleProp = props['記錄時間']
  record.recordTitle = titleProp?.title?.[0]?.plain_text ?? ''

  for (const field of dietFields) {
    const prop = props[field.notionProp]
    if (!prop) continue
    record[field.key] = extractPropertyValue(field, prop)
  }

  return record
}

function extractPropertyValue(field: DietFieldConfig, prop: any) {
  switch (field.type) {
    case 'select':
      return prop.select?.name ?? null
    case 'multi_select':
      return (prop.multi_select ?? []).map((o: any) => o.name)
    case 'number':
      return prop.number ?? null
    case 'rich_text':
      return prop.rich_text?.[0]?.plain_text ?? ''
    default:
      return null
  }
}
