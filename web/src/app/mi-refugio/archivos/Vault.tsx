"use client";

import { useState } from "react";
import {
  subirArchivoVault,
  borrarArchivo,
  urlDescarga,
  type ArchivoVault,
} from "@/lib/acciones-archivos";

function tamanoLegible(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Vault({ archivos }: { archivos: ArchivoVault[] }) {
  const [error, setError] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [descargando, setDescargando] = useState<string | null>(null);

  async function alSubir(formData: FormData) {
    setError(null);
    setSubiendo(true);
    try {
      await subirArchivoVault(formData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos subir el archivo.");
    } finally {
      setSubiendo(false);
    }
  }

  async function descargar(id: string) {
    setDescargando(id);
    try {
      const url = await urlDescarga(id);
      window.open(url, "_blank", "noopener");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos descargar.");
    } finally {
      setDescargando(null);
    }
  }

  return (
    <div className="mt-4">
      <form action={alSubir} className="flex flex-wrap items-center gap-3">
        <input
          type="file"
          name="archivo"
          required
          className="flex-1 min-w-0 rounded-xl border-2 border-crema-2 bg-blanco-calido px-4 py-3 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-crema-2 file:px-4 file:py-1.5 file:font-bold"
        />
        <button
          type="submit"
          disabled={subiendo}
          className="rounded-full bg-terracota-oscuro px-6 py-3 font-bold text-blanco-calido hover:bg-terracota-mas-oscuro transition-colors disabled:opacity-60"
        >
          {subiendo ? "Subiendo…" : "Subir archivo"}
        </button>
      </form>

      {error && (
        <p className="mt-3 rounded-xl bg-terracota/10 border-2 border-terracota/40 px-4 py-2 text-sm text-terracota-oscuro">
          {error}
        </p>
      )}

      {archivos.length === 0 ? (
        <p className="mt-4 text-tinta-suave">Todavía no subiste ningún archivo.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {archivos.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl bg-blanco-calido border-2 border-crema-2 p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{a.nombre}</p>
                <p className="text-xs text-tinta-suave">
                  {tamanoLegible(a.tamanoBytes)} ·{" "}
                  {new Date(a.creadoEl).toLocaleDateString("es-AR")}
                  {a.importable && " · importable 📊"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => descargar(a.id)}
                disabled={descargando === a.id}
                className="rounded-full border-2 border-crema-2 px-4 py-1.5 text-sm font-bold hover:bg-crema-2 transition-colors disabled:opacity-60"
              >
                {descargando === a.id ? "…" : "Descargar"}
              </button>
              <form action={borrarArchivo}>
                <input type="hidden" name="id" value={a.id} />
                <button
                  type="submit"
                  className="rounded-full border-2 border-terracota px-4 py-1.5 text-sm font-bold text-terracota-oscuro hover:bg-terracota-mas-oscuro hover:text-blanco-calido transition-colors"
                >
                  Borrar
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
