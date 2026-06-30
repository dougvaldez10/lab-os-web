const fs = require('fs');
let content = fs.readFileSync('src/app/actions/cases.js', 'utf8');

const imports = `import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { toZonedTime } from 'date-fns-tz';
import { addMinutes } from 'date-fns';`;

content = content.replace(
  "import { revalidatePath } from 'next/cache';\nimport { createClient } from '@supabase/supabase-js';",
  imports
);

const oldRegistrarTermino = `async function registrarTermino(supabase, caseId, departamento, nextDept) {
  if (!departamento || departamento === 'Facturación') return;
  try {
    // 1. Obtener la hora_inicio para calcular minutos
    const { data: registro } = await supabase
      .from('casos_tiempos_historicos')
      .select('id, hora_inicio')
      .eq('id_caso', caseId)
      .eq('departamento', departamento)
      .is('hora_termino', null)
      .order('hora_inicio', { ascending: false })
      .limit(1)
      .single();

    if (registro && registro.hora_inicio) {
      const inicio = new Date(registro.hora_inicio);
      const termino = new Date();
      const diffMs = termino - inicio;
      const mins = Math.round(diffMs / 60000);

      // 2. Actualizar registro con hora_termino y minutos
      await supabase
        .from('casos_tiempos_historicos')
        .update({
          hora_termino: termino.toISOString(),
          minutos_totales: mins,
          departamento_siguiente: nextDept || null
        })
        .eq('id', registro.id);
    }
  } catch (err) {
    console.error('[Historico] Exception registrarTermino:', err);
  }
}`;

const newTimeFunctions = `function calculateTimeSegments(inicioStr, terminoStr) {
  const TIMEZONE = 'America/Tijuana';
  let startUTC = new Date(inicioStr);
  let endUTC = terminoStr ? new Date(terminoStr) : new Date();

  if (startUTC >= endUTC) {
      return { minutos_habiles: 0, minutos_extra: 0 };
  }

  let minutos_habiles = 0;
  let minutos_extra = 0;

  let current = toZonedTime(startUTC, TIMEZONE);
  let end = toZonedTime(endUTC, TIMEZONE);

  while (current < end) {
      const dayOfWeek = current.getDay();
      const hour = current.getHours();
      const minute = current.getMinutes();
      
      const isWeekday = dayOfWeek !== 0 && dayOfWeek !== 6;
      const isWorkingHour = hour >= 9 && (hour < 16 || (hour === 16 && minute < 30));

      if (isWeekday && isWorkingHour) {
          minutos_habiles++;
      } else {
          minutos_extra++;
      }

      current = addMinutes(current, 1);
  }

  return { minutos_habiles, minutos_extra };
}

async function registrarTermino(supabase, caseId, departamento, nextDept, isPause = false, motivoPausa = null) {
  if (!departamento || departamento === 'Facturación') return;
  try {
    const { data: registro } = await supabase
      .from('casos_tiempos_historicos')
      .select('id, hora_inicio')
      .eq('id_caso', caseId)
      .eq('departamento', departamento)
      .is('hora_termino', null)
      .order('hora_inicio', { ascending: false })
      .limit(1)
      .single();

    if (registro && registro.hora_inicio) {
      const terminoStr = new Date().toISOString();
      const { minutos_habiles, minutos_extra } = calculateTimeSegments(registro.hora_inicio, terminoStr);
      const minutos_totales = minutos_habiles + minutos_extra;

      const updateData = {
        hora_termino: terminoStr,
        minutos_habiles: minutos_habiles,
        minutos_extra: minutos_extra,
        minutos_totales: minutos_totales
      };

      if (!isPause) {
        updateData.departamento_siguiente = nextDept || null;
      } else {
        updateData.motivo_pausa = motivoPausa;
      }

      await supabase
        .from('casos_tiempos_historicos')
        .update(updateData)
        .eq('id', registro.id);
    }
  } catch (err) {
    console.error('[Historico] Exception registrarTermino:', err);
  }
}`;

content = content.replace(oldRegistrarTermino, newTimeFunctions);

const oldSignature = 'export async function updateCaseState(internalId, action, operatorName = null) {';
const newSignature = 'export async function updateCaseState(internalId, action, operatorName = null, motivoPausa = null) {';
content = content.replace(oldSignature, newSignature);

const oldHistoricosCall = "if (action === 'START') { registrarInicio(supabase, internalId, _deptoActualForHistorico).catch(() => {}); } else if (action === 'COMPLETE') { registrarTermino(supabase, internalId, _deptoActualForHistorico, _nextDeptForHistorico).catch(() => {}); }";
const newHistoricosCall = `if (action === 'START') { 
      registrarInicio(supabase, internalId, _deptoActualForHistorico).catch(() => {}); 
    } else if (action === 'COMPLETE') { 
      registrarTermino(supabase, internalId, _deptoActualForHistorico, _nextDeptForHistorico).catch(() => {}); 
    } else if (action === 'PAUSE') {
      registrarTermino(supabase, internalId, _deptoActualForHistorico, null, true, motivoPausa).catch(() => {}); 
    }`;

content = content.replace(oldHistoricosCall, newHistoricosCall);

fs.writeFileSync('src/app/actions/cases.js', content);
