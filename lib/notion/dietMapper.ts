import { dietFields, DietFieldConfig, dietRecordDateProp } from './dietFieldsConfig'

// 前端表單資料（key 為英文）轉換成 Notion page properties 格式
// recordTitle 目前約定格式是「YYYY/M/D 上午/下午HH:mm:ss」(toLocaleString('zh-TW'))
// recordDateISO 是同一個時間點的ISO字串，寫入「記錄日期」這個真正的Date欄位，供 date filter 查詢使用
export function formValuesToNotionProperties(values: Record<string, any>, recordTitle: string, recordDateISO?: string) {
  const properties: Record<string, any> = {
    '記錄時間': { title: [{ text: { content: recordTitle } }] },
  }

  if (recordDateISO) {
    properties[dietRecordDateProp] = { date: { start: recordDateISO } }
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

  const dateProp = props[dietRecordDateProp]
  record.recordDate = dateProp?.date?.start ?? null

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
