import { z } from 'zod';

/**
 * Shared schemas used across the client and server boundary.
 */

export const UsernameSchema = z
  .string()
  .min(3, 'Minimo 3 caracteres')
  .max(24, 'Maximo 24 caracteres')
  .regex(/^[a-z0-9_]+$/, 'Solo minusculas, numeros y guiones bajos')
  .refine(
    (value) => !/^user_[0-9a-f]{8}$/.test(value),
    'Ese username esta reservado',
  );

export const DisplayNameSchema = z
  .string()
  .min(1, 'No puede estar vacio')
  .max(40, 'Maximo 40 caracteres');

export const EmailSchema = z.string().email('Email no valido');

export const PasswordSchema = z
  .string()
  .min(8, 'Minimo 8 caracteres')
  .max(72, 'Maximo 72 caracteres');

export const PhotoValidationResponseSchema = z.object({
  valid: z.boolean(),
  confidence: z.number().min(0).max(1),
  reason: z.string().max(200),
  unsafe: z.boolean(),
});

export type PhotoValidationResponse = z.infer<
  typeof PhotoValidationResponseSchema
>;

export const TASK_CATEGORIES = [
  'fitness',
  'study',
  'nutrition',
  'wellbeing',
  'productivity',
  'social',
] as const;

export const TaskCategorySchema = z.enum(TASK_CATEGORIES, {
  errorMap: () => ({ message: 'Categoria no valida' }),
});

export type TaskCategory = z.infer<typeof TaskCategorySchema>;

export const TASK_CATEGORY_LABELS: Record<TaskCategory, string> = {
  fitness: 'Fitness',
  study: 'Estudio',
  nutrition: 'Nutricion',
  wellbeing: 'Bienestar',
  productivity: 'Productividad',
  social: 'Social',
};

export const TASK_CATEGORY_ICONS: Record<TaskCategory, string> = {
  fitness:      '💪',
  study:        '📚',
  nutrition:    '🥗',
  wellbeing:    '🧘',
  productivity: '🎯',
  social:       '🤝',
};

// ── Time slots (Fase 14) ────────────────────────────────────────────────────

export const TIME_SLOTS = ['morning', 'afternoon', 'evening', 'anytime'] as const;
export const TimeSlotSchema = z.enum(TIME_SLOTS);
export type TimeSlot = z.infer<typeof TimeSlotSchema>;

export const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
  morning:   'Mañana',
  afternoon: 'Tarde',
  evening:   'Noche',
  anytime:   'Cualquier momento',
};

export const TIME_SLOT_ICONS: Record<TimeSlot, string> = {
  morning:   '🌅',
  afternoon: '☀️',
  evening:   '🌙',
  anytime:   '🕒',
};

/** Default razonable de slot por categoría (espejo del backfill SQL). */
export const TIME_SLOT_BY_CATEGORY: Record<TaskCategory, TimeSlot> = {
  fitness:      'afternoon',
  study:        'morning',
  productivity: 'morning',
  wellbeing:    'evening',
  social:       'evening',
  nutrition:    'anytime',
};

export const AvailabilitySchema = z.enum(['low', 'medium', 'high']);
export type Availability = z.infer<typeof AvailabilitySchema>;

export const LevelSchema = z.enum(['beginner', 'intermediate', 'advanced']);
export type Level = z.infer<typeof LevelSchema>;

export const TargetFrequencySchema = z.string().refine(
  (value) =>
    value === 'daily' ||
    /^weekly_[1-7]$/.test(value) ||
    /^days:(MON|TUE|WED|THU|FRI|SAT|SUN)(,(MON|TUE|WED|THU|FRI|SAT|SUN))*$/.test(
      value,
    ),
  { message: 'Frecuencia no valida' },
);
export type TargetFrequency = z.infer<typeof TargetFrequencySchema>;

// Fase 11A — biometría y objetivos.

export const PRIMARY_GOALS = [
  'lose_weight',
  'gain_muscle',
  'maintain',
  'performance',
  'general_health',
] as const;
export const PrimaryGoalSchema = z.enum(PRIMARY_GOALS);
export type PrimaryGoal = z.infer<typeof PrimaryGoalSchema>;

