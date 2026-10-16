import "server-only";
import { createClient } from "@supabase/supabase-js";
import { emailAlertaAdopcion } from "./emails";
import { registrarError } from "./monitoreo";

/** Se llama solo al pasar de no publicado a disponible. No es una server action. */
export async function notificarAlertasAdopcion(animalId: string) {
  try {
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data: animal, error } = await sb.from("animales")
      .select("id,nombre,especie,ciudad,provincia,slug,tipo,estado")
      .eq("id", animalId).eq("tipo", "adopcion").eq("estado", "disponible").maybeSingle();
    if (error) throw error;
    if (!animal) return;
    // Paginado para no perder suscriptores por el límite de filas de Supabase.
    for (let desde = 0; ; desde += 100) {
      const { data: alertas, error: consulta } = await sb.from("alertas_adopcion")
        .select("id,usuarios!inner(email,suspendido)")
        .eq("activa", true).eq("usuarios.suspendido", false)
        .or(`especie.is.null,especie.eq.${animal.especie}`)
        .or(`provincia.is.null,provincia.ilike."${animal.provincia.replace(/["\\%_]/g, "")}"`)
        .order("id").range(desde, desde + 99);
      if (consulta) throw consulta;
      for (const alerta of alertas ?? []) {
        const usuario = Array.isArray(alerta.usuarios) ? alerta.usuarios[0] : alerta.usuarios;
        if (!usuario?.email) continue;
        const { data: envio, error: reserva } = await sb.from("envios_alertas_adopcion")
          .upsert({ alerta_id: alerta.id, animal_id: animal.id }, { onConflict: "alerta_id,animal_id", ignoreDuplicates: true })
          .select("alerta_id").maybeSingle();
        if (reserva) throw reserva;
        if (!envio) continue;
        const enviado = await emailAlertaAdopcion(usuario.email, animal);
        if (!enviado) {
          const { error: limpieza } = await sb.from("envios_alertas_adopcion").delete().eq("alerta_id", alerta.id).eq("animal_id", animal.id);
          if (limpieza) throw limpieza;
          await registrarError({ contexto: "alertas-adopcion", mensaje: "No se pudo entregar un aviso de adopción." });
        }
      }
      if (!alertas || alertas.length < 100) break;
    }
  } catch (error) {
    await registrarError({ contexto: "alertas-adopcion", mensaje: error instanceof Error ? error.message : "Falló la notificación de adopción." });
  }
}
