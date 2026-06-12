import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description:
    "Términos y condiciones de uso de AdoptAR, la plataforma argentina sin fines de lucro de adopción de animales.",
};

export default function PaginaTerminos() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-4xl font-black">Términos y condiciones</h1>
      <p className="mt-2 text-sm text-tinta-suave">Última actualización: junio de 2026</p>

      <div className="mt-6 space-y-5 text-tinta-suave leading-relaxed">
        <h2 className="font-display text-xl font-black text-tinta">1. Qué es AdoptAR</h2>
        <p>
          AdoptAR es una plataforma sin fines de lucro que difunde animales en
          adopción y tránsito, perfiles de refugios y campañas de donación.
          AdoptAR <strong className="text-tinta">no es parte</strong> de las
          adopciones: el vínculo se da directamente entre quien publica
          (refugio o particular) y quien adopta.
        </p>

        <h2 className="font-display text-xl font-black text-tinta">2. Uso responsable</h2>
        <p>
          Al usar el sitio te comprometés a publicar información veraz, a no
          usar la plataforma para venta de animales (está prohibida), maltrato,
          spam o cualquier actividad ilegal. Nos reservamos el derecho de
          rechazar o dar de baja publicaciones y de suspender cuentas que
          incumplan estas reglas, sin previo aviso.
        </p>

        <h2 className="font-display text-xl font-black text-tinta">3. Adopciones</h2>
        <p>
          Cada refugio o particular define sus propios requisitos de adopción.
          Te recomendamos siempre conocer al animal antes de adoptarlo y firmar
          un acuerdo de adopción responsable. AdoptAR no garantiza el estado
          sanitario ni el comportamiento de los animales publicados, aunque
          revisamos cada publicación antes de aprobarla.
        </p>

        <h2 className="font-display text-xl font-black text-tinta">4. Donaciones</h2>
        <p>
          Las donaciones se procesan por Mercado Pago o por transferencia
          bancaria y van a campañas revisadas por nuestro equipo. Si una causa
          no tiene campañas activas, tu aporte queda reservado («en caja»)
          hasta que exista una campaña de esa causa, y la reasignación queda
          registrada. Las donaciones no son reembolsables, pero si hubo un
          error escribinos y lo resolvemos.
        </p>

        <h2 className="font-display text-xl font-black text-tinta">5. Responsabilidad</h2>
        <p>
          El servicio se ofrece «como está», de forma gratuita y a pulmón.
          Hacemos lo posible por mantener el sitio disponible y la información
          correcta, pero no asumimos responsabilidad por daños derivados del
          uso de la plataforma o de acuerdos entre usuarios.
        </p>

        <h2 className="font-display text-xl font-black text-tinta">6. Cambios</h2>
        <p>
          Podemos actualizar estos términos; si el cambio es importante lo
          vamos a avisar en el sitio. Las dudas van a{" "}
          <a href="mailto:adoptar.argentina.ayuda@gmail.com" className="font-bold text-terracota hover:underline">
            adoptar.argentina.ayuda@gmail.com
          </a>
          . También podés leer nuestra{" "}
          <Link href="/privacidad" className="font-bold text-terracota hover:underline">
            política de privacidad
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
