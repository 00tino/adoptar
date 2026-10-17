import PaginaAnimal from "../../../animales/[slug]/page";
import { obtenerAnimales } from "@/lib/datos";

export { generateMetadata } from "../../../animales/[slug]/page";
export const dynamic = "force-static";
export const revalidate = 60;

export async function generateStaticParams() {
  return (await obtenerAnimales()).map(({ slug }) => ({ slug }));
}

export default function FichaPublica({ params }: { params: Promise<{ slug: string }> }) {
  return <PaginaAnimal params={params} searchParams={Promise.resolve({})} />;
}
