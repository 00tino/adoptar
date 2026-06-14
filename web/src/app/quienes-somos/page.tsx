import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Quiénes somos",
  description:
    "AdoptAR es una plataforma argentina sin fines de lucro que conecta animales que necesitan un hogar con personas que quieren adoptar.",
};

export default function PaginaQuienesSomos() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-4xl font-black">Quiénes somos 🐾</h1>

      <div className="mt-6 space-y-5 text-tinta-suave leading-relaxed">
        <p>
          <strong className="text-tinta">AdoptAR</strong> es una plataforma
          argentina <strong className="text-tinta">sin fines de lucro</strong>.
          Nuestra misión es simple: que cada animal rescatado encuentre una
          familia, y que los refugios que hacen el trabajo duro tengan
          herramientas gratuitas para difundir sus animales y recibir ayuda.
        </p>
        <p>
          Acá no hay empresa, no hay inversores y nadie cobra un sueldo. El
          proyecto se sostiene con trabajo voluntario y con servicios de capa
          gratuita. Por eso el 100% de lo que se dona va a las campañas de los
          refugios o al mantenimiento básico de la plataforma (dominio y
          servicios), siempre con el desglose visible en la página de{" "}
          <Link href="/donaciones" className="font-bold text-terracota-oscuro hover:underline">
            donaciones
          </Link>.
        </p>

        <h2 className="font-display text-2xl font-black text-tinta pt-2">Qué hacemos</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            Publicamos animales en <strong className="text-tinta">adopción</strong> y
            en <strong className="text-tinta">tránsito</strong>, de refugios
            verificados y de particulares (con revisión previa de nuestro equipo).
          </li>
          <li>
            Verificamos manualmente cada refugio antes de que aparezca en el sitio.
          </li>
          <li>
            Canalizamos donaciones por Mercado Pago o transferencia hacia campañas
            concretas: cirugías, alimento, castraciones, rescates y más.
          </li>
          <li>
            Protegemos los datos de quienes publican: nunca mostramos la dirección
            exacta de un particular, solo una zona aproximada.
          </li>
        </ul>

        <h2 className="font-display text-2xl font-black text-tinta pt-2">Contacto</h2>
        <p>
          Para consultas, denuncias de publicaciones o ayuda con una donación,
          escribinos a{" "}
          <a
            href="mailto:adoptar.argentina.ayuda@gmail.com"
            className="font-bold text-terracota-oscuro hover:underline"
          >
            adoptar.argentina.ayuda@gmail.com
          </a>
          . Leemos todo, aunque a veces tardemos un poquito: somos voluntarios.
        </p>
      </div>
    </div>
  );
}
