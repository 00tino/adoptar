"use client";

import { useActionState, useState } from "react";
import { guardarAlertaAdopcion } from "@/lib/acciones-alertas-adopcion";
import BotonEnvio from "./BotonEnvio";

export default function FormularioAlertaAdopcion({ actual, provincias }: {
  actual: { especie: string | null; provincia: string | null; activa: boolean } | null;
  provincias: string[];
}) {
  const [estado, accion] = useActionState(guardarAlertaAdopcion, {});
  const [especie, setEspecie] = useState(actual?.especie ?? "");
  const [provincia, setProvincia] = useState(actual?.provincia ?? "");
  const [activa, setActiva] = useState(actual?.activa ?? true);
  return (
    <form action={accion} className="mt-6 space-y-5 rounded-2xl border-2 border-crema-2 bg-blanco-calido p-5 sm:p-6">
      <label className="block font-bold">Especie
        <select name="especie" value={especie} onChange={(e) => setEspecie(e.target.value)} className="mt-2 block min-h-11 w-full rounded-xl border-2 border-crema-2 bg-crema p-3">
          <option value="">Todas las especies</option><option value="perro">Perros</option><option value="gato">Gatos</option><option value="otro">Otros animales</option>
        </select>
      </label>
      <label className="block font-bold">Provincia
        <input name="provincia" list="provincias-alerta" maxLength={80} value={provincia} onChange={(e) => setProvincia(e.target.value)} placeholder="Todas las provincias" aria-describedby="provincia-ayuda" className="mt-2 block min-h-11 w-full rounded-xl border-2 border-crema-2 bg-crema p-3" />
      </label>
      <datalist id="provincias-alerta">{provincias.map((p) => <option key={p} value={p} />)}</datalist>
      <p id="provincia-ayuda" className="text-sm text-tinta-suave">Elegí una sugerencia o escribí el nombre completo. Dejá vacío para recibir avisos de todo el país.</p>
      <label className="flex min-h-11 items-center gap-3 font-bold"><input type="checkbox" name="activa" checked={activa} onChange={(e) => setActiva(e.target.checked)} className="h-5 w-5 accent-salvia-oscuro" />Recibir avisos por email</label>
      <p className="text-sm text-tinta-suave">Para pausar los avisos, desmarcá esta opción y guardá.</p>
      {estado.error && <p role="alert" className="font-bold text-terracota-oscuro">{estado.error}</p>}
      {estado.mensaje && <p role="status" className="font-bold text-salvia-oscuro">{estado.mensaje}</p>}
      <BotonEnvio className="min-h-11 w-full rounded-xl bg-terracota-oscuro px-5 py-3 font-bold text-blanco-calido">Guardar mi alerta</BotonEnvio>
    </form>
  );
}
