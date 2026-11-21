// Web de la fiesta en Cloudflare Workers + D1 (plan gratuito).
// Las páginas están en /public; aquí va la API y la base de datos.
import QRCode from 'qrcode';
import baseConfig from '../config.js';


// ---------- utilidades ----------
const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers } });

const enc = new TextEncoder();
async function firmar(secreto, valor) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secreto), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(valor));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}
function igual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
const hex = n => [...crypto.getRandomValues(new Uint8Array(n))].map(b => b.toString(16).padStart(2, '0')).join('');
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const codigoAleatorio = () => 'FA-' + [...crypto.getRandomValues(new Uint8Array(4))].map(b => ALFABETO[b % ALFABETO.length]).join('');
const limpiar = (s, max = 120) => String(s || '').trim().slice(0, max);

function configDe(env) {
  const c = structuredClone(baseConfig);
  if (env.PRECIO) c.pago.precio = Number(env.PRECIO);
  if (env.IBAN) c.pago.iban = env.IBAN;
  if (env.AFORO) c.aforo = Number(env.AFORO);
  c.adminPassword = env.ADMIN_PASSWORD || c.adminPassword;
  return c;
}

const fila = r => r && ({
  ...r,
  bebidas: JSON.parse(r.bebidas || '[]'),
  refrescos: JSON.parse(r.refrescos || '[]'),
});

