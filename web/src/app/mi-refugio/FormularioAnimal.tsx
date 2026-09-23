import BotonGuardar from "./BotonGuardar";
import { CampoAnimal, SelectorAnimal } from "@/components/CamposAnimal";

export interface AnimalParaEditar {
  id: string;
  nombre: string;
  especie: string;
  sexo: string | null;
  tamano: string | null;
  raza: string | null;
  edadMeses: number | null;
  castrado: boolean;
  vacunas: string[];
  descripcion: string;
  historia?: string;
}

// Formulario compartido por "publicar animal" y "editar animal" del refugio.
// Server component: la acción llega por prop desde cada página.
export default function FormularioAnimal({
  accion,
  animal,
  prefill,
}: {
  accion: (formData: FormData) => Promise<void>;
  animal?: AnimalParaEditar;
  // Valores iniciales para "publicar" (ej: cargar a mano un animal salteado en
  // una importación). No activa el modo edición: sigue pidiendo foto y dice "Publicar".
  prefill?: Partial<AnimalParaEditar>;
}) {
  const editando = Boolean(animal);
  const ini = animal ?? prefill;
  return (
    <form
      action={accion}
      className="mt-8 space-y-5 rounded-2xl bg-blanco-calido border-2 border-crema-2 p-6 sm:p-8"
    >
      {animal && <input type="hidden" name="id" value={animal.id} />}

      <CampoAnimal etiqueta="Nombre" nombre="nombre" requerido valor={ini?.nombre} />
      <SelectorAnimal
        etiqueta="Especie *"
        nombre="especie"
        valor={ini?.especie}
        requerido
        opciones={[
          ["perro", "Perro"],
          ["gato", "Gato"],
          ["otro", "Otro"],
        ]}
      />
      <CampoAnimal
        etiqueta={editando ? "Agregar fotos" : "Fotos (mínimo 1, máximo 6)"}
        nombre="fotos"
        tipo="file"
        multiple
        requerido={!editando}
        accept="image/jpeg,image/png,image/webp"
      />
      <div>
        <label className="block text-sm font-bold" htmlFor="descripcion">
          Lo que sepas del animal (opcional)
        </label>
        <p className="text-xs text-tinta-suave">Podés pegar acá un mensaje de WhatsApp o una nota del teléfono. Después lo editás cuando tengas tiempo.</p>
        <textarea
          id="descripcion"
          name="descripcion"
          rows={4}
          defaultValue={ini?.descripcion}
          className="mt-1 w-full rounded-xl border-2 border-crema-2 px-4 py-2 bg-blanco-calido"
          placeholder="Carácter, cuidados, historia o cualquier dato que tengas…"
        />
      </div>

      <details open={editando || Boolean(prefill)} className="rounded-xl border-2 border-crema-2 p-4">
        <summary className="cursor-pointer font-bold">Más detalles (opcionales)</summary>
        <div className="mt-4 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectorAnimal etiqueta="Sexo" nombre="sexo" valor={ini?.sexo} opciones={[["hembra", "Hembra"], ["macho", "Macho"]]} />
            <SelectorAnimal etiqueta="Tamaño" nombre="tamano" valor={ini?.tamano} opciones={[["chico", "Chico"], ["mediano", "Mediano"], ["grande", "Grande"]]} />
            <CampoAnimal etiqueta="Edad (meses)" nombre="edad_meses" tipo="number" valor={ini?.edadMeses != null ? String(ini.edadMeses) : undefined} />
            <CampoAnimal etiqueta="Raza (o 'mestizo')" nombre="raza" valor={ini?.raza ?? ""} />
          </div>
          <CampoAnimal etiqueta="Vacunas (separadas por coma)" nombre="vacunas" placeholder="Ej: Quíntuple, Antirrábica" valor={ini?.vacunas?.join(", ")} />
          <label className="flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" name="castrado" defaultChecked={ini?.castrado} className="h-4 w-4 accent-terracota" />
            Castrado/a o esterilizado/a
          </label>
          <div>
            <label className="block text-sm font-bold" htmlFor="historia">Su historia</label>
            <textarea id="historia" name="historia" rows={3} defaultValue={ini?.historia} className="mt-1 w-full rounded-xl border-2 border-crema-2 px-4 py-2 bg-blanco-calido" placeholder="¿Cómo lo rescataron o encontraron?" />
          </div>
          {!editando && <CampoAnimal etiqueta="Video" nombre="video" tipo="file" accept="video/mp4,video/webm,video/quicktime" />}
        </div>
      </details>

      <BotonGuardar etiqueta={editando ? "Guardar cambios" : "Publicar 🐾"} />
    </form>
  );
}
