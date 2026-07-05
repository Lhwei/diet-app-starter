import { physioFields, PhysioFieldConfig } from './physioFieldsConfig'

export function formValuesToPhysioProperties(values: Record<string, any>, recordDate: string) {
  const properties: Record<string, any> = {
    '記錄日期': { title: [{ text: { content: recordDate } }] },
  }

  for (const field of physioFields) {
    const value = values[field.key]
    if (value === undefined || value === null || value === '') continue
    properties[field.notionProp] = buildPropertyValue(field, value)
  }

  return properties
}

function buildPropertyValue(field: PhysioFieldConfig, value: any) {
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

export function notionPageToPhysioRecord(page: any) {
  const props = page.properties
  const record: Record<string, any> = {
    id: page.id,
    createdTime: page.created_time,
  }

  const titleProp = props['記錄日期']
  record.recordDate = titleProp?.title?.[0]?.plain_text ?? ''

  for (const field of physioFields) {
    const prop = props[field.notionProp]
    if (!prop) continue
    record[field.key] = extractPropertyValue(field, prop)
  }

  return record
}

function extractPropertyValue(field: PhysioFieldConfig, prop: any) {
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
