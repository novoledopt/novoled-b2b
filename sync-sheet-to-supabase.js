// Скрипт синхронізує Google Sheet JSON -> Supabase таблицю products.
// Запускати з Node 18+: `node sync-sheet-to-supabase.js`
//
// Не публікуйте SERVICE_ROLE_KEY в браузері або фронтенді!

import fetch from 'node-fetch'
import { createClient } from '@supabase/supabase-js'

const SHEET_JSON_URL =
  process.env.SHEET_JSON_URL ||
  'https://opensheet.elk.sh/1CYwbHJ7yFGl_x6to4LLlSpPdQO2qpwzExS8whgrny8E/products'

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  'https://exdvqloybftrpwtsdskz.supabase.co'

const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

function normalizeRow(row) {
  return {
    id: row.id,
    name: row.name || '',
    category: row.category || '',
    socket_1: row.socket_1 || '',
    socket_2: row.socket_2 || '',
    series: row.series || '',
    power: row.power || '',
    lumens: row.lumens || '',
    unit: row.unit || '',
    price: row.price || '',
    image_1: row.image_1 || '',
    image_2: row.image_2 || '',
    image_3: row.image_3 || '',
  }
}

async function main() {
  console.log('Fetching JSON from Google Sheet…')
  const res = await fetch(SHEET_JSON_URL)
  if (!res.ok) {
    console.error('Failed to fetch sheet JSON', res.status, await res.text())
    process.exit(1)
  }

  const rows = await res.json()
  if (!Array.isArray(rows)) {
    console.error('Unexpected JSON format from sheet')
    process.exit(1)
  }

  const payload = rows.map(normalizeRow).filter((r) => r.id)
  console.log(`Preparing to upsert ${payload.length} rows…`)

  const { error } = await supabase.from('products').upsert(payload, {
    onConflict: 'id',
  })

  if (error) {
    console.error('Supabase upsert error:', error)
    process.exit(1)
  }

  console.log('Sync complete.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

