import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description:
    "Qué datos guarda AdoptAR, para qué los usa y quiénes los procesan. Transparencia total: somos una plataforma sin fines de lucro.",
};

export default function PaginaPrivacidad() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-4xl font-black">Política de privacidad</h1>
      <p className="mt-2 text-sm text-tinta-suave">Última actualización: junio de 2026</p>

      <div className="mt-6 space-y-5 text-tinta-suave leading-relaxed">
        <h2 className="font-display text-xl font-black text-tinta">Qué datos guardamos</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong className="text-tinta">Cuenta:</strong> tu email y nombre,
            que llegan cuando iniciás sesión con Google.
          </li>
          <li>
            <strong className="text-tinta">Publicaciones:</strong> los datos y
            fotos de los animales y refugios que publicás. Si publicás como
            particular, <strong className="text-tinta">nunca guardamos tu
            dirección exacta</strong>: solo una coordenada desplazada unos 500
            metros.
          </li>
          <li>
            <strong className="text-tinta">Donaciones:</strong> monto, campaña y
            —si lo dejás— tu nombre y email para agradecerte. Podés donar de
            forma totalmente anónima. Nunca vemos los datos de tu tarjeta: eso
            queda en Mercado Pago.
          </li>
          <li>
            <strong className="text-tinta">Mensajes:</strong> los chats con
            refugios quedan guardados para que puedas retomarlos.
          </li>
        </ul>

        <h2 className="font-display text-xl font-black text-tinta">Qué NO hacemos</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>No vendemos ni compartimos tus datos con anunciantes.</li>
          <li>No usamos cookies de seguimiento publicitario ni mostramos publicidad.</li>
          <li>No te mandamos emails de marketing: solo avisos de tu actividad
          (aprobaciones, mensajes, donaciones).</li>
        </ul>

        <h2 className="font-display text-xl font-black text-tinta">Quiénes procesan datos por nosotros</h2>
        <p>
          Para funcionar usamos servicios de terceros que procesan datos en
          nuestro nombre:{" "}
          <strong className="text-tinta">Clerk</strong> (inicio de sesión),{" "}
          <strong className="text-tinta">Supabase</strong> (base de datos y fotos),{" "}
          <strong className="text-tinta">Mercado Pago</strong> (pagos),{" "}
          <strong className="text-tinta">Resend</strong> (emails) y{" "}
          <strong className="text-tinta">Vercel</strong> (alojamiento y métricas
          anónimas de visitas, sin cookies). Cada uno tiene su propia política
          de privacidad.
        </p>

        <h2 className="font-display text-xl font-black text-tinta">Tus derechos</h2>
        <p>
          Podés pedirnos ver, corregir o borrar tus datos cuando quieras
          escribiendo a{" "}
          <a href="mailto:adoptar.argentina.ayuda@gmail.com" className="font-bold text-terracota-oscuro hover:underline">
            adoptar.argentina.ayuda@gmail.com
          </a>
          . Borramos tu cuenta y tus datos personales; las donaciones quedan
          registradas de forma anónima porque son parte de la transparencia de
          la plataforma. Más contexto en{" "}
          <Link href="/quienes-somos" className="font-bold text-terracota-oscuro hover:underline">
            quiénes somos
          </Link>{" "}
          y en los{" "}
          <Link href="/terminos" className="font-bold text-terracota-oscuro hover:underline">
            términos y condiciones
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
