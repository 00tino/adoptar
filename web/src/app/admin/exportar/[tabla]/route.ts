import { createClient } from "@supabase/supabase-js";
import { esAdmin } from "@/lib/auth";

// Exportación CSV para el admin: animales, refugios, donaciones o usuarios.
// Sin librerías: el CSV se arma a mano escapando comillas.

const COLUMNAS: Record<string, string> = {
  animales:
    "id,slug,nombre,especie,raza,sexo,tamano,edad_meses,castrado,ciudad,provincia,tipo,estado,creado_el",
  refugios: "id,slug,nombre,ciudad,provincia,email,telefono,whatsapp,estado,creado_el",
  donaciones: "id,campana_id,donor_nombre,donor_email,monto,metodo,anonima,estado,creado_el",
  usuarios: "id,email,nombre,tipo,suspendido,creado_el",
};

function celdaCsv(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  const texto = typeof valor === "object" ? JSON.stringify(valor) : String(valor);
  // Comillas dobles si hay separadores o saltos; las comillas internas se duplican
  return /[",\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tabla: string }> }
) {
  if (!(await esAdmin())) return new Response("No encontrado", { status: 404 });

  const { tabla } = await params;
  const columnas = COLUMNAS[tabla];
  if (!columnas) return new Response("Tabla desconocida", { status: 400 });

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data, error } = await sb
    .from(tabla)
    .select(columnas)
    .order("creado_el", { ascending: false })
    .limit(10000);
  if (error) return new Response(`Error: ${error.message}`, { status: 500 });

  const encabezado = columnas.split(",");
  const filas = (data ?? []).map((fila) =>
    encabezado.map((c) => celdaCsv((fila as unknown as Record<string, unknown>)[c])).join(",")
  );
  const csv = [encabezado.join(","), ...filas].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="adoptar-${tabla}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
