import { supabase } from './client';
import {
  CustomFoodSchema,
  type CustomFoodInput,
  type MealType,
  type NutritionTargetsManualInput,
} from '@beproud/validation';

// ── Types ────────────────────────────────────────────────────────────────────

export type FoodItem = {
  id: string;
  source: 'openfoodfacts' | 'user';
  external_id: string | null;
  name: string;
  brand: string | null;
  image_url: string | null;
  serving_size_g: number | null;
  kcal_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  sugars_per_100g: number | null;
  fiber_per_100g: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type MealLog = {
  id: string;
  user_id: string;
  meal_type: MealType;
  log_date: string;
  eaten_at: string;
  notes: string | null;
  created_at: string;
};

export type MealLogItem = {
  id: string;
  meal_log_id: string;
  user_id: string;
  food_item_id: string;
  quantity_g: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  created_at: string;
};

export type MealLogWithItems = MealLog & {
  items: (MealLogItem & { food: FoodItem })[];
};

export type NutritionTarget = {
  user_id: string;
  daily_kcal: number;
  daily_protein_g: number;
  daily_carbs_g: number;
  daily_fat_g: number;
  source: 'auto' | 'manual';
  computed_at: string;
  updated_at: string;
};

export type DayTotals = {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  per_meal: Record<MealType, { kcal: number; items: number }>;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function todayLocalISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const id = data.user?.id;
  if (!id) throw new Error('not_authenticated');
  return id;
}

function emptyPerMeal(): DayTotals['per_meal'] {
  return {
    breakfast: { kcal: 0, items: 0 },
    lunch:     { kcal: 0, items: 0 },
    snack:     { kcal: 0, items: 0 },
    dinner:    { kcal: 0, items: 0 },
  };
}

// ── Targets ──────────────────────────────────────────────────────────────────

export async function fetchTargets(): Promise<NutritionTarget | null> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('nutrition_targets')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return (data as NutritionTarget | null) ?? null;
}

export async function recomputeTargets(force = false): Promise<NutritionTarget> {
  const { data, error } = await supabase.rpc('compute_nutrition_targets', {
    p_force: force,
  });
  if (error) throw error;
  return data as NutritionTarget;
}

