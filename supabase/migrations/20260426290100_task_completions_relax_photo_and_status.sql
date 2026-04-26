-- BeProud · Fase 15 — task_completions admite filas sin foto (sesiones de
-- estudio Pomodoro) y un nuevo estado 'auto_validated' usado por flujos
-- determinísticos de validación (timer cumplido = válido).

alter table public.task_completions
  alter column photo_path drop not null;

alter table public.task_completions
  drop constraint if exists task_completions_ai_validation_status_check;
alter table public.task_completions
  add constraint task_completions_ai_validation_status_check
  check (ai_validation_status in ('pending','valid','invalid','skipped','auto_validated'));
