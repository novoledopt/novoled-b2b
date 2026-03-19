const SUPABASE_URL =
"https://kvycffsvgfftxzoqrrlj.supabase.co"

const SERVICE_KEY =
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2eWNmZnN2Z2ZmdHh6b3FycmxqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzM0ODg3NywiZXhwIjoyMDg4OTI0ODc3fQ.0zTpdpMLW0c_QYTTK-HEL4RCIqueAEQHd9uXtXqbQzI"

const SHEET_URL =
"https://opensheet.elk.sh/1CYwbHJ7yFGl_x6to4LLlSpPdQO2qpwzExS8whgrny8E/products"

async function sync() {

 const res = await fetch(SHEET_URL)

 const data = await res.json()

 function parseBoolean(value) {

    if (value === true) return true
    if (value === false) return false
   
    if (!value) return false
    const v = String(value).toLowerCase().trim()
    return v === "true" || v === "1" || v === "yes"
   }
   
   const products = data.map(p => ({
   
    id: p.id,
    in_stock: parseBoolean(p.in_stock),
    name: p.name,
    category: p.category,
    subcategory: p.subcategory,
    series: p.series,
    socket: p.socket,
    power: p.power,
    lumens: p.lumens,
    unit: p.unit,
    price: p.price ? Number(p.price) : null,
    image_1: p.image_1,
    image_2: p.image_2,
    image_3: p.image_3
   
   }))

 const supabaseRes = await fetch(
  `${SUPABASE_URL}/rest/v1/products`,
  {
   method: "POST",
   headers: {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates"
   },
   body: JSON.stringify(products)
  }
 )

 if(!supabaseRes.ok){

  const text = await supabaseRes.text()

  console.log(text)

 } else {

  console.log("SYNC OK")

 }

}

sync()