// Fotos de stock que decoran la web (Unsplash, licencia libre, en /public/fotos).
// Cuando haya muy buenas fotos de animales reales publicados, basta con
// reemplazar los archivos o cambiar las rutas ACÁ y se actualiza todo el sitio.

export const FOTOS = {
  /** Collage del hero de la home (4 fotos) */
  hero: [
    { src: "/fotos/hero-1.jpg", alt: "Perro beagle sonriendo" },
    { src: "/fotos/hero-2.jpg", alt: "Gato blanco y negro asomado" },
    { src: "/fotos/hero-3.jpg", alt: "Dos perros corriendo felices" },
    { src: "/fotos/hero-4.jpg", alt: "Gato naranja descansando" },
  ],
  /** Página /transito y estados relacionados */
  transito: { src: "/fotos/amigos.jpg", alt: "Un perro y un gato descansando juntos" },
  /** Placeholder para refugios sin fotos propias */
  refugio: { src: "/fotos/amigos.jpg", alt: "Un perro y un gato descansando juntos" },
  /** Página /donaciones */
  donaciones: { src: "/fotos/gatito.jpg", alt: "Gatito levantando la patita" },
  /** Página 404 */
  noEncontrada: { src: "/fotos/pug-404.jpg", alt: "Pug con cara de perdido" },
  /** Estados vacíos (catálogo sin resultados, bandeja sin mensajes) */
  vacio: { src: "/fotos/cachorro.jpg", alt: "Cachorro de corgi sentado" },
} as const;
