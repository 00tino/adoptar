import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-16 bg-tinta text-crema">
      <div className="mx-auto max-w-6xl px-4 py-12 grid gap-8 sm:grid-cols-3">
        <div>
          <p className="font-display text-2xl font-bold">
            Adopt<span className="text-sol">AR</span> 🐾
          </p>
          <p className="mt-2 text-sm text-crema-2/80 max-w-xs">
            Plataforma argentina sin fines de lucro que conecta animales que
            necesitan un hogar con personas que quieren adoptar.
          </p>
        </div>
        <nav aria-label="Links del pie" className="text-sm space-y-2">
          <p className="font-bold text-sol uppercase tracking-wide text-xs">Explorá</p>
          <Link className="block hover:text-sol" href="/animales">Animales en adopción</Link>
          <Link className="block hover:text-sol" href="/transito">Hogares de tránsito</Link>
          <Link className="block hover:text-sol" href="/refugios">Refugios</Link>
          <Link className="block hover:text-sol" href="/donaciones">Donaciones</Link>
        </nav>
        <nav aria-label="Links de participación" className="text-sm space-y-2">
          <p className="font-bold text-sol uppercase tracking-wide text-xs">Sumate</p>
          <Link className="block hover:text-sol" href="/publicar-transito">Publicar un animal en tránsito</Link>
          <Link className="block hover:text-sol" href="/registrar-refugio">Registrar mi refugio</Link>
        </nav>
      </div>
      <div className="border-t border-crema/10 py-4 text-center text-xs text-crema-2/60">
        © {new Date().getFullYear()} AdoptAR · Hecho con ❤️ en Argentina
      </div>
    </footer>
  );
}