export async function updateTargetsManual(
  input: NutritionTargetsManualInput,
): Promise<NutritionTarget> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('nutrition_targets')
    .upsert(
      {
        user_id: userId,
        daily_kcal:      input.daily_kcal,
        daily_protein_g: input.daily_protein_g,
        daily_carbs_g:   input.daily_carbs_g,
        daily_fat_g:     input.daily_fat_g,
        source: 'manual',
        computed_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
    .select('*')
    .single();
  if (error) throw error;
  return data as NutritionTarget;
}

// ── Meals ────────────────────────────────────────────────────────────────────

export async function fetchTodayMeals(date?: string): Promise<MealLogWithItems[]> {
  const userId = await requireUserId();
  const d = date ?? todayLocalISO();
  const { data, error } = await supabase
    .from('meal_logs')
    .select(
      `
      id, user_id, meal_type, log_date, eaten_at, notes, created_at,
      items:meal_log_items (
        id, meal_log_id, user_id, food_item_id, quantity_g,
        kcal, protein_g, carbs_g, fat_g, created_at,
        food:food_items (
          id, source, external_id, name, brand, image_url, serving_size_g,
          kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g,
          sugars_per_100g, fiber_per_100g, created_by, created_at, updated_at
        )
      )
    `,
    )
    .eq('user_id', userId)
    .eq('log_date', d);
  if (error) throw error;
  return (data ?? []) as unknown as MealLogWithItems[];
}

export async function getOrCreateMealLog(
  mealType: MealType,
  date?: string,
): Promise<MealLog> {
  const userId = await requireUserId();
  const d = date ?? todayLocalISO();

  const { data: existing, error: selErr } = await supabase
    .from('meal_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('meal_type', mealType)
    .eq('log_date', d)
    .maybeSingle();
  if (selErr) throw selErr;
  if (existing) return existing as MealLog;

  const { data, error } = await supabase
    .from('meal_logs')
    .insert({ user_id: userId, meal_type: mealType, log_date: d })
    .select('*')
    .single();
  if (error) throw error;
  return data as MealLog;
}

export async function addFoodToMeal(input: {
  mealType: MealType;
  foodItemId: string;
  quantityG: number;
  date?: string;
}): Promise<MealLogItem> {
  const userId = await requireUserId();
  const meal = await getOrCreateMealLog(input.mealType, input.date);

  const { data: food, error: foodErr } = await supabase
    .from('food_items')
    .select('kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g')
    .eq('id', input.foodItemId)
    .single();
  if (foodErr) throw foodErr;

  const factor = input.quantityG / 100;
  const kcal      = Math.round(food.kcal_per_100g * factor * 10) / 10;
  const protein_g = Math.round(food.protein_per_100g * factor * 10) / 10;
  const carbs_g   = Math.round(food.carbs_per_100g * factor * 10) / 10;
  const fat_g     = Math.round(food.fat_per_100g * factor * 10) / 10;

  const { data, error } = await supabase
    .from('meal_log_items')
    .insert({
      meal_log_id: meal.id,
      user_id: userId,
      food_item_id: input.foodItemId,
      quantity_g: input.quantityG,
      kcal, protein_g, carbs_g, fat_g,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as MealLogItem;
}

export async function removeMealLogItem(itemId: string): Promise<void> {
  const { error } = await supabase.from('meal_log_items').delete().eq('id', itemId);
  if (error) throw error;
}

export async function updateMealLogItemQuantity(
  itemId: string,
  quantityG: number,
): Promise<MealLogItem> {
  const { data: existing, error: selErr } = await supabase
    .from('meal_log_items')
    .select('food_item_id')
    .eq('id', itemId)
    .single();
  if (selErr) throw selErr;

  const { data: food, error: foodErr } = await supabase
    .from('food_items')
    .select('kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g')
    .eq('id', existing.food_item_id)
    .single();
  if (foodErr) throw foodErr;

  const factor = quantityG / 100;
  const kcal      = Math.round(food.kcal_per_100g * factor * 10) / 10;
  const protein_g = Math.round(food.protein_per_100g * factor * 10) / 10;
  const carbs_g   = Math.round(food.carbs_per_100g * factor * 10) / 10;
  const fat_g     = Math.round(food.fat_per_100g * factor * 10) / 10;

  const { data, error } = await supabase
    .from('meal_log_items')
    .update({ quantity_g: quantityG, kcal, protein_g, carbs_g, fat_g })
    .eq('id', itemId)
    .select('*')
    .single();
  if (error) throw error;
  return data as MealLogItem;
}

// ── Food items ───────────────────────────────────────────────────────────────

export async function searchLocalFoodItems(query: string): Promise<FoodItem[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const { data, error } = await supabase
    .from('food_items')
    .select('*')
    .ilike('name', `%${q}%`)
    .order('updated_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []) as FoodItem[];
}

export async function getFoodItem(id: string): Promise<FoodItem> {
  const { data, error } = await supabase
    .from('food_items')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as FoodItem;
}

export async function createCustomFood(input: CustomFoodInput): Promise<FoodItem> {
  const parsed = CustomFoodSchema.parse(input);
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('food_items')
    .insert({
      source: 'user',
      external_id: null,
      name: parsed.name,
      brand: parsed.brand ?? null,
      kcal_per_100g:    parsed.kcal_per_100g,
      protein_per_100g: parsed.protein_per_100g,
      carbs_per_100g:   parsed.carbs_per_100g,
      fat_per_100g:     parsed.fat_per_100g,
      created_by: userId,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as FoodItem;
}

/** Alimentos que el user ha registrado recientemente, dedupeados por food_item_id. */
export async function fetchRecentFoodsForUser(limit = 10): Promise<FoodItem[]> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('meal_log_items')
    .select(
      `
      food_item_id, created_at,
      food:food_items (
        id, source, external_id, name, brand, image_url, serving_size_g,
        kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g,
        sugars_per_100g, fiber_per_100g, created_by, created_at, updated_at
      )
    `,
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit * 4);
  if (error) throw error;

  const seen = new Set<string>();
  const out: FoodItem[] = [];
  for (const row of (data ?? []) as unknown as Array<{ food: FoodItem | null }>) {
    if (!row.food || seen.has(row.food.id)) continue;
    seen.add(row.food.id);
    out.push(row.food);
    if (out.length >= limit) break;
  }
  return out;
}

// ── Totals ───────────────────────────────────────────────────────────────────

export async function fetchTodayTotals(date?: string): Promise<DayTotals> {
  const meals = await fetchTodayMeals(date);
  const totals: DayTotals = {
    kcal: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    per_meal: emptyPerMeal(),
  };
  for (const meal of meals) {
    let mealKcal = 0;
    for (const it of meal.items) {
      totals.kcal      += it.kcal;
      totals.protein_g += it.protein_g;
      totals.carbs_g   += it.carbs_g;
      totals.fat_g     += it.fat_g;
      mealKcal         += it.kcal;
    }
    totals.per_meal[meal.meal_type] = {
      kcal: mealKcal,
      items: meal.items.length,
    };
  }
  return totals;
}