export const PRIMARY_GOAL_LABELS: Record<PrimaryGoal, string> = {
  lose_weight:    'Perder peso',
  gain_muscle:    'Ganar músculo',
  maintain:       'Mantenerme',
  performance:    'Mejorar rendimiento',
  general_health: 'Salud general',
};

export const BIOLOGICAL_SEX = ['male', 'female', 'other'] as const;
export const BiologicalSexSchema = z.enum(BIOLOGICAL_SEX);
export type BiologicalSex = z.infer<typeof BiologicalSexSchema>;

export const BIOLOGICAL_SEX_LABELS: Record<BiologicalSex, string> = {
  male:   'Hombre',
  female: 'Mujer',
  other:  'Otro / prefiero no decirlo',
};

export const EQUIPMENT_OPTIONS = [
  'none',
  'dumbbells',
  'kettlebell',
  'resistance_bands',
  'pullup_bar',
  'gym_full',
  'bicycle',
  'treadmill',
  'mat',
] as const;
export const EquipmentSchema = z.enum(EQUIPMENT_OPTIONS);
export type Equipment = z.infer<typeof EquipmentSchema>;

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  none:             'Sin equipo',
  dumbbells:        'Mancuernas',
  kettlebell:       'Kettlebell',
  resistance_bands: 'Bandas elásticas',
  pullup_bar:       'Barra de dominadas',
  gym_full:         'Gimnasio completo',
  bicycle:          'Bicicleta',
  treadmill:        'Cinta',
  mat:              'Esterilla',
};

export const EQUIPMENT_ICONS: Record<Equipment, string> = {
  none:             '🚫',
  dumbbells:        '🏋️',
  kettlebell:       '🛎️',
  resistance_bands: '🪢',
  pullup_bar:       '🤸',
  gym_full:         '🏟️',
  bicycle:          '🚴',
  treadmill:        '🏃',
  mat:              '🧘',
};

export const RESTRICTION_OPTIONS = [
  'knee',
  'lower_back',
  'shoulder',
  'neck',
  'wrist',
  'ankle',
  'pregnancy',
  'cardiac',
  'none',
] as const;
export const RestrictionSchema = z.enum(RESTRICTION_OPTIONS);
export type Restriction = z.infer<typeof RestrictionSchema>;

export const RESTRICTION_LABELS: Record<Restriction, string> = {
  knee:       'Rodilla',
  lower_back: 'Lumbar',
  shoulder:   'Hombro',
  neck:       'Cervical',
  wrist:      'Muñeca',
  ankle:      'Tobillo',
  pregnancy:  'Embarazo',
  cardiac:    'Cardiaco',
  none:       'Ninguna',
};

const today = () => new Date();
const minBirthDate = new Date('1900-01-01');
const maxBirthDate = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 13);
  return d;
};

export const BirthDateSchema = z
  .string() // ISO yyyy-mm-dd
  .refine(
    (v) => {
      const d = new Date(v + 'T00:00:00.000Z');
      return !isNaN(d.getTime()) && d >= minBirthDate && d <= maxBirthDate();
    },
    { message: 'Fecha no válida o usuario menor de 13 años' },
  );

export const HeightCmSchema = z.number().min(80).max(250);
export const WeightKgSchema = z.number().min(25).max(300);
export const WeeklyDaysSchema = z.number().int().min(1).max(7);
export const DailyMinutesSchema = z.number().int().min(5).max(300);

export const OnboardingAnswersSchema = z.object({
  goals: z.array(TaskCategorySchema).min(1, 'Elige al menos un objetivo'),
  availability: AvailabilitySchema,
  level: LevelSchema,
  preferences: z
    .object({
      categories: z.array(TaskCategorySchema).default([]),
    })
    .default({ categories: [] }),
  // Fase 11A — todos opcionales para no romper compat hacia atrás.
  birth_date:     BirthDateSchema.optional(),
  biological_sex: BiologicalSexSchema.optional(),
  height_cm:      HeightCmSchema.optional(),
  weight_kg:      WeightKgSchema.optional(),
  primary_goal:   PrimaryGoalSchema.optional(),
  weekly_days:    WeeklyDaysSchema.optional(),
  daily_minutes:  DailyMinutesSchema.optional(),
  equipment:      z.array(EquipmentSchema).default([]).optional(),
  restrictions:   z.array(RestrictionSchema).default([]).optional(),
});
export type OnboardingAnswers = z.infer<typeof OnboardingAnswersSchema>;

