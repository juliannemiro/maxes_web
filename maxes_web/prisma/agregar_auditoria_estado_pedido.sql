ALTER TABLE pedido_web
  ADD COLUMN IF NOT EXISTS estado_rechazado_motivo VARCHAR(500),
  ADD COLUMN IF NOT EXISTS estado_usuario VARCHAR(100),
  ADD COLUMN IF NOT EXISTS estado_fecha TIMESTAMPTZ;

COMMENT ON COLUMN pedido_web.estado_rechazado_motivo IS
  'Motivo obligatorio cuando el administrador rechaza el pedido.';
COMMENT ON COLUMN pedido_web.estado_usuario IS
  'Usuario que realizó la última acción de aceptación o rechazo.';
COMMENT ON COLUMN pedido_web.estado_fecha IS
  'Fecha y hora de la última acción de aceptación o rechazo.';
