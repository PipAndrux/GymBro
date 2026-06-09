export interface OFFProduct {
  name: string
  brand: string
  caloriesPer100g: number
  protein: number
  carbs: number
  fat: number
  barcode?: string
}

function parseProduct(p: Record<string, unknown>): OFFProduct | null {
  const n = p.nutriments as Record<string, unknown> | undefined
  if (!n) return null
  const cal = Number(n['energy-kcal_100g'] ?? n['energy_100g'] ?? 0)
  const prot = Number(n['proteins_100g'] ?? 0)
  const carbs = Number(n['carbohydrates_100g'] ?? 0)
  const fat = Number(n['fat_100g'] ?? 0)
  const name = String(p.product_name ?? p.product_name_en ?? '').trim()
  if (!name || cal <= 0) return null
  return {
    name,
    brand: String(p.brands ?? '').split(',')[0].trim(),
    caloriesPer100g: Math.round(cal),
    protein: Math.round(prot * 10) / 10,
    carbs: Math.round(carbs * 10) / 10,
    fat: Math.round(fat * 10) / 10,
  }
}

export async function searchFoodsOnline(query: string): Promise<OFFProduct[]> {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=20&fields=product_name,product_name_en,brands,nutriments`
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error('Search failed')
  const data = await res.json() as { products?: unknown[] }
  return (data.products ?? [])
    .map(p => parseProduct(p as Record<string, unknown>))
    .filter((p): p is OFFProduct => p !== null)
    .slice(0, 20)
}

export async function lookupBarcode(barcode: string): Promise<OFFProduct | null> {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=product_name,product_name_en,brands,nutriments`
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) return null
  const data = await res.json() as { status: number; product?: Record<string, unknown> }
  if (data.status !== 1 || !data.product) return null
  const prod = parseProduct(data.product)
  if (!prod) return null
  return { ...prod, barcode }
}