// ── Modules (Fase 15) ───────────────────────────────────────────────────────

export const MODULES = ['generic', 'gym', 'study', 'nutrition'] as const;
export const ModuleSchema = z.enum(MODULES);
export type Module = z.infer<typeof ModuleSchema>;

// ── Study techniques (Fase 15) ──────────────────────────────────────────────

export const STUDY_TECHNIQUES = ['pomodoro_25_5', 'pomodoro_50_10', 'custom'] as const;
export const StudyTechniqueSchema = z.enum(STUDY_TECHNIQUES);
export type StudyTechnique = z.infer<typeof StudyTechniqueSchema>;

export const STUDY_TECHNIQUE_PRESETS: Record<
  Exclude<StudyTechnique, 'custom'>,
  { focus: number; break: number; cycles: number; label: string }
> = {
  pomodoro_25_5:  { focus: 25, break: 5,  cycles: 4, label: 'Pomodoro 25/5' },
  pomodoro_50_10: { focus: 50, break: 10, cycles: 2, label: 'Bloque 50/10' },
};

// ── Fasting (Fase 16) ───────────────────────────────────────────────────────

export const FASTING_PROTOCOLS = [
  '16_8', '14_10', '18_6', '20_4', 'omad', '5_2', 'custom',
] as const;
export const FastingProtocolSchema = z.enum(FASTING_PROTOCOLS);
export type FastingProtocol = z.infer<typeof FastingProtocolSchema>;

export const FASTING_PROTOCOL_LABELS: Record<FastingProtocol, string> = {
  '16_8':   '16:8 — 16h ayuno · 8h ventana',
  '14_10':  '14:10 — más suave',
  '18_6':   '18:6 — más estricto',
  '20_4':   '20:4 — Warrior',
  'omad':   'OMAD — una comida al día',
  '5_2':    '5:2 — 5 días normal · 2 bajos',
  'custom': 'Personalizado',
};

export const FASTING_PROTOCOL_SHORT: Record<FastingProtocol, string> = {
  '16_8':   '16:8',
  '14_10':  '14:10',
  '18_6':   '18:6',
  '20_4':   '20:4',
  'omad':   'OMAD',
  '5_2':    '5:2',
  'custom': 'Personalizado',
};

export const FASTING_PRESET_HOURS: Record<
  Exclude<FastingProtocol, '5_2' | 'custom'>,
  { fast: number; eat: number }
> = {
  '16_8':  { fast: 16, eat: 8 },
  '14_10': { fast: 14, eat: 10 },
  '18_6':  { fast: 18, eat: 6 },
  '20_4':  { fast: 20, eat: 4 },
  'omad':  { fast: 23, eat: 1 },
};

export const FASTING_STATUSES = ['completed', 'broken_early'] as const;
export const FastingStatusSchema = z.enum(FASTING_STATUSES);
export type FastingStatus = z.infer<typeof FastingStatusSchema>;

export const WEEKDAY_KEYS = ['MON','TUE','WED','THU','FRI','SAT','SUN'] as const;
export const WeekdayKeySchema = z.enum(WEEKDAY_KEYS);
export type WeekdayKey = z.infer<typeof WeekdayKeySchema>;

export const WEEKDAY_LABELS: Record<WeekdayKey, string> = {
  MON: 'Lun', TUE: 'Mar', WED: 'Mié', THU: 'Jue',
  FRI: 'Vie', SAT: 'Sáb', SUN: 'Dom',
};

const HHMM_RE = /^\d{2}:\d{2}(:\d{2})?$/;

