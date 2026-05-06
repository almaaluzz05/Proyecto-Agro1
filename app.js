// ══════════════════════════════════════════════════════
//  app.js — Lógica principal de PlantaGuía
// ══════════════════════════════════════════════════════

// ─── Estado global de la app ───────────────────────
let categoriaActual  = 'todas';   // Filtro activo en búsqueda
let plantaRiegoId    = null;      // ID de planta al registrar riego

// ─── Cargar datos del localStorage ─────────────────
function cargarFavoritas()   { return JSON.parse(localStorage.getItem('pg-favoritas')   || '[]'); }
function cargarMisPlantas()  { return JSON.parse(localStorage.getItem('pg-mis-plantas') || '[]'); }
function guardarFavoritas(f) { localStorage.setItem('pg-favoritas',   JSON.stringify(f)); }
function guardarMisPlantas(p){ localStorage.setItem('pg-mis-plantas', JSON.stringify(p)); }

// ══════════════════════════════════════════════════════
//  NAVEGACIÓN
// ══════════════════════════════════════════════════════

function irA(id) {
  // Ocultar todas las pantallas
  document.querySelectorAll('.pantalla').forEach(p => p.classList.remove('activa'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  // Mostrar la pantalla y activar el botón correspondiente
  document.getElementById('pantalla-' + id).classList.add('activa');
  document.getElementById('nav-' + id).classList.add('active');

  // Acciones específicas por pantalla
  if (id === 'inicio')        renderInicio();
  if (id === 'buscar')        renderBuscar();
  if (id === 'favoritas')     renderFavoritas();
  if (id === 'mis-plantas')   renderMisPlantas();
  if (id === 'recordatorios') renderRecordatorios();

  window.scrollTo(0, 0);
}

// ══════════════════════════════════════════════════════
//  PANTALLA: INICIO
// ══════════════════════════════════════════════════════

function renderInicio() {
  // Saludo según hora del día
  const hora = new Date().getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 20 ? 'Buenas tardes' : 'Buenas noches';
  document.getElementById('saludo-hora').textContent = saludo;

  // Stats
  const favoritas  = cargarFavoritas();
  const misPlantas = cargarMisPlantas();
  const urgentes   = misPlantas.filter(p => diasHastaRiego(p) <= 0).length;

  document.getElementById('stats-row').innerHTML = `
    <div class="stat-card">
      <div class="stat-num">${PLANTAS.length}</div>
      <div class="stat-label">Plantas en la guía</div>
    </div>
    <div class="stat-card">
      <div class="stat-num">${favoritas.length}</div>
      <div class="stat-label">Favoritas</div>
    </div>
    <div class="stat-card">
      <div class="stat-num" style="color:${urgentes > 0 ? 'var(--rojo)' : 'var(--verde-medio)'}">${urgentes}</div>
      <div class="stat-label">Riegos urgentes</div>
    </div>`;

  // Próximos riegos
  const contenedorRiegos = document.getElementById('proximos-riegos');
  if (misPlantas.length === 0) {
    contenedorRiegos.innerHTML = `
      <div style="text-align:center; padding:1rem; color:var(--texto-suave); font-size:14px;">
        Agregá plantas propias para ver los recordatorios de riego
      </div>`;
  } else {
    const ordenadas = [...misPlantas].sort((a, b) => diasHastaRiego(a) - diasHastaRiego(b));
    contenedorRiegos.innerHTML = ordenadas.slice(0, 4).map(p => {
      const dias     = diasHastaRiego(p);
      const planta   = PLANTAS.find(x => x.id === p.plantaId);
      const claseItem  = dias < 0 ? 'urgente' : dias === 0 ? 'hoy' : '';
      const claseBadge = dias < 0 ? 'badge-rojo' : dias === 0 ? 'badge-amarillo' : 'badge-verde';
      const textoBadge = dias < 0 ? `Venció hace ${Math.abs(dias)}d` : dias === 0 ? '¡Hoy!' : `En ${dias}d`;
      return `
        <div class="riego-item ${claseItem}">
          <div class="riego-emoji">${planta ? planta.emoji : '🌱'}</div>
          <div class="riego-info">
            <div class="riego-nombre">${p.nombrePersonalizado || planta?.nombre || 'Planta'}</div>
            <div class="riego-fecha">Cada ${planta?.diasRiego || '?'} días</div>
          </div>
          <span class="riego-badge ${claseBadge}">${textoBadge}</span>
        </div>`;
    }).join('');
  }

  // Plantas destacadas (4 al azar)
  const mezcladas = [...PLANTAS].sort(() => Math.random() - 0.5).slice(0, 4);
  document.getElementById('plantas-destacadas').innerHTML = mezcladas.map(p => cardPlantaHTML(p)).join('');
}

// ══════════════════════════════════════════════════════
//  PANTALLA: BUSCAR
// ══════════════════════════════════════════════════════

function renderBuscar(filtroTexto = '') {
  let resultado = PLANTAS;

  // Filtrar por categoría
  if (categoriaActual !== 'todas') {
   resultado = resultado.filter(p => 
  Array.isArray(p.categoria) 
    ? p.categoria.includes(categoriaActual) 
    : p.categoria === categoriaActual
);
  }

  // Filtrar por texto
  if (filtroTexto) {
    const q = filtroTexto.toLowerCase();
    resultado = resultado.filter(p =>
      p.nombre.toLowerCase().includes(q) ||
      p.cientifico.toLowerCase().includes(q) ||
      p.tags.some(t => t.includes(q))
    );
  }

  const contenedor = document.getElementById('resultados-buscar');
  if (resultado.length === 0) {
    contenedor.innerHTML = `
      <div style="text-align:center; padding:2rem; color:var(--texto-suave); font-size:14px; grid-column:1/-1;">
        No encontramos plantas con esa búsqueda
      </div>`;
  } else {
    contenedor.innerHTML = resultado.map(p => cardPlantaHTML(p)).join('');
  }
}

function buscarPlantas() {
  const val = document.getElementById('input-buscar').value;
  document.getElementById('btn-clear-buscar').style.display = val ? 'block' : 'none';
  renderBuscar(val);
}

function limpiarBusqueda() {
  document.getElementById('input-buscar').value = '';
  document.getElementById('btn-clear-buscar').style.display = 'none';
  renderBuscar();
}

function filtrarCategoria(cat, btn) {
  categoriaActual = cat;
  document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('activo'));
  btn.classList.add('activo');
  renderBuscar(document.getElementById('input-buscar').value);
}

// ══════════════════════════════════════════════════════
//  PANTALLA: FAVORITAS
// ══════════════════════════════════════════════════════

function renderFavoritas() {
  const ids        = cargarFavoritas();
  const favoritas  = PLANTAS.filter(p => ids.includes(p.id));
  const contenedor = document.getElementById('lista-favoritas');
  const vacio      = document.getElementById('favoritas-vacio');

  if (favoritas.length === 0) {
    contenedor.innerHTML = '';
    vacio.classList.remove('hidden');
  } else {
    vacio.classList.add('hidden');
    contenedor.innerHTML = favoritas.map(p => cardPlantaHTML(p)).join('');
  }
}

function toggleFavorita(id, evento) {
  evento.stopPropagation(); // Evitar que abra el modal
  const ids = cargarFavoritas();
  const idx = ids.indexOf(id);
  if (idx === -1) ids.push(id);
  else ids.splice(idx, 1);
  guardarFavoritas(ids);

  // Actualizar el ícono del botón
  const btn = document.querySelector(`.card-fav-btn[data-id="${id}"]`);
  if (btn) btn.textContent = ids.includes(id) ? '❤️' : '🤍';

  // Si estamos en favoritas, refrescar la lista
  if (document.getElementById('pantalla-favoritas').classList.contains('activa')) {
    renderFavoritas();
  }
}

// ══════════════════════════════════════════════════════
//  PANTALLA: MIS PLANTAS
// ══════════════════════════════════════════════════════

function renderMisPlantas() {
  const misPlantas = cargarMisPlantas();
  const contenedor = document.getElementById('lista-mis-plantas');
  const vacio      = document.getElementById('mis-plantas-vacio');

  if (misPlantas.length === 0) {
    contenedor.innerHTML = '';
    vacio.classList.remove('hidden');
    return;
  }

  vacio.classList.add('hidden');
  contenedor.innerHTML = misPlantas.map(p => {
    const planta = PLANTAS.find(x => x.id === p.plantaId);
    if (!planta) return '';
    const dias     = diasHastaRiego(p);
    const claseBadge = dias < 0 ? 'badge-rojo' : dias === 0 ? 'badge-amarillo' : 'badge-verde';
    const textoBadge = dias < 0 ? `Regar hace ${Math.abs(dias)}d` : dias === 0 ? '¡Regar hoy!' : `Regar en ${dias}d`;

    return `
      <div class="mi-planta-card">
        <div class="mi-planta-emoji">${planta.emoji}</div>
        <div class="mi-planta-info">
          <div class="mi-planta-nombre">${p.nombrePersonalizado || planta.nombre}</div>
          <div class="mi-planta-especie">${planta.cientifico}</div>
          <div class="mi-planta-estado">
            <span class="riego-badge ${claseBadge}" style="margin-right:6px">${textoBadge}</span>
          </div>
          ${p.notas ? `<div style="font-size:12px;color:var(--texto-suave);margin-bottom:8px;font-style:italic">"${p.notas}"</div>` : ''}
          <div class="mi-planta-acciones">
            <button class="btn-sm btn-sm-verde" onclick="abrirModalRiego(${p.id})">💧 Registrar riego</button>
            <button class="btn-sm btn-sm-rojo" onclick="eliminarMiPlanta(${p.id})">🗑</button>
          </div>
        </div>
      </div>`;
  }).join('');
}

function abrirModalAgregarPlanta() {
  // Llenar el select con todas las plantas
  document.getElementById('select-planta').innerHTML =
    PLANTAS.map(p => `<option value="${p.id}">${p.emoji} ${p.nombre} (${p.cientifico})</option>`).join('');

  // Fecha de hoy por defecto
  document.getElementById('input-ultimo-riego').value = hoy();
  document.getElementById('input-nombre-planta').value = '';
  document.getElementById('input-notas').value = '';

  document.getElementById('modal-agregar').classList.remove('hidden');
}

function guardarMiPlanta() {
  const plantaId         = parseInt(document.getElementById('select-planta').value);
  const nombrePersonalizado = document.getElementById('input-nombre-planta').value.trim();
  const ultimoRiego      = document.getElementById('input-ultimo-riego').value;
  const notas            = document.getElementById('input-notas').value.trim();

  if (!ultimoRiego) { alert('Por favor ingresá la fecha del último riego'); return; }

  const misPlantas = cargarMisPlantas();
  misPlantas.push({
    id:                 Date.now(),
    plantaId,
    nombrePersonalizado,
    ultimoRiego,
    notas,
    historialRiegos:    [ultimoRiego]
  });

  guardarMisPlantas(misPlantas);
  cerrarModal('modal-agregar');
  renderMisPlantas();
}

function eliminarMiPlanta(id) {
  if (!confirm('¿Eliminar esta planta de tu lista?')) return;
  const misPlantas = cargarMisPlantas().filter(p => p.id !== id);
  guardarMisPlantas(misPlantas);
  renderMisPlantas();
}

// ══════════════════════════════════════════════════════
//  PANTALLA: RECORDATORIOS
// ══════════════════════════════════════════════════════

function renderRecordatorios() {
  const misPlantas = cargarMisPlantas();
  const contenedor = document.getElementById('lista-recordatorios');
  const vacio      = document.getElementById('recordatorios-vacio');

  if (misPlantas.length === 0) {
    contenedor.innerHTML = '';
    vacio.classList.remove('hidden');
    return;
  }

  vacio.classList.add('hidden');

  // Ordenar por urgencia
  const ordenadas = [...misPlantas].sort((a, b) => diasHastaRiego(a) - diasHastaRiego(b));

  contenedor.innerHTML = ordenadas.map(p => {
    const planta = PLANTAS.find(x => x.id === p.plantaId);
    if (!planta) return '';

    const dias     = diasHastaRiego(p);
    const ciclo    = planta.diasRiego;

    // Calcular porcentaje de la barra (cuán urgente es)
    const porcentaje = Math.max(0, Math.min(100, ((ciclo - dias) / ciclo) * 100));
    const claseUrgencia = dias < 0 ? 'urgente' : dias <= 2 ? 'pronto' : '';

    const textoDias = dias < 0
      ? `⚠️ Venció hace ${Math.abs(dias)} día${Math.abs(dias) !== 1 ? 's' : ''}`
      : dias === 0 ? '💧 ¡Regar hoy!'
      : `Faltan ${dias} día${dias !== 1 ? 's' : ''}`;

    return `
      <div class="recordatorio-card">
        <div class="rec-header">
          <div class="rec-emoji">${planta.emoji}</div>
          <div>
            <div class="rec-titulo">${p.nombrePersonalizado || planta.nombre}</div>
            <div class="rec-especie">${planta.cientifico}</div>
          </div>
        </div>
        <div class="rec-barra-wrap">
          <div class="rec-barra ${claseUrgencia}" style="width:${porcentaje}%"></div>
        </div>
        <div class="rec-pie">
          <span class="rec-dias">${textoDias}</span>
          <button class="btn-sm btn-sm-verde" onclick="abrirModalRiego(${p.id})">💧 Regar</button>
        </div>
      </div>`;
  }).join('');
}

// ══════════════════════════════════════════════════════
//  MODAL: REGISTRAR RIEGO
// ══════════════════════════════════════════════════════

function abrirModalRiego(miPlantaId) {
  plantaRiegoId = miPlantaId;
  const p      = cargarMisPlantas().find(x => x.id === miPlantaId);
  const planta = PLANTAS.find(x => x.id === p?.plantaId);

  document.getElementById('modal-riego-nombre').textContent =
    p?.nombrePersonalizado || planta?.nombre || 'Mi planta';
  document.getElementById('input-fecha-riego').value = hoy();
  document.getElementById('input-nota-riego').value = '';
  document.getElementById('modal-riego').classList.remove('hidden');
}

function confirmarRiego() {
  const fecha = document.getElementById('input-fecha-riego').value;
  if (!fecha) { alert('Ingresá la fecha del riego'); return; }

  const misPlantas = cargarMisPlantas();
  const idx = misPlantas.findIndex(p => p.id === plantaRiegoId);
  if (idx === -1) return;

  misPlantas[idx].ultimoRiego = fecha;
  if (!misPlantas[idx].historialRiegos) misPlantas[idx].historialRiegos = [];
  misPlantas[idx].historialRiegos.push(fecha);

  guardarMisPlantas(misPlantas);
  cerrarModal('modal-riego');

  // Refrescar la pantalla activa
  if (document.getElementById('pantalla-mis-plantas').classList.contains('activa'))   renderMisPlantas();
  if (document.getElementById('pantalla-recordatorios').classList.contains('activa')) renderRecordatorios();
  if (document.getElementById('pantalla-inicio').classList.contains('activa'))        renderInicio();
}

// ══════════════════════════════════════════════════════
//  MODAL: DETALLE DE PLANTA
// ══════════════════════════════════════════════════════

function abrirDetalle(id) {
  const p   = PLANTAS.find(x => x.id === id);
  if (!p) return;

  const fav = cargarFavoritas().includes(id);
  const dificultadColor = p.dificultad === 'Fácil' ? 'var(--verde-medio)' : 'var(--amarillo)';

  document.getElementById('modal-planta-contenido').innerHTML = `
    <div class="detalle-hero">
      <div class="detalle-emoji">${p.emoji}</div>
      <div class="detalle-nombre">${p.nombre}</div>
      <div class="detalle-cientifico">${p.cientifico}</div>
    </div>

    <div class="detalle-fichas">
      <div class="ficha">
        <div class="ficha-icono">💧</div>
        <div class="ficha-label">Riego</div>
        <div class="ficha-valor">Cada ${p.diasRiego} días</div>
      </div>
      <div class="ficha">
        <div class="ficha-icono">☀️</div>
        <div class="ficha-label">Luz</div>
        <div class="ficha-valor">${p.luz}</div>
      </div>
      <div class="ficha">
        <div class="ficha-icono">📅</div>
        <div class="ficha-label">Mejor época</div>
        <div class="ficha-valor">${p.mesesSiembra}</div>
      </div>
      <div class="ficha">
        <div class="ficha-icono">⭐</div>
        <div class="ficha-label">Dificultad</div>
        <div class="ficha-valor" style="color:${dificultadColor}">${p.dificultad}</div>
      </div>
    </div>

    <div class="detalle-seccion">
      <h4>Descripción</h4>
      <p>${p.descripcion}</p>
    </div>

    <div class="detalle-seccion">
      <h4>Cuidados</h4>
      <p>${p.cuidados}</p>
    </div>

    <div class="detalle-seccion">
      <h4>¿Sabías que...?</h4>
      <p style="font-style:italic; color:var(--verde-medio)">${p.curiosidad}</p>
    </div>

    <div class="detalle-acciones">
      <button class="btn-accion-outline" onclick="toggleFavoritaDesdeDetalle(${p.id})" id="btn-fav-detalle">
        ${fav ? '❤️ En favoritas' : '🤍 Agregar favorita'}
      </button>
      <button class="btn-accion" onclick="agregarDesdeDetalle(${p.id})">
        🪴 Agregar a mis plantas
      </button>
    </div>`;

  document.getElementById('modal-planta').classList.remove('hidden');
}

function toggleFavoritaDesdeDetalle(id) {
  const ids = cargarFavoritas();
  const idx = ids.indexOf(id);
  if (idx === -1) ids.push(id);
  else ids.splice(idx, 1);
  guardarFavoritas(ids);

  const btn = document.getElementById('btn-fav-detalle');
  if (btn) btn.textContent = ids.includes(id) ? '❤️ En favoritas' : '🤍 Agregar favorita';
}

function agregarDesdeDetalle(plantaId) {
  cerrarModal('modal-planta');
  abrirModalAgregarPlanta();
  // Pre-seleccionar la planta
  setTimeout(() => {
    document.getElementById('select-planta').value = plantaId;
  }, 100);
}

// ══════════════════════════════════════════════════════
//  HELPERS (funciones de ayuda)
// ══════════════════════════════════════════════════════

/**
 * Genera el HTML de una card de planta
 */
function cardPlantaHTML(p) {
  const favoritas = cargarFavoritas();
  const esFav     = favoritas.includes(p.id);
  const tagHTML   = p.tags.slice(0, 2).map(t =>
    `<span class="tag tag-verde">${t}</span>`).join('');

  return `
    <div class="card-planta" onclick="abrirDetalle(${p.id})">
      <div class="card-planta-emoji">${p.emoji}</div>
      <div class="card-planta-body">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div style="flex:1; min-width:0;">
            <div class="card-planta-nombre">${p.nombre}</div>
            <div class="card-planta-cientifico">${p.cientifico}</div>
          </div>
          <button class="card-fav-btn" data-id="${p.id}"
            onclick="toggleFavorita(${p.id}, event)">${esFav ? '❤️' : '🤍'}</button>
        </div>
        <div class="card-planta-tags">
          ${tagHTML}
          <span class="tag tag-tierra">💧 ${p.diasRiego}d</span>
        </div>
      </div>
    </div>`;
}

/**
 * Calcula los días que faltan para el próximo riego
 * Número negativo = ya venció
 */
function diasHastaRiego(miPlanta) {
  const planta      = PLANTAS.find(x => x.id === miPlanta.plantaId);
  if (!planta || !miPlanta.ultimoRiego) return 0;

  const ultimoRiego = new Date(miPlanta.ultimoRiego + 'T00:00:00');
  const proximo     = new Date(ultimoRiego);
  proximo.setDate(proximo.getDate() + planta.diasRiego);

  const ahora = new Date();
  ahora.setHours(0, 0, 0, 0);

  return Math.round((proximo - ahora) / (1000 * 60 * 60 * 24));
}

/**
 * Devuelve la fecha de hoy en formato YYYY-MM-DD para inputs tipo date
 */
function hoy() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Cierra un modal por su ID
 */
function cerrarModal(id) {
  document.getElementById(id).classList.add('hidden');
}

// ══════════════════════════════════════════════════════
//  INICIO DE LA APP
// ══════════════════════════════════════════════════════

irA('inicio');
