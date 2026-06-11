export interface AnimalParaEditar {
  id: string;
  nombre: string;
  especie: string;
  sexo: string;
  tamano: string;
  raza: string | null;
  edadMeses: number;
  castrado: boolean;
  vacunas: string[];
  descripcion: string;
}

// Formulario compartido por "publicar animal" y "editar animal" del refugio.
// Server component: la acción llega por prop desde cada página.
export default function FormularioAnimal({
  accion,
  animal,
}: {
  accion: (formData: FormData) => Promise<void>;
  animal?: AnimalParaEditar;
}) {
  const editando = Boolean(animal);
  return (
    <form
      action={accion}
      className="mt-8 space-y-5 rounded-2xl bg-blanco-calido border-2 border-crema-2 p-6 sm:p-8"
    >
      {animal && <input type="hidden" name="id" value={animal.id} />}

      <Campo etiqueta="Nombre" nombre="nombre" requerido valor={animal?.nombre} />
      <div className="grid grid-cols-2 gap-4">
        <Select
          etiqueta="Especie *"
          nombre="especie"
          valor={animal?.especie}
          opciones={[
            ["perro", "Perro"],
            ["gato", "Gato"],
            ["otro", "Otro"],
          ]}
        />
        <Select
          etiqueta="Sexo *"
          nombre="sexo"
          valor={animal?.sexo}
          opciones={[
            ["hembra", "Hembra"],
            ["macho", "Macho"],
          ]}
        />
        <Select
          etiqueta="Tamaño *"
          nombre="tamano"
          valor={animal?.tamano}
          opciones={[
            ["chico", "Chico"],
            ["mediano", "Mediano"],
            ["grande", "Grande"],
          ]}
        />
        <Campo
          etiqueta="Edad (meses)"
          nombre="edad_meses"
          tipo="number"
          valor={animal ? String(animal.edadMeses) : undefined}
        />
      </div>
      <Campo etiqueta="Raza (o 'mestizo')" nombre="raza" valor={animal?.raza ?? ""} />
      <Campo
        etiqueta="Vacunas (separadas por coma)"
        nombre="vacunas"
        placeholder="Ej: Quíntuple, Antirrábica"
        valor={animal?.vacunas.join(", ")}
      />
      <label className="flex items-center gap-2 text-sm font-bold">
        <input
          type="checkbox"
          name="castrado"
          defaultChecked={animal?.castrado}
          className="h-4 w-4 accent-terracota"
        />
        Castrado/a o esterilizado/a
      </label>
      <div>
        <label className="block text-sm font-bold" htmlFor="descripcion">
          Descripción *
        </label>
        <textarea
          id="descripcion"
          name="descripcion"
          required
          rows={4}
          defaultValue={animal?.descripcion}
          className="mt-1 w-full rounded-xl border-2 border-crema-2 px-4 py-2 bg-blanco-calido"
          placeholder="Su historia, su carácter, con quién se lleva bien…"
        />
      </div>
      <Campo
        etiqueta={
          editando
            ? "Agregar fotos (se suman a las que ya tiene)"
            : "Fotos (mínimo 1, máximo 6)"
        }
        nombre="fotos"
        tipo="file"
        multiple
        requerido={!editando}
      />
      {!editando && <Campo etiqueta="Video (opcional)" nombre="video" tipo="file" />}

      <button
        type="submit"
        className="w-full rounded-xl bg-terracota text-blanco-calido py-3 font-bold hover:bg-terracota-oscuro transition-colors"
      >
        {editando ? "Guardar cambios" : "Publicar 🐾"}
      </button>
    </form>
  );
}

function Campo({
  etiqueta,
  nombre,
  tipo = "text",
  requerido = false,
  multiple = false,
  placeholder,
  valor,
}: {
  etiqueta: string;
  nombre: string;
  tipo?: string;
  requerido?: boolean;
  multiple?: boolean;
  placeholder?: string;
  valor?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-bold" htmlFor={nombre}>
        {etiqueta} {requerido && "*"}
      </label>
      <input
        id={nombre}
        name={nombre}
        type={tipo}
        required={requerido}
        multiple={multiple}
        placeholder={placeholder}
        defaultValue={valor}
        className="mt-1 w-full rounded-xl border-2 border-crema-2 px-4 py-2 bg-blanco-calido"
      />
    </div>
  );
}

function Select({
  etiqueta,
  nombre,
  opciones,
  valor,
}: {
  etiqueta: string;
  nombre: string;
  opciones: [string, string][];
  valor?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-bold" htmlFor={nombre}>
        {etiqueta}
      </label>
      <select
        id={nombre}
        name={nombre}
        required
        defaultValue={valor}
        className="mt-1 w-full rounded-xl border-2 border-crema-2 px-4 py-2 bg-blanco-calido"
      >
        {opciones.map(([v, t]) => (
          <option key={v} value={v}>
            {t}
          </option>
        ))}
      </select>
    </div>
  );
}
