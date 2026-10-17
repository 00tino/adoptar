import PaginaAnimales from "../../animales/page";

export { metadata } from "../../animales/page";
export const dynamic = "force-static";
export const revalidate = 60;

export default function CatalogoPublico() {
  return <PaginaAnimales searchParams={Promise.resolve({})} />;
}
