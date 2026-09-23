// Campos compartidos por las publicaciones de refugios y de tránsito.

export function CampoAnimal({
  etiqueta,
  nombre,
  tipo = "text",
  requerido = false,
  multiple = false,
  placeholder,
  valor,
  accept,
}: {
  etiqueta: string;
  nombre: string;
  tipo?: string;
  requerido?: boolean;
  multiple?: boolean;
  placeholder?: string;
  valor?: string;
  accept?: string;
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
        accept={accept}
        className="mt-1 w-full rounded-xl border-2 border-crema-2 px-4 py-2 bg-blanco-calido"
      />
    </div>
  );
}

export function SelectorAnimal({
  etiqueta,
  nombre,
  opciones,
  valor,
  requerido = false,
}: {
  etiqueta: string;
  nombre: string;
  opciones: [string, string][];
  valor?: string | null;
  requerido?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-bold" htmlFor={nombre}>
        {etiqueta}
      </label>
      <select
        id={nombre}
        name={nombre}
        required={requerido}
        defaultValue={valor ?? ""}
        className="mt-1 w-full rounded-xl border-2 border-crema-2 px-4 py-2 bg-blanco-calido"
      >
        <option value="">{requerido ? "Elegí una opción" : "No lo sé"}</option>
        {opciones.map(([v, t]) => (
          <option key={v} value={v}>{t}</option>
        ))}
      </select>
    </div>
  );
}
