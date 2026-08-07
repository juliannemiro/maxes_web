-- Ejecutar únicamente en Supabase después de habilitar la integración Cron
-- (extensión pg_cron) desde el Dashboard.
--
-- La tarea corre cada 15 minutos. La condición de abandono sigue siendo de
-- 2 horas exactas desde fecha_hora_ultima_actividad.

SELECT cron.schedule(
    'maxes-marcar-carritos-abandonados',
    '*/15 * * * *',
    'SELECT public.analytics_marcar_carritos_abandonados();'
);
