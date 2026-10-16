import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Guía de adopción responsable", description: "Prepará la llegada de un animal a tu casa y aprendé a reconocer publicaciones sospechosas." };

export default function GuiaAdopcionResponsable() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/animales" className="py-3 font-bold text-terracota-oscuro underline">Volver a los animales</Link>
      <h1 className="mt-5 font-display text-4xl font-black">Adoptar es acompañar toda una vida</h1>
      <p className="mt-4 text-lg text-tinta-suave">Tomate el tiempo para conocer al animal, hablar con quien lo cuida y preparar tu hogar.</p>
      <section className="mt-8 rounded-2xl border-2 border-crema-2 bg-blanco-calido p-6">
        <h2 className="font-display text-2xl font-bold">Antes de decidir</h2>
        <ul className="mt-4 list-disc space-y-3 pl-5">
          <li>Conversá con todas las personas de tu casa y evaluá el tiempo, el espacio y los gastos de cuidado.</li>
          <li>Preguntá por su carácter, sus rutinas y cómo convive con otros animales.</li>
          <li>Pedí la información de salud disponible y coordiná los cuidados con un profesional veterinario.</li>
          <li>Conocelo antes de confirmar y acordá con el refugio cómo será la adaptación y el seguimiento.</li>
        </ul>
      </section>
      <section className="mt-6 rounded-2xl border-2 border-terracota/30 bg-blanco-calido p-6">
        <h2 className="font-display text-2xl font-bold">Señales para frenar y revisar</h2>
        <ul className="mt-4 list-disc space-y-3 pl-5">
          <li>Te presionan para transferir plata antes de conocer al animal o verificar quién lo publica.</li>
          <li>Se niegan a conversar, mostrar al animal o aclarar datos que se contradicen.</li>
          <li>Te piden claves, códigos de verificación o datos bancarios para avanzar con una adopción.</li>
          <li>Presentan una venta como si fuera una adopción o usan fotos que no corresponden.</li>
        </ul>
        <p className="mt-4">Si algo te genera dudas, usá <strong>Reportar esta publicación</strong> en la ficha. El reporte es privado y lo revisa el equipo de AdoptAR.</p>
      </section>
      <section className="mt-6 rounded-2xl bg-salvia-oscuro p-6 text-crema">
        <h2 className="font-display text-2xl font-bold">Cuando llega a casa</h2>
        <p className="mt-3">Prepará un lugar tranquilo, agua y un entorno seguro. Respetá sus tiempos de adaptación y mantené el contacto con quien lo cuidaba.</p>
      </section>
    </div>
  );
}
