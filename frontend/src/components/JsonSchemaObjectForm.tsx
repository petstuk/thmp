import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ConnectorConfigSchema, JsonSchemaProp } from '@/lib/connectorConfigSchemas'

type Props = {
  schema: ConnectorConfigSchema
  value: Record<string, unknown>
  onChange: (next: Record<string, unknown>) => void
  idPrefix?: string
}

function coerce(prop: JsonSchemaProp, raw: string): unknown {
  if (prop.type === 'boolean') return raw === 'true' || raw === 'on'
  if (prop.type === 'integer') {
    const n = parseInt(raw, 10)
    return Number.isFinite(n) ? n : prop.default ?? 0
  }
  if (prop.type === 'number') {
    const n = parseFloat(raw)
    return Number.isFinite(n) ? n : prop.default ?? 0
  }
  return raw
}

export function JsonSchemaObjectForm({ schema, value, onChange, idPrefix = 'cfg' }: Props) {
  const required = new Set(schema.required ?? [])

  function setField(key: string, v: unknown) {
    onChange({ ...value, [key]: v })
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {Object.entries(schema.properties).map(([key, prop]) => {
        const id = `${idPrefix}-${key}`
        const cur = value[key]
        if (prop.type === 'boolean') {
          const checked = Boolean(cur ?? prop.default ?? false)
          return (
            <label key={key} className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                id={id}
                checked={checked}
                onChange={(e) => setField(key, e.target.checked)}
              />
              <span>
                {prop.title ?? key}
                {required.has(key) ? ' *' : ''}
              </span>
            </label>
          )
        }
        const str =
          cur === undefined || cur === null
            ? prop.default !== undefined
              ? String(prop.default)
              : ''
            : String(cur)
        return (
          <div key={key} className="space-y-1 sm:col-span-2">
            <Label htmlFor={id}>
              {prop.title ?? key}
              {required.has(key) ? ' *' : ''}
            </Label>
            {prop.description ? (
              <p className="text-xs text-muted-foreground">{prop.description}</p>
            ) : null}
            <Input
              id={id}
              type={prop.type === 'integer' || prop.type === 'number' ? 'number' : 'text'}
              value={str}
              onChange={(e) => setField(key, coerce(prop, e.target.value))}
            />
          </div>
        )
      })}
    </div>
  )
}
