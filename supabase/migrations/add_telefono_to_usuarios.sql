-- Añadir columna 'telefono' a la tabla 'usuarios'
-- Formato esperado: '+52 (XXX) XXX XXXX'
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS telefono TEXT;
