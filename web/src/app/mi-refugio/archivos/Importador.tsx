"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  previsualizarImport,
  previsualizarNotas,
  confirmarImport,
  type ArchivoVault,
} from "@/lib/acciones-archivos";
import {
  normalizarFila,
  CAMPOS,
  ETIQUETA_CAMPO,
  type Mapeo,
  type CampoImport,
  type FilaImportada,
} from "@/lib/importador";

interface Preview {
  encabezados: string[];
  filasRaw: string[][];
  notas: FilaImportada[] | null;
}

type Override = { nombre?: string; especie?: "perro" | "gato" | "otro"; tipo?: "adopcion" | "transito" };
const FILAS_POR_VISTA = 25;

export default function Importador({ archivos }: { archivos: ArchivoVault[] }) {
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [mapeo, setMapeo] = useState<Mapeo | null>(null);
  const [overrides, setOverrides] = useState<Record<number, Override>>({});
  const [saltadas, setSaltadas] = useState<Set<number>>(new Set());
  const [paginaVista, setPaginaVista] = useState(1);
  const [resultado, setResultado] = useState<{ creados: number; incompletos: number } | null>(null);

  // Re-normaliza las filas cada vez que cambia el mapeo (lógica pura, sin xlsx).
  const filas = useMemo(() => {
    if (!preview) return [];
    if (preview.notas) return preview.notas;
    if (!mapeo) return [];
    return preview.filasRaw.map((f) => normalizarFila(f, mapeo));
  }, [preview, mapeo]);

  function faltaNombre(i: number) {
    return !(overrides[i]?.nombre ?? filas[i]?.nombre);
  }
  function faltaEspecie(i: number) {
    return (filas[i]?.faltantes.includes("especie") ?? false) && !overrides[i]?.especie;
  }
  const conProblemas = filas.filter((_, i) => !saltadas.has(i) && (faltaNombre(i) || faltaEspecie(i))).length;
  const especiesSinResolver = filas.filter((_, i) => !saltadas.has(i) && faltaEspecie(i)).length;
  const aImportar = filas.filter((_, i) => !saltadas.has(i)).length;
  const totalPaginas = Math.max(1, Math.ceil(filas.length / FILAS_POR_VISTA));
  const desde = (paginaVista - 1) * FILAS_POR_VISTA;

  async function previsualizar(formData: FormData) {
    setError(null);
    setResultado(null);
    setCargando(true);
    try {
      const r = await previsualizarImport(formData);
      setPreview({ encabezados: r.encabezados, filasRaw: r.filasRaw, notas: null });
      setMapeo(r.mapeo);
      setOverrides({});
      setSaltadas(new Set());
      setPaginaVista(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos leer la planilla.");
    } finally {
      setCargando(false);
    }
  }

  async function previsualizarTexto(formData: FormData) {
    setError(null);
    setResultado(null);
    setCargando(true);
    try {
      const notas = await previsualizarNotas(formData);
      setPreview({ encabezados: [], filasRaw: [], notas });
      setMapeo(null);
      setOverrides({});
      setSaltadas(new Set());
      setPaginaVista(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos leer las notas.");
    } finally {
      setCargando(false);
    }
  }

  async function confirmar() {
    if (!preview) return;
    setError(null);
    setCargando(true);
    try {
      const payload = filas
        .map((f, i) => ({
          ...f,
          nombre: overrides[i]?.nombre ?? f.nombre,
          especie: overrides[i]?.especie ?? f.especie,
          tipo: overrides[i]?.tipo ?? f.tipo,
        }))
        .filter((_, i) => !saltadas.has(i));
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
        <>
          <ol className="mb-4 flex flex-col gap-2 text-sm text-tinta-suave sm:flex-row sm:gap-4">
            {[
              "Elegí una planilla o pegá tus notas.",
              "Revisá la vista previa y corregí lo que haga falta.",
              "Confirmá: se cargan esperando foto.",
            ].map((paso, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-crema-2 text-xs font-bold text-tinta">
                  {i + 1}
                </span>
                <span>{paso}</span>
              </li>
            ))}
          </ol>

          <form action={previsualizar} className="rounded-2xl border-2 border-crema-2 p-4 space-y-4">
            <div>
              <label htmlFor="archivo-import" className="block text-sm font-bold">
                📄 Subir una planilla nueva
              </label>
              <p className="text-xs text-tinta-suave">Formatos: CSV, TSV, XLS, XLSX, ODS (hasta 20 MB).</p>
              <input
                id="archivo-import"
                type="file"
                name="archivo"
                accept=".csv,.tsv,.xls,.xlsx,.ods"
                className="mt-1 w-full rounded-xl border-2 border-crema-2 bg-blanco-calido px-4 py-3 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-crema-2 file:px-4 file:py-1.5 file:font-bold"
              />
            </div>
            {archivos.length > 0 && (
              <div className="border-t-2 border-crema-2 pt-3">
                <label htmlFor="archivo-id" className="block text-sm font-bold">
                  …o usar una planilla que ya subiste
                </label>
                <select id="archivo-id" name="archivoId" defaultValue="" className={`mt-1 w-full ${claseSelect} py-3`}>
                  <option value="">— elegir de tus archivos —</option>
                  {archivos.map((a) => (
                    <option key={a.id} value={a.id}>{a.nombre}</option>
                  ))}
                </select>
              </div>
            )}
            <button
              type="submit"
              disabled={cargando}
              className="w-full rounded-full bg-terracota-oscuro px-6 py-3 font-bold text-blanco-calido hover:bg-terracota-mas-oscuro transition-colors disabled:opacity-60 sm:w-auto"
            >
              {cargando ? "Leyendo…" : "Previsualizar →"}
            </button>
            <p className="text-xs text-tinta-suave">
              Reconocemos columnas comunes en español e inglés (nombre, especie,
              raza, edad, sexo, tamaño, ciudad, provincia, descripción, castrado, tipo).
            </p>
          </form>

          <form action={previsualizarTexto} className="mt-4 space-y-4 rounded-2xl border-2 border-crema-2 p-4">
            <div>
              <label htmlFor="notas-import" className="block text-sm font-bold">📝 ¿Los datos están en mensajes o notas?</label>
              <p className="mt-1 text-xs text-tinta-suave">Pegá el texto o subí una nota .txt/.md. Separá cada animal con una línea en blanco. Revisarás los datos antes de importarlos.</p>
              <textarea id="notas-import" name="notas" rows={6} placeholder={"Nombre: Luna\nEspecie: perra\nEdad: 2 años\nMuy tranquila, necesita tránsito.\n\nNombre: Coco\nEspecie: gato\nBusca familia."} className="mt-2 w-full rounded-xl border-2 border-crema-2 bg-blanco-calido px-4 py-3 text-sm" />
            </div>
            <label className="block text-sm font-bold">O elegí un archivo de notas (hasta 100 KB)
              <input type="file" name="notas_archivo" accept=".txt,.md,text/plain,text/markdown" className="mt-2 block w-full rounded-xl border-2 border-crema-2 bg-blanco-calido px-4 py-3 text-sm" />
            </label>
            <button disabled={cargando} className="rounded-full border-2 border-terracota-oscuro px-6 py-3 font-bold text-terracota-oscuro hover:bg-terracota/10 disabled:opacity-60">{cargando ? "Leyendo…" : "Revisar mis notas →"}</button>
          </form>
        </>
      )}

      {error && (
        <p className="mt-3 rounded-xl bg-terracota/10 border-2 border-terracota/40 px-4 py-2 text-sm text-terracota-oscuro">
          {error}
        </p>
      )}

      {resultado && (
        <div className="mt-3 rounded-xl bg-salvia/20 border-2 border-salvia px-4 py-3 text-salvia-oscuro">
          <p className="font-bold">
            ✅ Importamos {resultado.creados} animal{resultado.creados === 1 ? "" : "es"}
            {resultado.incompletos > 0 &&
              ` (${resultado.incompletos} para completar a mano)`}.
          </p>
          <p className="mt-1 text-sm">
            {resultado.incompletos > 0 ? (
              <>
                Los que tenían nombre quedan <strong>esperando foto</strong> y los que
                no, <strong>para completar a mano</strong>.{" "}
              </>
            ) : (
              <>Quedan <strong>esperando foto</strong>. </>
            )}
            Terminalos desde{" "}
            <Link href="/mi-refugio" className="font-bold underline">
              Mis animales
            </Link>
            .
          </p>
        </div>
      )}

      {preview && (
        <div className="mt-4">
          {/* Mapeo de columnas editable */}
          {!preview.notas && mapeo && <details open className="rounded-2xl border-2 border-crema-2 p-4">
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
          </details>}

          <p className="mt-4 font-bold">
            {aImportar} a importar ·{" "}
            <span className={conProblemas > 0 ? "text-terracota-oscuro" : "text-salvia-oscuro"}>
              {conProblemas} con datos faltantes
            </span>
          </p>
          <p className="text-sm text-tinta-suave">
            Elegí la especie de cada animal. Si falta el nombre, quedará para completar a mano antes de publicarlo.
          </p>
          {especiesSinResolver > 0 && <p className="mt-1 text-sm font-bold text-terracota-oscuro">Falta elegir la especie de {especiesSinResolver} {especiesSinResolver === 1 ? "animal" : "animales"} o saltar esas filas.</p>}

          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-crema-2 text-left">
                  <th className="px-2 py-2">Fila</th>
                  <th className="px-2 py-2">Saltar</th>
                  <th className="px-2 py-2">Nombre</th>
                  <th className="px-2 py-2">Especie</th>
                  <th className="px-2 py-2">Publicación</th>
                  <th className="px-2 py-2">Sexo</th>
                  <th className="px-2 py-2">Edad (m)</th>
                  <th className="px-2 py-2">Ciudad</th>
                </tr>
              </thead>
              <tbody>
                {filas.slice(desde, desde + FILAS_POR_VISTA).map((f, indice) => {
                  const i = desde + indice;
                  const problema = faltaNombre(i) || faltaEspecie(i);
                  const saltada = saltadas.has(i);
                  return (
                    <tr
                      key={i}
                      className={`border-b border-crema-2 ${saltada ? "opacity-40" : problema ? "bg-terracota/5" : ""}`}
                    >
                      <td className="px-2 py-1 text-tinta-suave">{i + (preview.notas ? 1 : 2)}</td>
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
                      <td className="px-2 py-1">
                        <select value={overrides[i]?.tipo ?? f.tipo} onChange={(e) => setOverrides({ ...overrides, [i]: { ...overrides[i], tipo: e.target.value as Override["tipo"] } })} className={`min-w-28 ${claseSelect}`} aria-label={`Publicación de la fila ${i + 1}`}>
                          <option value="adopcion">Adopción</option>
                          <option value="transito">Tránsito</option>
                        </select>
                      </td>
                      <td className="px-2 py-1 text-tinta-suave">{f.sexo ?? "—"}</td>
                      <td className="px-2 py-1 text-tinta-suave">{f.edad_meses || "—"}</td>
                      <td className="px-2 py-1 text-tinta-suave">{f.ciudad || "(refugio)"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPaginas > 1 && (
            <div className="mt-3 flex items-center justify-between gap-3 text-sm">
              <button type="button" disabled={paginaVista === 1} onClick={() => setPaginaVista((p) => p - 1)} className="rounded-full border-2 border-crema-2 px-4 py-2 font-bold disabled:opacity-40">Anterior</button>
              <span>Página {paginaVista} de {totalPaginas}</span>
              <button type="button" disabled={paginaVista === totalPaginas} onClick={() => setPaginaVista((p) => p + 1)} className="rounded-full border-2 border-crema-2 px-4 py-2 font-bold disabled:opacity-40">Siguiente</button>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={confirmar}
              disabled={cargando || aImportar === 0 || especiesSinResolver > 0}
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
