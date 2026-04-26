-- BeProud · Fase 11A — biometría opcional + objetivo + equipment + restrictions
-- en profiles. Los CHECKs validan rangos sensatos; arrays sin CHECK porque
-- la lista de equipos/restricciones vive en packages/validation (cliente).

alter table public.profiles
  add column if not exists birth_date     date,
  add column if not exists biological_sex text
    check (biological_sex in ('male','female','other')),
  add column if not exists height_cm      numeric(5,2)
    check (height_cm is null or (height_cm between 80 and 250)),
  add column if not exists weight_kg      numeric(5,2)
    check (weight_kg is null or (weight_kg between 25 and 300)),
  add column if not exists primary_goal   text
    check (primary_goal in ('lose_weight','gain_muscle','maintain','performance','general_health')),
  add column if not exists weekly_days    integer
    check (weekly_days is null or (weekly_days between 1 and 7)),
  add column if not exists daily_minutes  integer
    check (daily_minutes is null or (daily_minutes between 5 and 300)),
  add column if not exists equipment      text[] not null default '{}',
  add column if not exists restrictions   text[] not null default '{}';
