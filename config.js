// ============================================================
//  CONFIGURACIÓN DE LA FIESTA — edita estos valores a tu gusto
//  La contraseña del panel en internet NO es la de aquí: se guarda
//  aparte en Cloudflare (ver README).
// ============================================================

export default {
  evento: {
    nombre: 'Fiesta de Fin de Año 2026',
    fecha: 'Nochevieja, jueves 31 de diciembre',
    hora: '1:30',
    horario: 'Entrada de 1:30 a 2:00 · cierre a las 6:00',
    // Apertura de puertas (para la cuenta atrás)
    apertura: '2027-01-01T01:30:00+01:00',
    lugar: 'Sala Dalí',
    direccion: 'Calle Cardenal Bueno Monreal, 56',
    descripcion: 'El año pasado salió de 10, así que repetimos. Barra libre de primeras marcas hasta las seis.',
    // Fecha límite para apuntarse (texto informativo, déjalo vacío si no hay)
    fechaLimite: '',
  },

  pago: {
    precio: 30, // € por persona
    // El Bizum se puede mandar a cualquiera de los organizadores
    organizadores: [
      { nombre: 'David',   bizum: '674 15 11 45' },
      { nombre: 'Antonio', bizum: '674 58 26 24' },
      { nombre: 'Pablo',   bizum: '644 02 17 99' },
      { nombre: 'Enrique', bizum: '611 48 63 49' },
      { nombre: 'Curro',   bizum: '673 92 08 38' },
    ],
    // Opcional: si alguien prefiere transferencia
    iban: '',
  },

  // Contraseña del panel de organizador y de la app de la puerta
  adminPassword: 'cambiame',

  // Aforo máximo (0 = sin límite)
  aforo: 120,

  // Bebidas que puede elegir cada invitado.
  // Lista de la compra: los destilados se calculan a 1 botella por cada "personasPorBotella";
  // el resto, con "copasPorUnidad".
  bebidas: [
    { id: 'ron',      nombre: 'Ron',              unidad: 'botella 70cl', personasPorBotella: 3 },
    { id: 'ginebra',  nombre: 'Ginebra',          unidad: 'botella 70cl', personasPorBotella: 3 },
    { id: 'whisky',   nombre: 'Whisky',           unidad: 'botella 70cl', personasPorBotella: 3 },
    { id: 'vodka',    nombre: 'Vodka',            unidad: 'botella 70cl', personasPorBotella: 3 },
    { id: 'cerveza',  nombre: 'Cerveza',          unidad: 'lata/botellín', copasPorUnidad: 1 },
    { id: 'sinalcohol', nombre: 'Sin alcohol',    unidad: 'botella 2L',   copasPorUnidad: 8 },
  ],

  refrescos: [
    { id: 'cola',         nombre: 'Coca-Cola' },
    { id: 'colazero',     nombre: 'Coca-Cola Zero' },
    { id: 'tonica',       nombre: 'Tónica' },
    { id: 'fantanaranja', nombre: 'Fanta Naranja' },
    { id: 'fantalimon',   nombre: 'Fanta Limón' },
    { id: 'sprite',       nombre: 'Sprite' },
  ],

  // Consumo estimado que elige el invitado → nº de copas para calcular la compra
  consumo: [
    { id: 'poco',  nombre: 'Tranqui (1–2 copas)', copas: 2 },
    { id: 'medio', nombre: 'Normal (3–4 copas)',  copas: 4 },
    { id: 'mucho', nombre: 'A tope (5+ copas)',   copas: 6 },
  ],

  // Cada copa de destilado lleva ~1 refresco de 33cl (o 1/6 de botella de 2L)
  refrescoPorCopa: 1,
};
