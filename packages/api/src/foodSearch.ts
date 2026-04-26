import { supabase } from './client';

const OFF_BASE = 'https://world.openfoodfacts.org';
const UA = 'BeProud/0.1 (mailto:hello@beproud.app)';
const TIMEOUT_MS = 8000;

export type OffProduct = {
  code: string;
  name: string;
  brand?: string;
  image_url?: string;
  kcal_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  sugars_per_100g?: number;
  fiber_per_100g?: number;
};

type OffNutriments = {
  'energy-kcal_100g'?: number | string;
  proteins_100g?: number | string;
  carbohydrates_100g?: number | string;
  fat_100g?: number | string;
  sugars_100g?: number | string;
  fiber_100g?: number | string;
};

type OffSearchProduct = {
  code?: string;
  product_name?: string;
  brands?: string;
  image_thumb_url?: string;
  image_url?: string;
  nutriments?: OffNutriments;
};

function num(v: number | string | undefined): number | undefined {
  if (v == null || v === '') return undefined;
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : undefined;
}

function clampPct(n: number | undefined): number | undefined {
  if (n == null) return undefined;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return n;
}

function mapToOffProduct(p: OffSearchProduct): OffProduct | null {
  const code = p.code?.trim();
  const name = p.product_name?.trim();
  if (!code || !name) return null;

  const protein = clampPct(num(p.nutriments?.proteins_100g)) ?? 0;
  const carbs   = clampPct(num(p.nutriments?.carbohydrates_100g)) ?? 0;
  const fat     = clampPct(num(p.nutriments?.fat_100g)) ?? 0;
  let kcal      = num(p.nutriments?.['energy-kcal_100g']);

  // Fallback: si OFF no tiene kcal, calcular desde macros (Atwater).
  if (kcal == null || kcal <= 0) {
    kcal = protein * 4 + carbs * 4 + fat * 9;
  }
  if (!Number.isFinite(kcal) || kcal <= 0 || kcal > 1000) return null;

  return {
    code,
    name,
    brand: p.brands?.split(',')[0]?.trim() || undefined,
    image_url: p.image_url || p.image_thumb_url || undefined,
    kcal_per_100g: Math.round(kcal),
    protein_per_100g: Math.round(protein * 10) / 10,
    carbs_per_100g:   Math.round(carbs   * 10) / 10,
    fat_per_100g:     Math.round(fat     * 10) / 10,
    sugars_per_100g:  num(p.nutriments?.sugars_100g),
    fiber_per_100g:   num(p.nutriments?.fiber_100g),
  };
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': UA, Accept: 'application/json' },
    });
  } finally {
    clearTimeout(t);
  }
}

/** Búsqueda por texto en Open Food Facts. Tolera errores de red devolviendo []. */
export async function searchFoodByText(query: string): Promise<OffProduct[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const url =
    `${OFF_BASE}/cgi/search.pl` +
    `?search_terms=${encodeURIComponent(q)}` +
    `&search_simple=1&action=process&json=1&page_size=20` +
    `&fields=code,product_name,brands,image_thumb_url,image_url,nutriments`;
  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) return [];
    const data = (await res.json()) as { products?: OffSearchProduct[] };
    return (data.products ?? [])
      .map(mapToOffProduct)
      .filter((p): p is OffProduct => p !== null);
  } catch {
    return [];
  }
}

/** Lookup por código de barras. Null si no existe o si la red falla. */
export async function lookupFoodByBarcode(barcode: string): Promise<OffProduct | null> {
  const code = barcode.trim();
  if (!code) return null;
  const url =
    `${OFF_BASE}/api/v2/product/${encodeURIComponent(code)}.json` +
    `?fields=code,product_name,brands,image_url,nutriments`;
  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) return null;
    const data = (await res.json()) as { status?: number; product?: OffSearchProduct };
    if (data.status !== 1 || !data.product) return null;
    return mapToOffProduct({ ...data.product, code: data.product.code ?? code });
  } catch {
    return null;
  }
}

/**
 * Inserta o actualiza el producto OFF en food_items y devuelve su id.
 * Idempotente por (source, external_id).
 */
export async function upsertOffProductAsFoodItem(p: OffProduct): Promise<string> {
  const { data, error } = await supabase
    .from('food_items')
    .upsert(
      {
        source: 'openfoodfacts',
        external_id: p.code,
        name: p.name,
        brand: p.brand ?? null,
        image_url: p.image_url ?? null,
        kcal_per_100g:    p.kcal_per_100g,
        protein_per_100g: p.protein_per_100g,
        carbs_per_100g:   p.carbs_per_100g,
        fat_per_100g:     p.fat_per_100g,
        sugars_per_100g:  p.sugars_per_100g ?? null,
        fiber_per_100g:   p.fiber_per_100g ?? null,
      },
      { onConflict: 'source,external_id' },
    )
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}
