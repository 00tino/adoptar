"use client";

// Formulario de postulación de adopción, plegado en un <details> para no
// saturar la ficha. Envía a la server action postularAdopcion.

import { postularAdopcion } from "@/lib/acciones-adopcion";
import BotonEnvio from "./BotonEnvio";

export default function FormularioAdopcion({
  animalId,
  slug,
  nombreAnimal,
  emailInicial,
  nombreInicial,
}: {
  animalId: string;
  slug: string;
  nombreAnimal: string;
  emailInicial?: string;
  nombreInicial?: string;
}) {
  return (
    <details className="mt-6 rounded-2xl border-2 border-crema-2 bg-blanco-calido">
      <summary className="cursor-pointer list-none rounded-2xl px-5 py-4 font-display text-xl font-bold hover:bg-crema-2/40 transition-colors">
        📝 Postularme para adoptar a {nombreAnimal}
      </summary>
      <form action={postularAdopcion} className="space-y-4 p-5 pt-0">
        <input type="hidden" name="animal_id" value={animalId} />
        <input type="hidden" name="slug" value={slug} />
        <p className="text-sm text-tinta-suave">
          Dejá tus datos y quien lo publica se va a contactar con vos. No es un
          compromiso: es el primer paso para conocerse.
        </p>
        <Campo etiqueta="Tu nombre" nombre="nombre" requerido defecto={nombreInicial} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Email" nombre="email" tipo="email" requerido defecto={emailInicial} />
          <Campo etiqueta="Teléfono / WhatsApp" nombre="telefono" />
        </div>
        <Campo
          etiqueta="¿Cómo es tu vivienda?"
          nombre="vivienda"
          placeholder="Ej: depto con balcón, casa con patio…"
        />
        <div>
          <label className="block text-sm font-bold" htmlFor="mensaje">
            Contanos un poco sobre vos
          </label>
          <textarea
            id="mensaje"
            name="mensaje"
            rows={4}
            className="mt-1 w-full rounded-xl border-2 border-crema-2 px-4 py-2 bg-blanco-calido"
            placeholder="Por qué querés adoptarlo/a, si tenés otros animales, experiencia previa…"
          />
        </div>
        <BotonEnvio className="w-full rounded-xl bg-terracota text-blanco-calido py-3 font-bold hover:bg-terracota-oscuro transition-colors">
          Enviar mi postulación 🐾
        </BotonEnvio>
      </form>
    </details>
  );
}

function Campo({
  etiqueta,
  nombre,
  tipo = "text",
  requerido = false,
  placeholder,
  defecto,
}: {
  etiqueta: string;
  nombre: string;
  tipo?: string;
  requerido?: boolean;
  placeholder?: string;
  defecto?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-bold" htmlFor={nombre}>
        {etiqueta} {requerido && "*"}
      </label>
      <input
        id={nombre}
        name={nombre}
        type={tipo}
        required={requerido}
        placeholder={placeholder}
        defaultValue={defecto}
        className="mt-1 w-full rounded-xl border-2 border-crema-2 px-4 py-2 bg-blanco-calido"
      />
    </div>
  );
}