// ---------- la app ----------
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;
    const config = configDe(env);
    const secreto = env.SESSION_SECRET || 'fiesta:' + config.adminPassword;
    const db = env.DB;

    // Páginas: Cloudflare sirve /admin desde admin.html; cada /entrada/<token> usa entrada.html
    if (request.method === 'GET' && pathname.startsWith('/entrada/')) {
      return env.ASSETS.fetch(new Request(new URL('/entrada', url), request));
    }
    if (!pathname.startsWith('/api/')) return env.ASSETS.fetch(request);

    const cuerpo = async () => { try { return await request.json(); } catch { return {}; } };
    const esAdmin = async () => {
      const m = /(?:^|;\s*)adm=([a-f0-9]+)/.exec(request.headers.get('Cookie') || '');
      return !!m && igual(m[1], await firmar(secreto, 'admin'));
    };
    const enlace = t => `${url.origin}/entrada/${t}`;
    const publico = i => ({
      codigo: i.codigo, nombre: i.nombre, estado: i.estado,
      bebidas: i.bebidas, refrescos: i.refrescos, consumo: i.consumo,
      comentarios: i.comentarios, creado: i.creado, checkinEn: i.checkinEn || null,
      enlace: enlace(i.token),
    });
    const activas = async () => (await db.prepare("SELECT COUNT(*) AS n FROM inscripciones WHERE estado != 'cancelado'").first()).n;
    const ruta = `${request.method} ${pathname}`;

    // ----- público -----
    if (ruta === 'GET /api/evento') {
      const { evento, pago, bebidas, refrescos, consumo, aforo } = config;
      return json({ evento, pago, bebidas, refrescos, consumo, aforo, plazasLibres: aforo ? Math.max(0, aforo - await activas()) : null });
    }

    if (ruta === 'POST /api/inscripcion') {
      const b = await cuerpo();
      const nombre = limpiar(b.nombre, 80);
      const telefono = limpiar(b.telefono, 30);
      if (nombre.length < 2) return json({ error: 'Pon tu nombre y apellido.' }, 400);
      if (!/^[+\d][\d\s-]{6,}$/.test(telefono)) return json({ error: 'Pon un teléfono válido.' }, 400);
      const ids = (arr, lista) => (Array.isArray(arr) ? arr : []).filter(id => lista.some(x => x.id === id));
      const bebidas = ids(b.bebidas, config.bebidas).slice(0, 1);
      if (!bebidas.length) return json({ error: 'Elige qué vas a beber.' }, 400);
      const tel = telefono.replace(/\D/g, '');
      const repetida = await db.prepare("SELECT token FROM inscripciones WHERE estado != 'cancelado' AND telnorm = ?").bind(tel).first();
      if (repetida) return json({ error: 'Ya hay una inscripción con ese teléfono.', enlace: `/entrada/${repetida.token}` }, 409);
      if (config.aforo && await activas() >= config.aforo) return json({ error: 'Lo sentimos, el aforo está completo.' }, 409);

      const token = hex(16);
      for (let intento = 0; intento < 5; intento++) {
        const codigo = codigoAleatorio();
        try {
          await db.prepare(`INSERT INTO inscripciones (id, token, codigo, nombre, telefono, telnorm, email, bebidas, refrescos, consumo, comentarios, estado, creado)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', ?)`)
            .bind(crypto.randomUUID(), token, codigo, nombre, telefono, tel, limpiar(b.email, 120),
              JSON.stringify(bebidas), JSON.stringify(ids(b.refrescos, config.refrescos).slice(0, 1)), config.consumo[1].id,
              limpiar(b.comentarios, 500), new Date().toISOString())
            .run();
          return json({ token, codigo });
        } catch (e) {
          if (!String(e).includes('UNIQUE')) throw e;
        }
      }
      return json({ error: 'Inténtalo otra vez.' }, 500);
    }

    if (request.method === 'GET' && pathname.startsWith('/api/entrada/')) {
      const i = fila(await db.prepare('SELECT * FROM inscripciones WHERE token = ?').bind(pathname.split('/').pop()).first());
      if (!i) return json({ error: 'Entrada no encontrada' }, 404);
      const datos = publico(i);
      if (i.estado === 'pagado') datos.qr = await QRCode.toString(datos.enlace, { type: 'svg', errorCorrectionLevel: 'M', margin: 1 });
      datos.admin = await esAdmin();
      return json(datos);
    }

    // ----- sesión -----
    if (ruta === 'POST /api/login') {
      const { password } = await cuerpo();
      if (!igual(String(password || ''), config.adminPassword)) return json({ error: 'Contraseña incorrecta' }, 401);
      const seguro = url.protocol === 'https:' ? '; Secure' : '';
      return json({ ok: true }, 200, { 'Set-Cookie': `adm=${await firmar(secreto, 'admin')}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 60}${seguro}` });
    }
    if (ruta === 'POST /api/logout') return json({ ok: true }, 200, { 'Set-Cookie': 'adm=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0' });
    if (ruta === 'GET /api/sesion') return json({ admin: await esAdmin() });

    // ----- solo organización -----
    if (!(await esAdmin())) return json({ error: 'No autorizado' }, 401);

    if (ruta === 'GET /api/admin/inscripciones') {
      const { results } = await db.prepare('SELECT * FROM inscripciones ORDER BY creado').all();
      return json(results.map(fila).map(i => ({ ...publico(i), id: i.id, telefono: i.telefono, email: i.email, pagadoEn: i.pagadoEn })));
    }

    let m = /^\/api\/admin\/inscripciones\/([\w-]+)$/.exec(pathname);
    if (m && request.method === 'PATCH') {
      const { estado } = await cuerpo();
      if (!['pendiente', 'pagado', 'cancelado'].includes(estado)) return json({ error: 'Estado no válido' }, 400);
      const r = await db.prepare(`UPDATE inscripciones SET estado = ?1,
          pagadoEn = CASE WHEN ?1 = 'pagado' THEN COALESCE(pagadoEn, ?2) ELSE NULL END,
          checkinEn = CASE WHEN ?1 = 'pagado' THEN checkinEn ELSE NULL END
        WHERE id = ?3`).bind(estado, new Date().toISOString(), m[1]).run();
      return r.meta.changes ? json({ ok: true }) : json({ error: 'No existe' }, 404);
    }
    if (m && request.method === 'DELETE') {
      const r = await db.prepare('DELETE FROM inscripciones WHERE id = ?').bind(m[1]).run();
      return r.meta.changes ? json({ ok: true }) : json({ error: 'No existe' }, 404);
    }

    if (ruta === 'GET /api/admin/resumen') {
      const soloPagados = url.searchParams.get('todos') !== '1';
      const { results } = await db.prepare("SELECT * FROM inscripciones WHERE estado != 'cancelado'").all();
      const todas = results.map(fila);
      const lista = todas.filter(i => !soloPagados || i.estado === 'pagado');
      const copasDe = id => (config.consumo.find(c => c.id === id) || config.consumo[1]).copas;
      const bebidas = Object.fromEntries(config.bebidas.map(b => [b.id, { ...b, personas: 0, copas: 0 }]));
      const refrescos = Object.fromEntries(config.refrescos.map(r => [r.id, { ...r, personas: 0, copas: 0 }]));
      const destilados = ['ron', 'ginebra', 'whisky', 'vodka'];
      for (const i of lista) {
        const porBebida = copasDe(i.consumo) / i.bebidas.length;
        i.bebidas.forEach(id => { if (bebidas[id]) { bebidas[id].personas++; bebidas[id].copas += porBebida; } });
        const copasDestilado = i.bebidas.filter(id => destilados.includes(id)).length * porBebida;
        if (i.refrescos.length && copasDestilado) {
          const porRefresco = copasDestilado * config.refrescoPorCopa / i.refrescos.length;
          i.refrescos.forEach(id => { if (refrescos[id]) { refrescos[id].personas++; refrescos[id].copas += porRefresco; } });
        }
      }
      const redondear = o => Object.values(o).map(x => ({
        ...x,
        copas: Math.round(x.copas),
        unidades: x.personasPorBotella ? Math.ceil(x.personas / x.personasPorBotella)
          : x.copasPorUnidad ? Math.ceil(x.copas / x.copasPorUnidad) : undefined,
        latas: (x.copasPorUnidad || x.personasPorBotella) ? undefined : Math.ceil(x.copas),
        botellas2L: (x.copasPorUnidad || x.personasPorBotella) ? undefined : Math.ceil(x.copas * 0.33 / 2),
      }));
      const pagados = todas.filter(i => i.estado === 'pagado').length;
      const pendientes = todas.filter(i => i.estado === 'pendiente').length;
      return json({
        personas: lista.length, soloPagados,
        bebidas: redondear(bebidas), refrescos: redondear(refrescos),
        totales: {
          inscritos: todas.length, pagados, pendientes,
          dentro: todas.filter(i => i.checkinEn).length,
          recaudado: pagados * config.pago.precio,
          porCobrar: pendientes * config.pago.precio,
        },
      });
    }

    if (ruta === 'GET /api/admin/export.csv') {
      const { results } = await db.prepare('SELECT * FROM inscripciones ORDER BY creado').all();
      const nombreDe = (l, id) => (l.find(x => x.id === id) || { nombre: id }).nombre;
      const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const filas = [['Código', 'Nombre', 'Teléfono', 'Email', 'Estado', 'Bebidas', 'Refrescos', 'Comentarios', 'Inscrito', 'Pagado', 'Entrada']];
      for (const i of results.map(fila)) {
        filas.push([i.codigo, i.nombre, i.telefono, i.email, i.estado,
          i.bebidas.map(id => nombreDe(config.bebidas, id)).join(', '),
          i.refrescos.map(id => nombreDe(config.refrescos, id)).join(', '),
          i.comentarios, i.creado, i.pagadoEn || '', i.checkinEn || '']);
      }
      return new Response('﻿' + filas.map(f => f.map(esc).join(';')).join('\n'), {
        headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="invitados.csv"' },
      });
    }

    if (ruta === 'POST /api/puerta/validar') {
      const s = String((await cuerpo()).valor || '').trim();
      const t = /\/entrada\/([a-f0-9]{32})/.exec(s) || /^([a-f0-9]{32})$/.exec(s);
      const i = t
        ? await db.prepare('SELECT * FROM inscripciones WHERE token = ?').bind(t[1]).first()
        : await db.prepare('SELECT * FROM inscripciones WHERE codigo = ?').bind('FA-' + s.toUpperCase().replace(/^FA-?/, '')).first();
      if (!i) return json({ resultado: 'invalida', mensaje: 'Entrada no reconocida' });
      const base = { nombre: i.nombre, codigo: i.codigo, id: i.id };
      if (i.estado === 'cancelado') return json({ ...base, resultado: 'invalida', mensaje: 'Inscripción cancelada' });
      if (i.estado !== 'pagado') return json({ ...base, resultado: 'pendiente', mensaje: 'Pago pendiente' });
      const ahora = new Date().toISOString();
      // Atómico: solo la primera lectura de este QR consigue marcar la entrada
      const r = await db.prepare('UPDATE inscripciones SET checkinEn = ? WHERE id = ? AND checkinEn IS NULL').bind(ahora, i.id).run();
      if (!r.meta.changes) {
        const ya = await db.prepare('SELECT checkinEn FROM inscripciones WHERE id = ?').bind(i.id).first();
        return json({ ...base, resultado: 'usada', mensaje: 'Esta entrada ya se usó', checkinEn: ya.checkinEn });
      }
      return json({ ...base, resultado: 'ok', mensaje: '¡Bienvenido/a!', checkinEn: ahora });
    }

    if (ruta === 'POST /api/puerta/deshacer') {
      const r = await db.prepare('UPDATE inscripciones SET checkinEn = NULL WHERE id = ?').bind((await cuerpo()).id || '').run();
      return r.meta.changes ? json({ ok: true }) : json({ error: 'No existe' }, 404);
    }

    return json({ error: 'No encontrado' }, 404);
  },
};
