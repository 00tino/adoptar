import type { Metadata } from "next";
import Link from "next/link";
import { listarReportes, resolverReporte } from "@/lib/acciones-reportes";
import BotonEnvio from "@/components/BotonEnvio";

export const metadata: Metadata = { title: "Reportes — Admin", robots: { index: false } };

export default async function PaginaReportes({ searchParams }: { searchParams: Promise<{ pagina?: string }> }) {
  const params = await searchParams;
  const pagina = Math.max(1, Math.floor(Number(params.pagina) || 1));
  const { reportes, total } = await listarReportes(pagina);
  const motivos: Record<string, string> = { fraude: "Posible estafa", maltrato: "Maltrato o riesgo", datos_incorrectos: "Datos incorrectos", otro: "Otro motivo" };
  return (
    <div className="mt-8">
      <h2 className="font-display text-2xl font-black">Reportes pendientes ({total})</h2>
      <p className="mt-2 text-tinta-suave">Revisá la ficha antes de decidir. Para darla de baja, usá su gestión de animales.</p>
      <div className="mt-5 space-y-4">
        {!reportes.length && <p className="rounded-2xl bg-crema-2/60 p-6">No hay reportes pendientes en esta página.</p>}
        {reportes.map((r) => {
          const animal = Array.isArray(r.animales) ? r.animales[0] : r.animales;
          const usuario = Array.isArray(r.usuarios) ? r.usuarios[0] : r.usuarios;
          return (
            <article key={r.id} className="rounded-2xl border-2 border-crema-2 bg-blanco-calido p-5">
              <h3 className="font-display text-xl font-bold">{animal?.nombre ?? "Publicación eliminada"} · {motivos[r.motivo]}</h3>
              <p className="mt-1 text-sm text-tinta-suave">{usuario?.nombre} · {new Date(r.creado_el).toLocaleDateString("es-AR")} · {animal?.estado}</p>
              <p className="mt-3 whitespace-pre-wrap break-words">{r.detalle}</p>
              {animal && <div className="mt-3 flex flex-wrap gap-4">
                <Link href={`/animales/${animal.slug}`} className="py-3 font-bold underline">Ver ficha</Link>
                <Link href={`/admin/animales?q=${encodeURIComponent(animal.slug)}`} className="py-3 font-bold underline">Gestionar publicación</Link>
              </div>}
              <div className="mt-3 flex flex-wrap gap-3">
                {[{ estado: "resuelto", texto: "Marcar resuelto" }, { estado: "descartado", texto: "Descartar reporte" }].map((opcion) => (
                  <form key={opcion.estado} action={resolverReporte}>
                    <input type="hidden" name="id" value={r.id} /><input type="hidden" name="estado" value={opcion.estado} />
                    <BotonEnvio className="min-h-11 rounded-full border-2 border-crema-2 px-4 py-2 font-bold">{opcion.texto}</BotonEnvio>
                  </form>
                ))}
              </div>
            </article>
          );
        })}
      </div>
      <nav aria-label="Páginas de reportes" className="mt-6 flex gap-5">
        {pagina > 1 && <Link href={`/admin/reportes?pagina=${pagina - 1}`} className="py-3 font-bold underline">Anterior</Link>}
        {pagina * 20 < total && <Link href={`/admin/reportes?pagina=${pagina + 1}`} className="py-3 font-bold underline">Siguiente</Link>}
      </nav>
    </div>
  );
}
