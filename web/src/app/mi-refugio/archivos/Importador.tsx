"use client";

import { useMemo, useState } from "react";
import {
  previsualizarImport,
  confirmarImport,
  type ArchivoVault,
} from "@/lib/acciones-archivos";
import {
  normalizarFila,
  CAMPOS,
  ETIQUETA_CAMPO,
  type Mapeo,
  type CampoImport,
} from "@/lib/importador";

interface Preview {
  encabezados: string[];
  filasRaw: string[][];
  mapeo: Mapeo;
}

type Override = { nombre?: string; especie?: "perro" | "gato" | "otro" };

export default function Importador({ archivos }: { archivos: ArchivoVault[] }) {
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [mapeo, setMapeo] = useState<Mapeo | null>(null);
  const [overrides, setOverrides] = useState<Record<number, Override>>({});
  const [saltadas, setSaltadas] = useState<Set<number>>(new Set());
  const [resultado, setResultado] = useState<{ creados: number; salteados: number } | null>(null);

  // Re-normaliza las filas cada vez que cambia el mapeo (lógica pura, sin xlsx).
  const filas = useMemo(() => {
    if (!preview || !mapeo) return [];
    return preview.filasRaw.map((f) => normalizarFila(f, mapeo));
  }, [preview, mapeo]);

  function faltaNombre(i: number) {
    return !(overrides[i]?.nombre ?? filas[i]?.nombre);
  }
  function faltaEspecie(i: number) {
    return (filas[i]?.faltantes.includes("especie") ?? false) && !overrides[i]?.especie;
  }
  const conProblemas = filas.filter((_, i) => faltaNombre(i) || faltaEspecie(i)).length;
  const aImportar = filas.filter((_, i) => !saltadas.has(i)).length;

  async function previsualizar(formData: FormData) {
    setError(null);
    setResultado(null);
    setCargando(true);
    try {
      const r = await previsualizarImport(formData);
      setPreview({ encabezados: r.encabezados, filasRaw: r.filasRaw, mapeo: r.mapeo });
      setMapeo(r.mapeo);
      setOverrides({});
      setSaltadas(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos leer la planilla.");
    } finally {
      setCargando(false);
    }
  }

  async function confirmar() {
    if (!mapeo) return;
    setError(null);
    setCargando(true);
    try {
      const payload = filas
        .map((f, i) => ({
          ...f,
          nombre: overrides[i]?.nombre ?? f.nombre,
          especie: overrides[i]?.especie ?? f.especie,
          _i: i,
        }))
        .filter((f) => !saltadas.has(f._i))
        .map(({ _i, faltantes, ...resto }) => resto); // no mandamos metadatos
      const formData = new FormData();
      formData.set("filas", JSON.stringify(payload));
      const r = await confirmarImport(formData);
      setResultado(r);
      setPreview(null);
      setMapeo(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos importar.");
    } finally {
      setCargando(false);
    }
  }

  const claseSelect =
    "rounded-lg border-2 border-crema-2 bg-blanco-calido px-2 py-1 text-sm";

  return (
    <div className="mt-4">
      {!preview && (
        <form action={previsualizar} className="space-y-3">
          <div>
            <label className="block text-sm font-bold">Subir una planilla nueva</label>
            <input
              type="file"
              name="archivo"
              accept=".csv,.tsv,.xls,.xlsx,.ods"
              className="mt-1 w-full rounded-xl border-2 border-crema-2 bg-blanco-calido px-4 py-3 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-crema-2 file:px-4 file:py-1.5 file:font-bold"
            />
          </div>
          {archivos.length > 0 && (
            <div>
              <label className="block text-sm font-bold">…o usar una de tus archivos</label>
              <select name="archivoId" defaultValue="" className={`mt-1 w-full ${claseSelect} py-3`}>
                <option value="">— elegir —</option>
                {archivos.map((a) => (
                  <option key={a.id} value={a.id}>{a.nombre}</option>
                ))}
              </select>
            </div>
          )}
          <button
            type="submit"
            disabled={cargando}
            className="rounded-full bg-terracota-oscuro px-6 py-3 font-bold text-blanco-calido hover:bg-terracota-mas-oscuro transition-colors disabled:opacity-60"
          >
            {cargando ? "Leyendo…" : "Previsualizar"}
          </button>
        </form>
      )}

      {error && (
        <p className="mt-3 rounded-xl bg-terracota/10 border-2 border-terracota/40 px-4 py-2 text-sm text-terracota-oscuro">
          {error}
        </p>
      )}

      {resultado && (
        <p className="mt-3 rounded-xl bg-salvia/20 border-2 border-salvia px-4 py-3 font-bold text-salvia-oscuro">
          ✅ Importamos {resultado.creados} animal{resultado.creados === 1 ? "" : "es"}
          {resultado.salteados > 0 && ` (${resultado.salteados} salteado${resultado.salteados === 1 ? "" : "s"} por falta de datos)`}.
          Ahora agregales una foto desde “Mis animales” para publicarlos.
        </p>
      )}

      {preview && mapeo && (
        <div className="mt-4">
          {/* Mapeo de columnas editable */}
          <details open className="rounded-2xl border-2 border-crema-2 p-4">
            <summary className="cursor-pointer font-bold">
              Columnas detectadas (editá si algo quedó mal)
            </summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {CAMPOS.map((campo: CampoImport) => (
                <label key={campo} className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-bold">{ETIQUETA_CAMPO[campo]}</span>
                  <select
                    value={mapeo[campo] ?? ""}
                    onChange={(e) =>
                      setMapeo({
                        ...mapeo,
                        [campo]: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    className={claseSelect}
                  >
                    <option value="">— ninguna —</option>
                    {preview.encabezados.map((h, i) => (
                      <option key={i} value={i}>{h || `Columna ${i + 1}`}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </details>

          <p className="mt-4 font-bold">
            {aImportar} a importar ·{" "}
            <span className={conProblemas > 0 ? "text-terracota-oscuro" : "text-salvia-oscuro"}>
              {conProblemas} con datos faltantes
            </span>
          </p>
          <p className="text-sm text-tinta-suave">
            Mínimo requerido: nombre y especie. Completalos abajo o saltá la fila.
          </p>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-crema-2 text-left">
                  <th className="px-2 py-2">Saltar</th>
                  <th className="px-2 py-2">Nombre</th>
                  <th className="px-2 py-2">Especie</th>
                  <th className="px-2 py-2">Sexo</th>
                  <th className="px-2 py-2">Edad (m)</th>
                  <th className="px-2 py-2">Ciudad</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f, i) => {
                  const problema = faltaNombre(i) || faltaEspecie(i);
                  const saltada = saltadas.has(i);
                  return (
                    <tr
                      key={i}
                      className={`border-b border-crema-2 ${saltada ? "opacity-40" : problema ? "bg-terracota/5" : ""}`}
                    >
                      <td className="px-2 py-1">
                        <input
                          type="checkbox"
                          checked={saltada}
                          onChange={(e) => {
                            const s = new Set(saltadas);
                            if (e.target.checked) s.add(i);
                            else s.delete(i);
                            setSaltadas(s);
                          }}
                          className="h-4 w-4 accent-terracota"
                          aria-label={`Saltar fila ${i + 1}`}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="text"
                          value={overrides[i]?.nombre ?? f.nombre}
                          onChange={(e) =>
                            setOverrides({ ...overrides, [i]: { ...overrides[i], nombre: e.target.value } })
                          }
                          className={`w-32 rounded-lg border-2 px-2 py-1 ${faltaNombre(i) ? "border-terracota" : "border-crema-2"} bg-blanco-calido`}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <select
                          value={overrides[i]?.especie ?? (f.faltantes.includes("especie") ? "" : f.especie)}
                          onChange={(e) =>
                            setOverrides({
                              ...overrides,
                              [i]: { ...overrides[i], especie: (e.target.value || undefined) as Override["especie"] },
                            })
                          }
                          className={`rounded-lg border-2 px-2 py-1 ${faltaEspecie(i) ? "border-terracota" : "border-crema-2"} bg-blanco-calido`}
                        >
                          <option value="">—</option>
                          <option value="perro">Perro</option>
                          <option value="gato">Gato</option>
                          <option value="otro">Otro</option>
                        </select>
                      </td>
                      <td className="px-2 py-1 text-tinta-suave">{f.sexo}</td>
                      <td className="px-2 py-1 text-tinta-suave">{f.edad_meses || "—"}</td>
                      <td className="px-2 py-1 text-tinta-suave">{f.ciudad || "(refugio)"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={confirmar}
              disabled={cargando || aImportar === 0}
              className="rounded-full bg-terracota-oscuro px-6 py-3 font-bold text-blanco-calido hover:bg-terracota-mas-oscuro transition-colors disabled:opacity-60"
            >
              {cargando ? "Importando…" : `Importar ${aImportar} animal${aImportar === 1 ? "" : "es"}`}
            </button>
            <button
              type="button"
              onClick={() => { setPreview(null); setMapeo(null); setError(null); }}
              className="rounded-full border-2 border-crema-2 px-6 py-3 font-bold hover:bg-crema-2 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