export const FastingProtocolInputSchema = z
  .object({
    protocol: FastingProtocolSchema,
    eat_start: z.string().regex(HHMM_RE).optional(),
    eat_end:   z.string().regex(HHMM_RE).optional(),
    low_cal_days: z.array(WeekdayKeySchema).optional(),
    notify_before_close: z.boolean().default(true),
    notify_on_complete:  z.boolean().default(true),
    timezone: z.string().min(1).default('Europe/Madrid'),
  })
  .refine(
    (v) =>
      v.protocol === '5_2'
        ? (v.low_cal_days?.length ?? 0) > 0
        : !!v.eat_start && !!v.eat_end,
    { message: 'Faltan campos obligatorios para el protocolo elegido' },
  );
export type FastingProtocolInput = z.infer<typeof FastingProtocolInputSchema>;

// ── Routine design wizard (Fase 15) ─────────────────────────────────────────

export const TASK_SOURCES = ['catalog', 'user'] as const;
export const TaskSourceSchema = z.enum(TASK_SOURCES);
export type TaskSource = z.infer<typeof TaskSourceSchema>;

export const USER_TASK_SOURCES = ['wizard', 'manual', 'custom'] as const;
export const UserTaskSourceSchema = z.enum(USER_TASK_SOURCES);
export type UserTaskSource = z.infer<typeof UserTaskSourceSchema>;

export const WIZARD_SLOTS = ['morning', 'afternoon', 'evening'] as const;
export const WizardSlotSchema = z.enum(WIZARD_SLOTS);
export type WizardSlot = z.infer<typeof WizardSlotSchema>;

/**
 * Lo que el wizard genera y envía a la RPC apply_wizard_proposal.
 * Si `catalog_slug` está, se enlaza a tasks_catalog (preserva integraciones
 * de Fase 14 nutrición y módulos study/gym). Si no, se crea user_task.
 */
export const ProposedTaskSchema = z.object({
  title:          z.string().min(2).max(80),
  description:    z.string().max(280).optional(),
  category:       TaskCategorySchema,
  module:         ModuleSchema.default('generic'),
  base_points:    z.number().int().min(1).max(30).default(5),
  target_frequency: TargetFrequencySchema.default('daily'),
  catalog_slug:   z.string().optional(),
});
export type ProposedTask = z.infer<typeof ProposedTaskSchema>;

// ── Nutrition (Fase 14) ─────────────────────────────────────────────────────

export const MEAL_TYPES = ['breakfast', 'lunch', 'snack', 'dinner'] as const;
export const MealTypeSchema = z.enum(MEAL_TYPES);
export type MealType = z.infer<typeof MealTypeSchema>;

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Desayuno',
  lunch:     'Almuerzo',
  snack:     'Merienda',
  dinner:    'Cena',
};

export const MEAL_TYPE_ICONS: Record<MealType, string> = {
  breakfast: '🥐',
  lunch:     '🍽️',
  snack:     '🍎',
  dinner:    '🍲',
};

export const MEAL_TYPE_ORDER: readonly MealType[] = ['breakfast', 'lunch', 'snack', 'dinner'];

export const FOOD_ITEM_SOURCES = ['openfoodfacts', 'user'] as const;
export const FoodItemSourceSchema = z.enum(FOOD_ITEM_SOURCES);
export type FoodItemSource = z.infer<typeof FoodItemSourceSchema>;

export const QuantityGramsSchema = z.number().positive().max(5000);

export const CustomFoodSchema = z.object({
  name:             z.string().min(2, 'Mínimo 2 caracteres').max(80),
  brand:            z.string().max(80).optional(),
  kcal_per_100g:    z.number().min(0).max(900),
  protein_per_100g: z.number().min(0).max(100),
  carbs_per_100g:   z.number().min(0).max(100),
  fat_per_100g:     z.number().min(0).max(100),
});
export type CustomFoodInput = z.infer<typeof CustomFoodSchema>;

export const NutritionTargetsManualSchema = z.object({
  daily_kcal:       z.number().min(800).max(6000),
  daily_protein_g:  z.number().min(20).max(500),
  daily_carbs_g:    z.number().min(20).max(1000),
  daily_fat_g:      z.number().min(10).max(300),
});
export type NutritionTargetsManualInput = z.infer<typeof NutritionTargetsManualSchema>;

void today;

export { z };
