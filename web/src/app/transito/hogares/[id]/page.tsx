import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SignInButton } from "@clerk/nextjs";
import { usuarioActual } from "@/lib/auth";
import { asegurarUsuario } from "@/lib/usuarios";
import { obtenerHogar, solicitarHogar } from "@/lib/acciones-hogares";

export const metadata: Metadata = { title: "Pedir ayuda a un hogar de tránsito", robots: { index: false } };

export default async function PaginaHogar({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ enviado?: string }>;
}) {
  const { id } = await params;
  const hogar = await obtenerHogar(id);
  if (!hogar) notFound();
  const usuario = await usuarioActual();
  const cuenta = usuario ? await asegurarUsuario() : null;
  const enviado = (await searchParams).enviado === "1";

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/transito/hogares" className="text-sm font-bold text-terracota-oscuro hover:underline">← Ver hogares disponibles</Link>
      <h1 className="mt-4 font-display text-4xl font-black">Pedile ayuda a {hogar.nombre}</h1>
      <p className="mt-3 text-tinta-suave">📍 {hogar.ciudad}, {hogar.provincia} · {hogar.cupos} {hogar.cupos === 1 ? "lugar disponible" : "lugares disponibles"}</p>
      {hogar.descripcion && <p className="mt-5 rounded-2xl bg-crema-2 p-5">{hogar.descripcion}</p>}

      {enviado && <p className="mt-6 rounded-xl border-2 border-salvia bg-salvia/20 p-4 font-bold">Solicitud enviada. {hogar.nombre} la verá en su espacio de tránsito y recibirá un aviso.</p>}
      {!usuario ? (
        <div className="mt-8 rounded-2xl border-2 border-crema-2 bg-blanco-calido p-6">
          <p>Ingresá para contarle qué animal necesita tránsito.</p>
          <SignInButton mode="modal"><button className="mt-4 rounded-full bg-terracota-oscuro px-5 py-3 font-bold text-blanco-calido">Ingresar</button></SignInButton>
        </div>
      ) : hogar.usuarioId === cuenta?.id ? (
        <p className="mt-8 text-tinta-suave">Este es tu hogar. <Link href="/transito/ofrecer" className="font-bold text-terracota-oscuro underline">Administrá tu disponibilidad</Link>.</p>
      ) : (
        <form action={solicitarHogar} className="mt-8 space-y-4 rounded-2xl border-2 border-crema-2 bg-blanco-calido p-6">
          <input type="hidden" name="hogar_id" value={hogar.id} />
          <label className="block text-sm font-bold" htmlFor="mensaje">Contale qué animal necesita tránsito</label>
          <textarea id="mensaje" name="mensaje" minLength={20} maxLength={1500} rows={6} required placeholder="Es un perro adulto rescatado en... Necesita tránsito durante... Podemos cubrir alimento y veterinaria..." className="w-full rounded-xl border-2 border-crema-2 bg-blanco-calido px-4 py-3" />
          <p className="text-sm text-tinta-suave">{hogar.nombre} verá tu nombre, email y mensaje para poder responderte. Tu contacto no aparece en la lista pública.</p>
          <button className="rounded-full bg-terracota-oscuro px-6 py-3 font-bold text-blanco-calido hover:bg-terracota-mas-oscuro">Enviar solicitud</button>
        </form>
      )}
    </div>
  );
}
