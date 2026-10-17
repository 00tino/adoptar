import { expect, it, vi } from "vitest";
import { generateMetadata } from "../page";

vi.mock("@/lib/datos", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/datos")>(),
  obtenerAnimalPorSlug: vi.fn().mockResolvedValue({ slug: "adoptar-luna-demo", nombre: "Luna", especie: "perro", ciudad: "Avellaneda", provincia: "Buenos Aires", descripcion: "Busca familia", estado: "disponible" }),
}));

it("la ficha pública conserva la imagen de la URL original al compartir", async () => {
  const metadata = await generateMetadata({ params: Promise.resolve({ slug: "adoptar-luna-demo" }) });
  expect(metadata.openGraph?.images).toEqual([expect.objectContaining({ url: "/animales/adoptar-luna-demo/opengraph-image" })]);
  expect(metadata.twitter?.images).toEqual(metadata.openGraph?.images);
});
