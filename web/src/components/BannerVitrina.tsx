import Link from "next/link";
import { modoVitrina } from "@/lib/vitrina";

export default function BannerVitrina() {
  if (!modoVitrina()) return null;
  return (
    <div className="bg-sol/90 text-tinta">
      <p className="mx-auto max-w-6xl px-4 py-2.5 text-sm text-center sm:text-left">
        <strong>Estamos arrancando.</strong> Estos perfiles muestran cómo se ve
        una publicación. Todavía estamos sumando refugios.{" "}
        <Link href="/sumate" className="font-bold underline underline-offset-2">
          ¿Tenés un refugio? Sumate gratis →
        </Link>
      </p>
    </div>
  );
}
