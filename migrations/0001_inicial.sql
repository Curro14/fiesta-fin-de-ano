CREATE TABLE IF NOT EXISTS inscripciones (
  id TEXT PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  telefono TEXT NOT NULL,
  telnorm TEXT NOT NULL,
  email TEXT DEFAULT '',
  bebidas TEXT NOT NULL,
  refrescos TEXT NOT NULL,
  consumo TEXT,
  comentarios TEXT DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'pendiente',
  creado TEXT NOT NULL,
  pagadoEn TEXT,
  checkinEn TEXT
);
CREATE INDEX IF NOT EXISTS idx_telnorm ON inscripciones (telnorm);
