/* ═══════════════════════════════════════════════════════════
   U.E. Fabricio Ojeda · Gestión estudiantil
   App sin dependencias · datos en localStorage
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const DB_KEY = 'uefabricio.db.v1';
  const THEME_KEY = 'uefabricio.theme';
  const APP_VERSION = '2.1';
  const YEAR_COLORS = { 1: '#4f7cff', 2: '#22c7d6', 3: '#16c79a', 4: '#f5a524', 5: '#ef5a6f' };
  const SEX_COLORS = { m: '#4f8cff', f: '#f06aa7' };
  const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const THEMES = ['light', 'dark', 'black'];
  const THEME_LABEL = { light: 'Claro', dark: 'Oscuro', black: 'Negro' };
  const ATT_LABEL = { phone: 'Sin teléfono', address: 'Sin dirección', rep: 'Sin representante', cedula: 'Sin cédula' };
  const VIEW_META = {
    resumen: { title: 'Resumen', eyebrow: 'Panel general' },
    estudiantes: { title: 'Estudiantes', eyebrow: 'Directorio' },
    matricula: { title: 'Matrícula', eyebrow: 'Cifras del año' },
    configuracion: { title: 'Configuración', eyebrow: 'Ajustes de la app' }
  };
  const DEFAULT_SETTINGS = {
    theme: 'dark',
    institution: 'U.E. Fabricio Ojeda',
    location: 'Boconó, Trujillo',
    schoolYear: '2025 – 2026',
    perPage: 12
  };
  const DEFAULT_SECTIONS = { 1: ['A'], 2: ['A'], 3: ['A'], 4: ['A'], 5: ['A'] };

  /* ── helpers ─────────────────────────────────────────── */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const normalize = (v) => String(v == null ? '' : v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const pad = (n) => String(n).padStart(2, '0');
  const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  const nowISO = () => new Date().toISOString();
  const uid = () => 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  function parseISO(value) {
    if (!value) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
    if (!m) return null;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    if (d.getFullYear() !== Number(m[1]) || d.getMonth() !== Number(m[2]) - 1 || d.getDate() !== Number(m[3])) return null;
    return d;
  }
  function ageOf(date) {
    if (!date) return null;
    const t = new Date();
    let a = t.getFullYear() - date.getFullYear();
    const m = t.getMonth() - date.getMonth();
    if (m < 0 || (m === 0 && t.getDate() < date.getDate())) a--;
    return a;
  }
  function initials(name) {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    return ((parts[0] ? parts[0][0] : '') + (parts[1] ? parts[1][0] : '')).toUpperCase() || '··';
  }
  function formatCedula(raw) {
    if (!raw) return '—';
    const s = String(raw).trim();
    const m = /^([VE])-?\s*(\d{5,})$/i.exec(s);
    if (!m) return s;
    return m[1].toUpperCase() + '-' + m[2].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
  function formatDateShort(iso) {
    const d = parseISO(iso);
    return d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}` : '—';
  }
  function formatDateLong(iso) {
    const d = parseISO(iso);
    return d ? `${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}` : '—';
  }
  function phoneDigits(phone) { return String(phone || '').replace(/\D/g, ''); }
  function waNumber(phone) {
    const d = phoneDigits(phone);
    if (d.length === 11 && d.startsWith('0')) return '58' + d.slice(1);
    if (d.length === 12 && d.startsWith('58')) return d;
    if (d.length === 10 && d.startsWith('4')) return '58' + d;
    return null;
  }
  function telNumber(phone) {
    const d = phoneDigits(phone);
    if (!d) return null;
    if (d.startsWith('58')) return d;
    if (d.startsWith('0')) return '58' + d.slice(1);
    return '58' + d;
  }
  function ageText(iso) {
    const d = parseISO(iso);
    if (!d) return '';
    const a = ageOf(d);
    return a == null ? '' : a + ' años';
  }
  function timeAgo(iso) {
    if (!iso) return '';
    const then = new Date(iso);
    if (isNaN(then)) return '';
    const diff = Math.max(0, Date.now() - then.getTime());
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'ahora';
    if (min < 60) return `hace ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `hace ${h} h`;
    const d = Math.floor(h / 24);
    if (d === 1) return 'ayer';
    if (d < 30) return `hace ${d} d`;
    return formatDateShort(iso.slice(0, 10));
  }
  function formatDateTime(iso) {
    const d = iso ? new Date(iso) : null;
    if (!d || isNaN(d)) return 'Sin cambios';
    return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  /* ── persistencia ────────────────────────────────────── */
  let storageOK = true;
  try {
    localStorage.setItem('__uef_test__', '1');
    localStorage.removeItem('__uef_test__');
  } catch (e) { storageOK = false; }

  function emptyInitial() {
    return {
      1: { m: 0, f: 0 }, 2: { m: 0, f: 0 }, 3: { m: 0, f: 0 },
      4: { m: 0, f: 0 }, 5: { m: 0, f: 0 }
    };
  }
  function defaultSections() {
    return {
      1: ['A'], 2: ['A'], 3: ['A'], 4: ['A'], 5: ['A']
    };
  }
  function defaultDB() {
    return { version: 3, students: [], sections: defaultSections(), initial: emptyInitial(), settings: Object.assign({}, DEFAULT_SETTINGS), updatedAt: null };
  }
  function cleanStr(v, max) {
    const s = String(v == null ? '' : v).trim();
    return max ? s.slice(0, max) : s;
  }
  function cleanSection(v) {
    return cleanStr(v, 5).toUpperCase().replace(/[^A-Z0-9ÁÉÍÓÚÑÜ]/g, '');
  }
  function normalizeStudent(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const name = cleanStr(raw.name, 90);
    const year = Number(raw.year);
    if (!name || !(year >= 1 && year <= 5)) return null;
    const birthDate = parseISO(raw.birthDate) ? raw.birthDate : '';
    const created = raw.createdAt && !isNaN(new Date(raw.createdAt)) ? raw.createdAt : nowISO();
    const updated = raw.updatedAt && !isNaN(new Date(raw.updatedAt)) ? raw.updatedAt : created;
    return {
      id: String(raw.id || uid()),
      name,
      year,
      section: cleanSection(raw.section),
      sex: raw.sex === 'F' ? 'F' : raw.sex === 'M' ? 'M' : '',
      cedula: cleanStr(raw.cedula, 20),
      birthDate,
      birthPlace: cleanStr(raw.birthPlace, 60),
      repName: cleanStr(raw.repName, 90),
      repCedula: cleanStr(raw.repCedula, 20),
      phone: cleanStr(raw.phone, 20),
      address: cleanStr(raw.address, 120),
      notes: cleanStr(raw.notes, 600),
      createdAt: created,
      updatedAt: updated
    };
  }
  function normalizeSections(raw) {
    const out = {};
    [1, 2, 3, 4, 5].forEach((y) => {
      let source;
      if (raw && typeof raw === 'object') {
        if (Object.prototype.hasOwnProperty.call(raw, y)) source = raw[y];
        else if (Object.prototype.hasOwnProperty.call(raw, String(y))) source = raw[String(y)];
      }
      let list;
      if (source === undefined) list = ['A'];
      else if (Array.isArray(source)) list = source;
      else list = [];
      const seen = new Set();
      const clean = [];
      list.forEach((item) => {
        const name = cleanSection(item);
        if (name && !seen.has(name)) { seen.add(name); clean.push(name); }
      });
      out[y] = clean.slice(0, 20);
    });
    return out;
  }
  function normalizeInitial(raw) {
    const out = emptyInitial();
    if (!raw || typeof raw !== 'object') return out;
    [1, 2, 3, 4, 5].forEach((y) => {
      const item = raw[y] || raw[String(y)] || {};
      out[y] = {
        m: Math.max(0, Math.min(999, parseInt(item.m, 10) || 0)),
        f: Math.max(0, Math.min(999, parseInt(item.f, 10) || 0))
      };
    });
    return out;
  }
  function normalizeDB(raw) {
    const base = defaultDB();
    if (!raw || typeof raw !== 'object') return base;
    const ids = new Set();
    base.students = (Array.isArray(raw.students) ? raw.students : []).map(normalizeStudent).filter(Boolean).map((s) => {
      if (ids.has(s.id)) s.id = uid();
      ids.add(s.id);
      return s;
    });
    base.sections = normalizeSections(raw.sections);
    const migrating = Number(raw.version || 2) < 3;
    base.students.forEach((s) => {
      if (!base.sections[s.year]) base.sections[s.year] = [];
      if (s.section && !base.sections[s.year].includes(s.section)) base.sections[s.year].push(s.section);
      if (!s.section && migrating && base.sections[s.year].length) s.section = base.sections[s.year][0];
    });
    base.initial = normalizeInitial(raw.initial);
    const settings = Object.assign({}, DEFAULT_SETTINGS, raw.settings || {});
    settings.theme = THEMES.includes(settings.theme) ? settings.theme : 'dark';
    settings.perPage = [10, 12, 20, 30].includes(Number(settings.perPage)) ? Number(settings.perPage) : 12;
    settings.institution = cleanStr(settings.institution, 70) || DEFAULT_SETTINGS.institution;
    settings.location = cleanStr(settings.location, 50) || DEFAULT_SETTINGS.location;
    settings.schoolYear = cleanStr(settings.schoolYear, 20) || DEFAULT_SETTINGS.schoolYear;
    base.settings = settings;
    base.version = 3;
    base.updatedAt = raw.updatedAt && !isNaN(new Date(raw.updatedAt)) ? raw.updatedAt : null;
    return base;
  }

  function loadDB() {
    let raw = null;
    try { raw = localStorage.getItem(DB_KEY); } catch (e) { storageOK = false; }
    if (!raw) return defaultDB();
    try { return normalizeDB(JSON.parse(raw)); } catch (e) { return defaultDB(); }
  }
  function saveDB() {
    db.updatedAt = nowISO();
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(db));
      storageOK = true;
    } catch (e) {
      storageOK = false;
      const side = $('#sideSaved');
      if (side) side.textContent = 'No se pudo guardar';
    }
    updateSaveLabels();
  }

  let db = loadDB();
  let students = [];
  let noteSavedTimer = null;
  let saveTimer = null;

  const state = {
    view: 'resumen',
    query: '',
    year: 'all',
    section: 'all',
    sex: 'all',
    attention: null,
    sort: 'name',
    dir: 1,
    page: 1,
    perPage: [10, 12, 20, 30].includes(Number(db.settings.perPage)) ? Number(db.settings.perPage) : 12,
    activeId: null,
    editingId: null,
    currentList: [],
    emptyMode: 'add',
    printing: false,
    printMode: 'filtered',
    stats: null
  };

  /* ── datos derivados ─────────────────────────────────── */
  function refreshStudents() {
    students = db.students.map((s) => {
      const birth = parseISO(s.birthDate);
      return Object.assign({}, s, {
        birth,
        age: birth ? ageOf(birth) : null,
        month: birth ? birth.getMonth() : -1,
        day: birth ? birth.getDate() : 0,
        search: normalize([
          s.name, s.cedula, s.repName, s.repCedula, s.address, s.phone, phoneDigits(s.phone),
          s.birthPlace, s.notes, s.year + ' año', String(s.year), s.section,
          s.sex === 'M' ? 'masculino' : s.sex === 'F' ? 'femenino' : ''
        ].join(' '))
      });
    });
  }
  function studentsByName() {
    return students.slice().sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }
  function computeStats() {
    const total = students.length;
    const male = students.filter((s) => s.sex === 'M').length;
    const female = students.filter((s) => s.sex === 'F').length;
    const ages = students.map((s) => s.age).filter((n) => n != null);
    const avg = ages.length ? ages.reduce((a, b) => a + b, 0) / ages.length : 0;
    const activeYears = Array.from(new Set(students.map((s) => s.year))).sort((a, b) => a - b);
    const activeSections = new Set(students.filter((s) => s.section).map((s) => `${s.year}|${s.section}`)).size;
    const configuredSections = [1, 2, 3, 4, 5].reduce((sum, y) => sum + ((db.sections[y] || []).length), 0);
    const unassigned = students.filter((s) => !s.section).length;
    const reps = new Set(students.map((s) => normalize(s.repName)).filter(Boolean)).size;
    const complete = students.filter((s) => s.phone && s.address && s.repName).length;
    const missing = {
      phone: students.filter((s) => !s.phone).length,
      address: students.filter((s) => !s.address).length,
      rep: students.filter((s) => !s.repName).length,
      cedula: students.filter((s) => !s.cedula).length
    };
    const placesMap = new Map();
    students.forEach((s) => {
      if (s.birthPlace) placesMap.set(s.birthPlace, (placesMap.get(s.birthPlace) || 0) + 1);
    });
    const places = Array.from(placesMap.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'));
    const years = [1, 2, 3, 4, 5].map((y) => {
      const list = students.filter((s) => s.year === y);
      return {
        year: y,
        total: list.length,
        m: list.filter((s) => s.sex === 'M').length,
        f: list.filter((s) => s.sex === 'F').length
      };
    });
    const recent = students.slice().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 5);
    return { total, male, female, avg, min: ages.length ? Math.min.apply(null, ages) : 0, max: ages.length ? Math.max.apply(null, ages) : 0, activeYears, activeSections, configuredSections, unassigned, reps, complete, missing, places, years, recent };
  }
  function initialTotals() {
    const per = {};
    let m = 0, f = 0;
    [1, 2, 3, 4, 5].forEach((y) => {
      const item = db.initial[y] || { m: 0, f: 0 };
      const im = parseInt(item.m, 10) || 0;
      const ff = parseInt(item.f, 10) || 0;
      per[y] = { m: im, f: ff, total: im + ff };
      m += im; f += ff;
    });
    return { m, f, total: m + f, per };
  }
  function currentTotals() {
    const st = state.stats || computeStats();
    const per = {};
    let m = 0, f = 0;
    st.years.forEach((y) => {
      per[y.year] = { m: y.m, f: y.f, total: y.total };
      m += y.m; f += y.f;
    });
    return { m, f, total: m + f, per };
  }

  /* ── tema y marca ────────────────────────────────────── */
  function applyTheme(theme, persistKey) {
    const t = THEMES.includes(theme) ? theme : 'dark';
    document.documentElement.dataset.theme = t;
    document.documentElement.style.colorScheme = t === 'light' ? 'light' : 'dark';
    if (persistKey !== false) {
      try { localStorage.setItem(THEME_KEY, t); } catch (e) { /* sin storage */ }
    }
    const labels = { light: 'Claro', dark: 'Oscuro', black: 'Negro' };
    const btn = $('#themeToggle');
    if (btn) {
      const next = t === 'light' ? 'Oscuro' : t === 'dark' ? 'Negro' : 'Claro';
      btn.title = `Tema ${labels[t]} · cambiar a ${next}`;
      btn.setAttribute('aria-label', `Tema ${labels[t]}. Cambiar a ${next}`);
    }
    $$('.theme-choice').forEach((el) => el.classList.toggle('is-active', el.dataset.themeChoice === t));
  }
  function setTheme(theme) {
    if (!THEMES.includes(theme)) return;
    db.settings.theme = theme;
    applyTheme(theme);
    saveDB();
    flashSaved('settings');
  }
  function shortInstitution(name) {
    return String(name || DEFAULT_SETTINGS.institution).replace(/^(U\.?\s*E\.?|Unidad\s+Educativa)\s*/i, '').trim() || String(name || '');
  }
  function applyBranding() {
    const inst = db.settings.institution || DEFAULT_SETTINGS.institution;
    const loc = db.settings.location || DEFAULT_SETTINGS.location;
    const short = shortInstitution(inst);
    [$('#brandName'), $('#topbarName')].forEach((el) => { if (el) el.textContent = short; });
    if ($('#brandSub')) $('#brandSub').textContent = loc;
    if ($('#heroInstitution')) $('#heroInstitution').textContent = inst;
    if ($('#heroLocation')) $('#heroLocation').textContent = loc;
    if ($('#clockInstitution')) $('#clockInstitution').textContent = inst;
    if ($('#printSchool')) $('#printSchool').textContent = inst;
    if ($('#instPreviewName')) $('#instPreviewName').textContent = inst;
    if ($('#instPreviewSub')) $('#instPreviewSub').textContent = loc;
    if ($('#aboutName')) $('#aboutName').textContent = inst;
    if ($('#aboutMeta')) $('#aboutMeta').textContent = `${loc} · Fundado 1992`;
    document.title = `${inst} · Gestión estudiantil`;
  }
  function updateNav() {
    const el = $('#navCount');
    if (el) el.textContent = students.length;
  }
  function updateSaveLabels() {
    const side = $('#sideSaved');
    if (side) side.textContent = storageOK ? 'Guardado hace un momento' : 'Sin almacenamiento';
    const pill = $('#lastSavedPill');
    if (pill) pill.textContent = db.updatedAt ? formatDateTime(db.updatedAt) : 'Sin cambios';
  }
  function markSaving() {
    const dot = $('#saveDot');
    if (dot) dot.classList.add('is-saving');
    const side = $('#sideSaved');
    if (side) side.textContent = 'Guardando…';
  }
  function flashSaved(which) {
    const dot = $('#saveDot');
    if (dot) dot.classList.remove('is-saving');
    updateSaveLabels();
    if (which === 'mat' || which === 'all') {
      const f = $('#matSaved');
      if (f) { f.classList.add('show'); clearTimeout(noteSavedTimer); noteSavedTimer = setTimeout(() => f.classList.remove('show'), 1600); }
    }
    if (which === 'settings' || which === 'all') {
      const f = $('#settingsSaved');
      if (f) { f.classList.add('show'); setTimeout(() => f.classList.remove('show'), 1600); }
    }
  }
  function scheduleSave(which) {
    markSaving();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveDB();
      flashSaved(which || 'all');
    }, 420);
  }

  /* ── reloj ───────────────────────────────────────────── */
  const dateFmt = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const dayFmt = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' });
  const timeFmt = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  function updateClock() {
    const now = new Date();
    const year = db.settings.schoolYear || DEFAULT_SETTINGS.schoolYear;
    const longDate = cap(dateFmt.format(now));
    const dayDate = cap(dayFmt.format(now));
    const h = now.getHours();
    const greet = h >= 5 && h < 12 ? 'Buenos días' : h >= 12 && h < 19 ? 'Buenas tardes' : 'Buenas noches';
    if ($('#dashClock')) $('#dashClock').textContent = timeFmt.format(now);
    if ($('#dashWeekday')) $('#dashWeekday').textContent = dayDate;
    if ($('#dashDate')) $('#dashDate').textContent = `${longDate} · Año escolar ${year}`;
    if ($('#printDate')) $('#printDate').textContent = longDate;
    if ($('#greeting')) $('#greeting').textContent = greet;
  }

  /* ── gráficos del panel ──────────────────────────────── */
  function animateNumber(el, target, decimals) {
    if (!el) return;
    const t0 = performance.now();
    const dur = 900;
    const dec = decimals || 0;
    function step(t) {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = (target * eased).toFixed(dec);
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = target.toFixed(dec);
    }
    requestAnimationFrame(step);
  }

  function renderDashboard() {
    const st = computeStats();
    state.stats = st;
    const has = st.total > 0;
    const empty = $('#dashEmpty');
    const data = $('#dashData');
    if (empty) empty.hidden = has;
    if (data) data.hidden = !has;
    if ($('#dashHeadline')) $('#dashHeadline').textContent = has ? 'todo el liceo, en un solo lugar.' : 'empecemos por la matrícula.';
    if (!has) return;

    const pct = Math.round(st.complete / st.total * 100);
    const set = (sel, value) => { const el = $(sel); if (el) el.textContent = value; };
    set('#kpiTotal', st.total);
    set('#kpiTotalMeta', `${st.male} masculinos · ${st.female} femeninas`);
    set('#kpiSections', st.activeSections);
    set('#kpiSectionsOf', `de ${st.configuredSections}`);
    set('#kpiSectionsMeta', `${st.activeYears.length} de 5 años${st.unassigned ? ` · ${st.unassigned} sin sección` : ''}`);
    set('#kpiReps', st.reps);
    set('#kpiRepsMeta', `${st.total} estudiantes vinculados`);
    set('#kpiComplete', st.complete);
    set('#kpiCompleteOf', `de ${st.total}`);
    set('#kpiCompleteMeta', `${pct}% del total`);
    ['#kpiTotal', '#kpiSections', '#kpiReps', '#kpiComplete'].forEach((sel) => {
      const el = $(sel);
      if (el) el.dataset.count = el.textContent;
    });
    const ring = $('#completeRing');
    if (ring) {
      const C = 2 * Math.PI * 16;
      ring.style.strokeDasharray = C.toFixed(2);
      ring.style.strokeDashoffset = C.toFixed(2);
      setTimeout(() => { ring.style.strokeDashoffset = (C * (1 - st.complete / st.total)).toFixed(2); }, 250);
    }
    set('#yearsPill', `${st.total} estudiante${st.total === 1 ? '' : 's'}`);
    set('#sexSub', `${st.male} masculinos · ${st.female} femeninas`);
    renderYearChart(st);
    renderSexDonut(st);
    renderPlaces(st);
    renderHealth(st);
    renderRecent(st);
  }

  function renderYearChart(st) {
    const host = $('#yearChart');
    if (!host) return;
    const max = Math.max.apply(null, st.years.map((y) => y.total)) || 1;
    host.innerHTML = st.years.map((y) => {
      const h = y.total ? (y.total / max * 84 + 8) : 0;
      return `<div class="bar-col">
        <div class="bar-track">
          <div class="bar-fill" style="--c:${YEAR_COLORS[y.year]}" data-h="${h.toFixed(1)}"><span class="bar-value">${y.total}</span></div>
        </div>
        <span class="bar-label">${y.year}°</span>
      </div>`;
    }).join('');
  }

  function renderSexDonut(st) {
    const host = $('#sexDonut');
    if (!host) return;
    const total = st.total || 1;
    const C = 2 * Math.PI * 62;
    const maleShare = st.male / total;
    const mDash = Math.max(0, maleShare * C - 5);
    const fDash = Math.max(0, (1 - maleShare) * C - 5);
    host.innerHTML = `
      <circle class="donut-track" cx="80" cy="80" r="62"></circle>
      <circle class="donut-seg" cx="80" cy="80" r="62" stroke="${SEX_COLORS.m}" data-dash="${mDash.toFixed(2)} ${(C - mDash).toFixed(2)}" style="stroke-dasharray:0 ${C}"></circle>
      <circle class="donut-seg" cx="80" cy="80" r="62" stroke="${SEX_COLORS.f}" data-dash="${fDash.toFixed(2)} ${(C - fDash).toFixed(2)}" stroke-dashoffset="${(-maleShare * C).toFixed(2)}" style="stroke-dasharray:0 ${C}"></circle>`;
    const totalEl = $('#donutTotal');
    if (totalEl) totalEl.textContent = st.total;
    const legend = $('#sexLegend');
    if (legend) {
      legend.innerHTML = `
        <div class="legend-row"><span class="legend-dot" style="--c:${SEX_COLORS.m}"></span><span class="legend-name">Masculino</span><span class="legend-val">${st.male}</span><span class="legend-pct">${Math.round(maleShare * 100)}% del total</span></div>
        <div class="legend-row"><span class="legend-dot" style="--c:${SEX_COLORS.f}"></span><span class="legend-name">Femenino</span><span class="legend-val">${st.female}</span><span class="legend-pct">${100 - Math.round(maleShare * 100)}% del total</span></div>`;
    }
  }

  function renderPlaces(st) {
    const host = $('#placeList');
    if (!host) return;
    if (!st.places.length) {
      host.innerHTML = '<li class="health-empty">Aún no hay lugares de nacimiento registrados.</li>';
      if ($('#placesPill')) $('#placesPill').textContent = '0';
      return;
    }
    const max = st.places[0][1] || 1;
    host.innerHTML = st.places.slice(0, 5).map(([place, count]) => `
      <li class="place-row">
        <span class="place-name" title="${esc(place)}">${esc(place)}</span>
        <span class="place-count">${count}</span>
        <span class="place-track"><i class="place-fill" data-w="${(count / max * 100).toFixed(1)}"></i></span>
      </li>`).join('');
    if ($('#placesPill')) $('#placesPill').textContent = `${st.places.length} ${st.places.length === 1 ? 'lugar' : 'lugares'}`;
  }

  function renderHealth(st) {
    const pct = Math.round(st.complete / st.total * 100);
    const pill = $('#healthPill');
    if (pill) pill.textContent = pct + '%';
    const fill = $('#healthFill');
    if (fill) fill.dataset.w = pct;
    const host = $('#healthList');
    if (!host) return;
    const rows = [
      { label: 'Fichas completas', count: st.complete, color: 'var(--green)', key: null },
      { label: 'Sin teléfono', count: st.missing.phone, color: 'var(--amber)', key: 'phone' },
      { label: 'Sin dirección', count: st.missing.address, color: 'var(--amber)', key: 'address' },
      { label: 'Sin representante', count: st.missing.rep, color: 'var(--red)', key: 'rep' },
      { label: 'Sin cédula', count: st.missing.cedula, color: 'var(--muted-2)', key: 'cedula' }
    ];
    host.innerHTML = rows.map((r) => {
      const content = `<span class="health-label"><i style="--c:${r.color}"></i>${r.label}</span><span class="health-count">${r.count}</span>`;
      return r.key
        ? `<li><button class="health-row" data-att="${r.key}">${content}</button></li>`
        : `<li><div class="health-row">${content}</div></li>`;
    }).join('');
  }

  function renderRecent(st) {
    const host = $('#recentList');
    if (!host) return;
    if (!st.recent.length) {
      host.innerHTML = '<li class="recent-empty">Sin actividad registrada.</li>';
      return;
    }
    host.innerHTML = st.recent.map((s) => {
      const isEdit = new Date(s.updatedAt) - new Date(s.createdAt) > 1500;
      return `<li><button class="recent-item" data-recent="${s.id}">
        <span class="recent-av" style="--c:${YEAR_COLORS[s.year]}">${esc(initials(s.name))}</span>
        <span class="recent-copy"><span class="recent-name">${esc(s.name)}</span><span class="recent-meta">${isEdit ? 'Actualizado' : 'Añadido'} · ${s.year}°${s.section ? ' ' + esc(s.section) : ''}</span></span>
        <span class="recent-time">${timeAgo(s.updatedAt)}</span>
      </button></li>`;
    }).join('');
  }

  function animateDashboard() {
    if (state.view !== 'resumen') return;
    const data = $('#dashData');
    if (!data || data.hidden) return;
    const st = state.stats || computeStats();
    animateNumber($('#kpiTotal'), st.total, 0);
    animateNumber($('#kpiSections'), st.activeSections, 0);
    animateNumber($('#kpiReps'), st.reps, 0);
    animateNumber($('#kpiComplete'), st.complete, 0);

    $$('#yearChart .bar-fill').forEach((el, i) => {
      el.style.height = '0%';
      const col = el.closest('.bar-col');
      if (col) col.classList.remove('show');
      setTimeout(() => {
        el.style.height = (el.dataset.h || 0) + '%';
        setTimeout(() => { if (col) col.classList.add('show'); }, 350);
      }, 80 + i * 55);
    });

    const C = 2 * Math.PI * 62;
    $$('#sexDonut .donut-seg').forEach((seg) => {
      const target = seg.dataset.dash || `0 ${C}`;
      seg.style.transition = 'none';
      seg.style.strokeDasharray = `0 ${C}`;
      void seg.getBoundingClientRect();
      seg.style.transition = '';
      setTimeout(() => { seg.style.strokeDasharray = target; }, 100);
    });

    $$('#placeList .place-fill').forEach((el, i) => {
      el.style.width = '0%';
      setTimeout(() => { el.style.width = (el.dataset.w || 0) + '%'; }, 100 + i * 80);
    });

    const fill = $('#healthFill');
    if (fill) {
      fill.style.width = '0%';
      setTimeout(() => { fill.style.width = (fill.dataset.w || 0) + '%'; }, 200);
    }

    const ring = $('#completeRing');
    if (ring) {
      const c = 2 * Math.PI * 16;
      ring.style.strokeDashoffset = c.toFixed(2);
      setTimeout(() => { ring.style.strokeDashoffset = (c * (1 - st.complete / st.total)).toFixed(2); }, 250);
    }
  }

  /* ── directorio ──────────────────────────────────────── */
  function filteredStudents() {
    const q = normalize(state.query).trim();
    const tokens = q ? q.split(/\s+/) : [];
    let list = students.filter((s) => {
      if (state.year !== 'all' && s.year !== Number(state.year)) return false;
      if (state.section !== 'all') {
        const parts = state.section.split('|');
        if (s.year !== Number(parts[0]) || s.section !== parts[1]) return false;
      }
      if (state.sex !== 'all' && s.sex !== state.sex) return false;
      if (state.attention === 'phone' && s.phone) return false;
      if (state.attention === 'address' && s.address) return false;
      if (state.attention === 'rep' && s.repName) return false;
      if (state.attention === 'cedula' && s.cedula) return false;
      if (tokens.length && !tokens.every((t) => s.search.includes(t))) return false;
      return true;
    });

    const byName = (a, b) => a.name.localeCompare(b.name, 'es');
    const dir = state.dir;
    if (state.sort === 'name') list.sort((a, b) => byName(a, b) * dir);
    else if (state.sort === 'year') list.sort((a, b) => (a.year - b.year) * dir || byName(a, b));
    else if (state.sort === 'age') list.sort((a, b) => ((a.age == null ? 99 : a.age) - (b.age == null ? 99 : b.age)) * dir || byName(a, b));
    else if (state.sort === 'recent') list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    return list;
  }

  function pageNumbers(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const set = new Set([1, total, current, current - 1, current + 1]);
    if (current <= 4) [2, 3, 4, 5].forEach((x) => set.add(x));
    if (current >= total - 3) [total - 1, total - 2, total - 3, total - 4].forEach((x) => set.add(x));
    const arr = Array.from(set).filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
    const out = [];
    arr.forEach((n, i) => {
      if (i && n - arr[i - 1] > 1) out.push('…');
      out.push(n);
    });
    return out;
  }

  function rowHTML(s, i) {
    const color = YEAR_COLORS[s.year];
    const sectionLabel = s.section ? ` ${esc(s.section)}` : '';
    return `<tr tabindex="0" data-id="${s.id}" style="--i:${i || 0}" aria-label="Ver ficha de ${esc(s.name)}">
      <td><div class="student-cell">
        <span class="avatar" style="--c:${color}" aria-hidden="true">${esc(initials(s.name))}</span>
        <div style="min-width:0">
          <div class="student-name"><strong>${esc(s.name)}</strong></div>
          <div class="student-meta"><span class="mono">${esc(formatCedula(s.cedula))}</span>${s.birthPlace ? `<span>·</span><span>${esc(s.birthPlace)}</span>` : ''}</div>
        </div>
      </div></td>
      <td class="col-year"><span class="badge-year" style="--c:${color}">${s.year}°${sectionLabel}</span></td>
      <td class="col-age age-cell">${s.age == null ? '—' : s.age}</td>
      <td class="col-sex"><span class="sex-pill ${s.sex === 'M' ? 'm' : 'f'}">${s.sex === 'M' ? 'Masculino' : s.sex === 'F' ? 'Femenino' : '—'}</span></td>
      <td class="col-rep"><div class="rep-cell"><span>${s.repName ? esc(s.repName) : '—'}</span>${s.repCedula ? `<small>${esc(formatCedula(s.repCedula))}</small>` : ''}</div></td>
      <td class="col-phone">${s.phone ? `<span class="phone-cell">${esc(s.phone)}</span>` : '<span class="phone-cell missing">Sin teléfono</span>'}</td>
      <td class="col-actions"><div class="row-actions">
        <button class="row-btn" data-edit="${s.id}" aria-label="Editar a ${esc(s.name)}" title="Editar"><svg class="icon"><use href="#i-edit"/></svg></button>
        <button class="row-btn is-delete" data-delete="${s.id}" aria-label="Eliminar a ${esc(s.name)}" title="Eliminar"><svg class="icon"><use href="#i-trash"/></svg></button>
      </div></td>
    </tr>`;
  }

  function renderStudents() {
    let list = filteredStudents();
    if (state.printing && state.printMode === 'all') list = studentsByName();
    state.currentList = list;
    const perPage = state.printing ? 9999 : state.perPage;
    const pages = Math.max(1, Math.ceil(list.length / perPage));
    if (state.page > pages) state.page = pages;
    if (state.page < 1) state.page = 1;
    const start = (state.page - 1) * perPage;
    const pageItems = list.slice(start, start + perPage);

    const body = $('#studentsBody');
    if (body) body.innerHTML = pageItems.map((s, i) => rowHTML(s, i)).join('');

    const empty = $('#emptyState');
    const wrap = $('#tableWrap');
    const foot = $('#tableFoot');
    const noStudents = students.length === 0;
    const none = list.length === 0;
    const showEmpty = none;

    if (empty) {
      empty.hidden = !showEmpty;
      if (showEmpty) {
        const title = $('#emptyTitle');
        const text = $('#emptyText');
        const action = $('#emptyAction');
        if (noStudents) {
          state.emptyMode = 'add';
          if (title) title.textContent = 'Aún no hay estudiantes';
          if (text) text.textContent = 'Registra al primer estudiante para comenzar a construir el directorio.';
          if (action) action.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-plus"/></svg> Añadir estudiante';
        } else {
          state.emptyMode = 'clear';
          if (title) title.textContent = 'Sin resultados';
          if (text) text.textContent = 'Prueba con otro nombre, cédula o quita los filtros activos.';
          if (action) action.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-refresh"/></svg> Limpiar filtros';
        }
      }
    }
    if (wrap) wrap.style.display = showEmpty ? 'none' : '';
    if (foot) foot.style.display = showEmpty ? 'none' : '';

    if ($('#resultsInfo')) {
      if (noStudents) {
        $('#resultsInfo').innerHTML = '<strong>0</strong> estudiantes registrados';
      } else if (none) {
        $('#resultsInfo').innerHTML = 'Sin coincidencias de <strong>' + students.length + '</strong> estudiantes';
      } else if (list.length === students.length) {
        $('#resultsInfo').innerHTML = `Mostrando <strong>${start + 1}–${Math.min(start + pageItems.length, list.length)}</strong> de <strong>${students.length}</strong> estudiantes`;
      } else {
        $('#resultsInfo').innerHTML = `<strong>${list.length}</strong> resultado${list.length === 1 ? '' : 's'} de <strong>${students.length}</strong> estudiantes`;
      }
    }

    const pager = $('#pager');
    if (pager) {
      if (!showEmpty && list.length > perPage) {
        const nums = pageNumbers(state.page, pages);
        pager.innerHTML = `
          <button class="page-btn" data-page="prev" ${state.page === 1 ? 'disabled' : ''} aria-label="Página anterior"><svg class="icon" style="width:14px;height:14px"><use href="#i-chevron-left"/></svg></button>
          ${nums.map((n) => n === '…' ? '<span class="page-dots">…</span>' : `<button class="page-btn ${n === state.page ? 'is-active' : ''}" data-page="${n}" aria-label="Página ${n}">${n}</button>`).join('')}
          <button class="page-btn" data-page="next" ${state.page === pages ? 'disabled' : ''} aria-label="Página siguiente"><svg class="icon" style="width:14px;height:14px"><use href="#i-chevron-right"/></svg></button>`;
      } else {
        pager.innerHTML = '';
      }
    }

    $$('.sort-btn').forEach((btn) => {
      const active = btn.dataset.sort === state.sort;
      btn.classList.toggle('is-sorted', active);
      const arrow = btn.querySelector('.sort-arrow');
      if (arrow) arrow.textContent = active ? (state.dir > 0 ? '↑' : '↓') : '';
    });
    if ($('#sortSelect')) $('#sortSelect').value = state.sort;
    if ($('#searchClear')) $('#searchClear').hidden = !state.query;
    if ($('#studentsSubtitle')) {
      const n = students.length;
      const secs = state.stats ? state.stats.activeSections : 0;
      $('#studentsSubtitle').textContent = `${n} estudiante${n === 1 ? '' : 's'} registrado${n === 1 ? '' : 's'} · ${secs} ${secs === 1 ? 'sección' : 'secciones'}`;
    }
    updateActiveFilters();
  }

  function updateActiveFilters() {
    const host = $('#activeFilters');
    if (!host) return;
    const chips = [];
    if (state.query) chips.push({ clear: 'query', label: `“${state.query}”` });
    if (state.year !== 'all') chips.push({ clear: 'year', label: `${state.year}° año` });
    if (state.section !== 'all') {
      const parts = state.section.split('|');
      chips.push({ clear: 'section', label: `${parts[0]}° ${parts[1]}` });
    }
    if (state.sex !== 'all') chips.push({ clear: 'sex', label: state.sex === 'M' ? 'Masculino' : 'Femenino' });
    if (state.attention) chips.push({ clear: 'attention', label: ATT_LABEL[state.attention] });
    if (!chips.length) { host.innerHTML = ''; return; }
    host.innerHTML = chips.map((c) => `<span class="filter-chip"><span>${esc(c.label)}</span><button data-clear="${c.clear}" aria-label="Quitar filtro ${esc(c.label)}"><svg class="icon"><use href="#i-x"/></svg></button></span>`).join('')
      + '<button class="clear-all" data-clear="all">Limpiar todo</button>';
  }

  function renderSectionOptions() {
    const select = $('#sectionFilter');
    if (!select) return;
    const years = state.year === 'all' ? [1, 2, 3, 4, 5] : [Number(state.year)];
    const options = ['<option value="all">Todas las secciones</option>'];
    let count = 0;
    years.forEach((year) => {
      (db.sections[year] || []).forEach((section) => {
        options.push(`<option value="${year}|${esc(section)}">${year}° ${esc(section)}</option>`);
        count++;
      });
    });
    select.innerHTML = options.join('');
    if (state.section !== 'all' && !Array.from(select.options).some((o) => o.value === state.section)) state.section = 'all';
    select.value = state.section;
    select.disabled = count === 0;
  }

  function syncFilterUI() {
    $$('#yearFilter .chip').forEach((b) => b.classList.toggle('is-active', String(state.year) === b.dataset.year));
    $$('#sexFilter button').forEach((b) => b.classList.toggle('is-active', state.sex === b.dataset.sex));
    if ($('#sortSelect')) $('#sortSelect').value = state.sort;
    renderSectionOptions();
  }
  function resetFiltersState() {
    state.query = '';
    state.year = 'all';
    state.section = 'all';
    state.sex = 'all';
    state.attention = null;
    state.page = 1;
    if ($('#globalSearch')) $('#globalSearch').value = '';
    if ($('#studentSearch')) $('#studentSearch').value = '';
    syncFilterUI();
  }
  function setQuery(value) {
    state.query = value;
    state.page = 1;
    if ($('#globalSearch') && $('#globalSearch').value !== value) $('#globalSearch').value = value;
    if ($('#studentSearch') && $('#studentSearch').value !== value) $('#studentSearch').value = value;
    if (state.view !== 'estudiantes') setView('estudiantes');
    renderStudents();
  }

  /* ── matrícula ───────────────────────────────────────── */
  function variationHTML(diff, hasInitial) {
    if (!hasInitial) return '<span class="mat-variation flat">—</span>';
    const cls = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat';
    return `<span class="mat-variation ${cls}">${diff > 0 ? '+' : ''}${diff}</span>`;
  }

  function renderMatricula() {
    const ini = initialTotals();
    const st = state.stats || computeStats();
    const cur = currentTotals();
    const hasIni = ini.total > 0;
    const delta = cur.total - ini.total;

    const set = (sel, value) => { const el = $(sel); if (el) el.textContent = value; };
    set('#matInitial', ini.total);
    set('#matCurrent', cur.total);
    set('#matM', cur.m);
    set('#matF', cur.f);
    if ($('#matInitialSex')) $('#matInitialSex').innerHTML = `<span>M <b>${ini.m}</b></span><span>F <b>${ini.f}</b></span>`;
    if ($('#matCurrentSex')) $('#matCurrentSex').innerHTML = `<span>M <b>${cur.m}</b></span><span>F <b>${cur.f}</b></span>`;
    if ($('#matDelta')) {
      const d = $('#matDelta');
      d.textContent = hasIni ? (delta > 0 ? '+' : '') + delta : '—';
      d.classList.toggle('neg', hasIni && delta < 0);
      d.classList.toggle('flat', !hasIni || delta === 0);
    }
    if ($('#matStacked')) {
      const pm = cur.total ? cur.m / cur.total * 100 : 0;
      const pf = cur.total ? 100 - pm : 0;
      $('#matStacked').innerHTML = `<span class="seg-m" style="width:${pm.toFixed(1)}%"></span><span class="seg-f" style="width:${pf.toFixed(1)}%"></span>`;
    }

    const rows = [1, 2, 3, 4, 5].map((y) => {
      const iv = ini.per[y];
      const cv = cur.per[y];
      const diff = cv.total - iv.total;
      return `<tr>
        <td>${y}° año</td>
        <td class="num"><input class="mat-input" type="number" min="0" max="999" inputmode="numeric" data-year="${y}" data-sex="m" value="${iv.m}" aria-label="Matrícula inicial masculina de ${y}° año"></td>
        <td class="num"><input class="mat-input" type="number" min="0" max="999" inputmode="numeric" data-year="${y}" data-sex="f" value="${iv.f}" aria-label="Matrícula inicial femenina de ${y}° año"></td>
        <td class="num mat-total" data-ini-total="${y}">${iv.total}</td>
        <td class="num">${cv.m}</td>
        <td class="num">${cv.f}</td>
        <td class="num mat-total">${cv.total}</td>
        <td class="num" data-var="${y}">${variationHTML(diff, iv.total > 0)}</td>
      </tr>`;
    }).join('');
    if ($('#matBody')) $('#matBody').innerHTML = rows;

    if ($('#matFoot')) {
      const diff = cur.total - ini.total;
      $('#matFoot').innerHTML = `<tr>
        <td>Total</td>
        <td class="num">${ini.m}</td>
        <td class="num">${ini.f}</td>
        <td class="num">${ini.total}</td>
        <td class="num">${cur.m}</td>
        <td class="num">${cur.f}</td>
        <td class="num">${cur.total}</td>
        <td class="num">${variationHTML(diff, hasIni)}</td>
      </tr>`;
    }
    state.stats = st;
  }

  function updateMatNumbers() {
    const ini = initialTotals();
    const cur = currentTotals();
    const hasIni = ini.total > 0;
    const delta = cur.total - ini.total;
    const set = (sel, value) => { const el = $(sel); if (el) el.textContent = value; };
    set('#matInitial', ini.total);
    set('#matCurrent', cur.total);
    set('#matM', cur.m);
    set('#matF', cur.f);
    if ($('#matInitialSex')) $('#matInitialSex').innerHTML = `<span>M <b>${ini.m}</b></span><span>F <b>${ini.f}</b></span>`;
    if ($('#matCurrentSex')) $('#matCurrentSex').innerHTML = `<span>M <b>${cur.m}</b></span><span>F <b>${cur.f}</b></span>`;
    if ($('#matDelta')) {
      const d = $('#matDelta');
      d.textContent = hasIni ? (delta > 0 ? '+' : '') + delta : '—';
      d.classList.toggle('neg', hasIni && delta < 0);
      d.classList.toggle('flat', !hasIni || delta === 0);
    }
    if ($('#matStacked')) {
      const pm = cur.total ? cur.m / cur.total * 100 : 0;
      const pf = cur.total ? 100 - pm : 0;
      $('#matStacked').innerHTML = `<span class="seg-m" style="width:${pm.toFixed(1)}%"></span><span class="seg-f" style="width:${pf.toFixed(1)}%"></span>`;
    }
    [1, 2, 3, 4, 5].forEach((y) => {
      const iv = ini.per[y];
      const cv = cur.per[y];
      const totalEl = document.querySelector(`[data-ini-total="${y}"]`);
      if (totalEl) totalEl.textContent = iv.total;
      const varEl = document.querySelector(`[data-var="${y}"]`);
      if (varEl) varEl.innerHTML = variationHTML(cv.total - iv.total, iv.total > 0);
    });
    if ($('#matFoot')) {
      const diff = cur.total - ini.total;
      $('#matFoot').innerHTML = `<tr>
        <td>Total</td>
        <td class="num">${ini.m}</td>
        <td class="num">${ini.f}</td>
        <td class="num">${ini.total}</td>
        <td class="num">${cur.m}</td>
        <td class="num">${cur.f}</td>
        <td class="num">${cur.total}</td>
        <td class="num">${variationHTML(diff, hasIni)}</td>
      </tr>`;
    }
  }

  function onInitialInput(input) {
    const year = Number(input.dataset.year);
    const sex = input.dataset.sex;
    if (!(year >= 1 && year <= 5) || (sex !== 'm' && sex !== 'f')) return;
    let raw = input.value.replace(/[^\d]/g, '').slice(0, 3);
    if (raw !== input.value) input.value = raw;
    const val = raw === '' ? 0 : Math.max(0, Math.min(999, parseInt(raw, 10) || 0));
    db.initial[year][sex] = val;
    updateMatNumbers();
    scheduleSave('mat');
  }

  /* ── configuración ───────────────────────────────────── */
  /* ── secciones ───────────────────────────────────────── */
  function renderSections() {
    const host = $('#sectionEditor');
    if (!host) return;
    let total = 0;
    host.innerHTML = [1, 2, 3, 4, 5].map((year) => {
      const list = db.sections[year] || [];
      total += list.length;
      const chips = list.length
        ? list.map((section) => `<span class="section-chip">${esc(section)}<button type="button" data-del-year="${year}" data-del-name="${esc(section)}" aria-label="Eliminar sección ${year}° ${esc(section)}" title="Eliminar sección">×</button></span>`).join('')
        : '<span class="ys-empty">Sin secciones</span>';
      return `<div class="year-sections">
        <div class="ys-head"><span class="badge-year" style="--c:${YEAR_COLORS[year]}">${year}° año</span><small>${list.length} secc.</small></div>
        <div class="ys-chips">${chips}</div>
        <div class="ys-add">
          <input data-new-section="${year}" id="newSection${year}" maxlength="5" placeholder="A" autocomplete="off" aria-label="Nueva sección para ${year}° año">
          <button type="button" data-add-section="${year}">+ Añadir</button>
        </div>
      </div>`;
    }).join('');
    if ($('#sectionsPill')) $('#sectionsPill').textContent = `${total} ${total === 1 ? 'sección' : 'secciones'}`;
  }

  function addSection(year, name) {
    const value = cleanSection(name);
    if (!value) { toast('Escribe un nombre de sección (A, B, C…)', 'error'); return; }
    if (!db.sections[year]) db.sections[year] = [];
    if (db.sections[year].includes(value)) { toast(`La sección ${year}° ${value} ya existe`, 'error'); return; }
    db.sections[year].push(value);
    db.sections[year].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
    saveDB();
    renderAll();
    flashSaved('settings');
    toast(`Sección ${year}° ${value} añadida`);
  }

  function deleteSection(year, name) {
    const affected = db.students.filter((s) => s.year === year && s.section === name);
    const remove = () => {
      db.sections[year] = (db.sections[year] || []).filter((s) => s !== name);
      affected.forEach((s) => { s.section = ''; s.updatedAt = nowISO(); });
      saveDB();
      renderAll();
      flashSaved('settings');
      toast(`Sección ${year}° ${name} eliminada`);
    };
    if (affected.length) {
      askConfirm({
        title: `Eliminar ${year}° ${name}`,
        message: `Hay ${affected.length} estudiante${affected.length === 1 ? '' : 's'} en esta sección. Si la eliminas, quedarán sin sección. ¿Continuar?`,
        ok: 'Eliminar sección',
        onConfirm: remove
      });
    } else {
      remove();
    }
  }

  function renderSettings() {
    const s = db.settings;
    if ($('#setName')) $('#setName').value = s.institution;
    if ($('#setLocation')) $('#setLocation').value = s.location;
    if ($('#setYear')) $('#setYear').value = s.schoolYear;
    if ($('#setPerPage')) $('#setPerPage').value = String(s.perPage);
    applyTheme(s.theme, false);
    if ($('#lastSavedPill')) $('#lastSavedPill').textContent = db.updatedAt ? formatDateTime(db.updatedAt) : 'Sin cambios';
    if ($('#appVersion')) $('#appVersion').textContent = 'Versión ' + APP_VERSION;
    applyBranding();
    renderSections();
  }

  function onInstitutionInput(input, key) {
    const value = input.value;
    if (key === 'institution' && !value.trim()) {
      applyBranding();
      scheduleSave('settings');
      return;
    }
    db.settings[key] = value;
    applyBranding();
    scheduleSave('settings');
  }
  function onInstitutionBlur(input, key) {
    let value = input.value.trim();
    if (!value) value = DEFAULT_SETTINGS[key];
    input.value = value;
    db.settings[key] = value;
    applyBranding();
    saveDB();
    flashSaved('settings');
  }

  /* ── ficha lateral ───────────────────────────────────── */
  let lastFocus = null;
  function drawerList() {
    if (state.activeId && state.currentList.some((s) => s.id === state.activeId)) return state.currentList;
    return studentsByName();
  }
  function openDrawer(id) {
    state.activeId = id;
    renderDrawer();
    lastFocus = document.activeElement;
    document.body.classList.add('drawer-open');
    syncLock();
    setTimeout(() => { const btn = $('#drawerClose'); if (btn) btn.focus(); }, 70);
  }
  function closeDrawer() {
    if (!document.body.classList.contains('drawer-open')) return;
    document.body.classList.remove('drawer-open');
    state.activeId = null;
    syncLock();
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
  }
  function syncLock() {
    const open = document.body.classList.contains('drawer-open') || !$('#studentModal').hidden || !$('#confirmModal').hidden;
    document.body.classList.toggle('modal-open', open);
  }
  function detailItem(label, value, cls) {
    return `<div class="detail-item ${cls === 'full' ? 'full' : ''}"><dt>${esc(label)}</dt><dd class="${cls === 'full' ? '' : cls || ''}">${value || '—'}</dd></div>`;
  }
  function renderDrawer() {
    const s = students.find((x) => x.id === state.activeId);
    if (!s) return;
    const color = YEAR_COLORS[s.year];
    const list = drawerList();
    const idx = list.findIndex((x) => x.id === s.id);
    const avatar = $('#drawerAvatar');
    if (avatar) {
      avatar.textContent = initials(s.name);
      avatar.style.setProperty('--c', color);
    }
    if ($('#drawerName')) $('#drawerName').textContent = s.name;
    if ($('#drawerChips')) $('#drawerChips').innerHTML = `
      <span class="badge-year" style="--c:${color}">${s.year}°${s.section ? ' ' + esc(s.section) : ''}</span>
      <span class="mini-pill">${s.sex === 'M' ? 'Masculino' : s.sex === 'F' ? 'Femenino' : 'Sin sexo'}</span>
      <span class="mini-pill">${s.age == null ? 'Edad sin dato' : s.age + ' años'}</span>`;
    if ($('#drawerIndex')) $('#drawerIndex').textContent = idx >= 0 ? `${idx + 1} de ${list.length}` : '—';
    if ($('#drawerPrev')) $('#drawerPrev').disabled = idx <= 0;
    if ($('#drawerNext')) $('#drawerNext').disabled = idx < 0 || idx >= list.length - 1;

    const missing = [];
    if (!s.phone) missing.push('teléfono');
    if (!s.address) missing.push('dirección');
    if (!s.repName) missing.push('representante');
    const missingHTML = missing.length
      ? `<div class="missing-note"><svg class="icon"><use href="#i-alert"/></svg><span>Ficha incompleta: falta ${missing.join(', ')}.</span></div>`
      : '';

    const wa = waNumber(s.phone);
    const tel = telNumber(s.phone);
    const contactHTML = s.phone
      ? `<div class="contact-box">
          <span class="contact-icon"><svg class="icon"><use href="#i-phone"/></svg></span>
          <div><small>Teléfono</small><strong>${esc(s.phone)}</strong></div>
          <div class="contact-actions">
            ${tel ? `<a class="mini-btn" href="tel:+${tel}" aria-label="Llamar" title="Llamar"><svg class="icon"><use href="#i-phone"/></svg></a>` : ''}
            <button class="mini-btn" data-copy="${esc(s.phone)}" aria-label="Copiar teléfono" title="Copiar"><svg class="icon"><use href="#i-copy"/></svg></button>
            ${wa ? `<a class="mini-btn wa" href="https://wa.me/${wa}" target="_blank" rel="noopener" aria-label="WhatsApp" title="WhatsApp"><svg class="icon"><use href="#i-wa"/></svg></a>` : ''}
          </div>
        </div>`
      : '<div class="contact-box"><span class="contact-icon"><svg class="icon"><use href="#i-alert"/></svg></span><div><small>Teléfono</small><strong style="color:var(--muted-2);font-weight:500">Sin teléfono registrado</strong></div></div>';
    const addressHTML = `<div class="contact-box">
      <span class="contact-icon"><svg class="icon"><use href="#i-grid"/></svg></span>
      <div><small>Dirección</small><strong style="font-weight:500;font-size:11px">${s.address ? esc(s.address) : 'Sin dirección registrada'}</strong></div>
    </div>`;

    if ($('#drawerContent')) $('#drawerContent').innerHTML = `
      ${missingHTML}
      <section class="detail-group"><h3>Datos personales</h3><dl class="detail-grid">
        ${detailItem('Cédula', esc(formatCedula(s.cedula)), 'mono')}
        ${detailItem('Edad', s.age == null ? '—' : s.age + ' años')}
        ${detailItem('Fecha de nacimiento', s.birth ? `${s.day} de ${MONTHS[s.month]} de ${s.birth.getFullYear()}` : '—')}
        ${detailItem('Lugar de nacimiento', s.birthPlace ? esc(s.birthPlace) : '—')}
        ${detailItem('Sexo', s.sex === 'M' ? 'Masculino' : s.sex === 'F' ? 'Femenino' : '—')}
        ${detailItem('Año', s.year + '° año')}
        ${detailItem('Sección', s.section ? esc(s.section) : 'Sin sección')}
      </dl></section>
      <section class="detail-group"><h3>Representante</h3><dl class="detail-grid">
        ${detailItem('Nombre', s.repName ? esc(s.repName) : '<span style="color:var(--muted-2);font-style:italic">Sin representante registrado</span>', 'full')}
        ${detailItem('Cédula', s.repCedula ? esc(formatCedula(s.repCedula)) : '—', 'mono')}
      </dl></section>
      <section class="detail-group"><h3>Contacto</h3>${contactHTML}${addressHTML}</section>
      <section class="detail-group"><h3>Observaciones</h3>
        <div class="notes-box">${s.notes ? esc(s.notes) : 'Sin observaciones.'}</div>
      </section>
      <section class="detail-group"><h3>Registro</h3><dl class="detail-grid">
        ${detailItem('Creado', formatDateTime(s.createdAt))}
        ${detailItem('Actualizado', formatDateTime(s.updatedAt))}
      </dl></section>`;

    const waBtn = $('#drawerWaBtn');
    if (waBtn) {
      if (wa) {
        waBtn.classList.remove('is-disabled');
        waBtn.href = `https://wa.me/${wa}`;
        waBtn.removeAttribute('aria-disabled');
      } else {
        waBtn.classList.add('is-disabled');
        waBtn.removeAttribute('href');
        waBtn.setAttribute('aria-disabled', 'true');
      }
    }
  }
  function stepDrawer(delta) {
    const list = drawerList();
    const idx = list.findIndex((x) => x.id === state.activeId);
    const next = list[idx + delta];
    if (!next) return;
    state.activeId = next.id;
    renderDrawer();
    const sc = $('#drawerContent');
    if (sc) sc.scrollTop = 0;
  }

  /* ── modales / formulario ────────────────────────────── */
  function updateSectionOptions(preferred) {
    const select = $('#fSection');
    if (!select) return;
    const year = Number($('#fYear') ? $('#fYear').value : 0);
    const list = (year >= 1 && year <= 5) ? (db.sections[year] || []) : [];
    select.innerHTML = '<option value="">Sin sección</option>' + list.map((section) => `<option value="${esc(section)}">${esc(section)}</option>`).join('');
    select.disabled = list.length === 0;
    let value;
    if (preferred === undefined || preferred === null) value = list[0] || '';
    else value = (preferred === '' || list.includes(preferred)) ? preferred : (list[0] || '');
    select.value = value;
    const hint = $('#sectionHint');
    if (hint) {
      hint.textContent = list.length
        ? `${list.length} ${list.length === 1 ? 'sección' : 'secciones'} disponible${list.length === 1 ? '' : 's'}`
        : 'Sin secciones: créalas en Configuración';
      hint.classList.toggle('is-warn', list.length === 0);
    }
  }

  function openForm(id) {
    const editing = id ? db.students.find((s) => s.id === id) : null;
    state.editingId = editing ? editing.id : null;
    if ($('#modalTitle')) $('#modalTitle').textContent = editing ? 'Editar estudiante' : 'Añadir estudiante';
    if ($('#deleteStudentBtn')) $('#deleteStudentBtn').hidden = !editing;
    if ($('#formError')) { $('#formError').hidden = true; $('#formError').textContent = ''; }
    $$('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));

    const v = editing || {};
    if ($('#fId')) $('#fId').value = editing ? editing.id : '';
    if ($('#fName')) $('#fName').value = v.name || '';
    if ($('#fYear')) $('#fYear').value = editing ? String(v.year) : (state.year !== 'all' ? String(state.year) : '');
    if ($('#fSex')) $('#fSex').value = v.sex || '';
    if ($('#fCedulaPrefix') && $('#fCedulaNumber')) {
      const match = /^([VE])-?\s*(.*)$/i.exec(v.cedula || '');
      const prefix = match ? match[1].toUpperCase() : 'V';
      const digits = (match ? match[2] : (v.cedula || '')).replace(/\D/g, '');
      $('#fCedulaPrefix').value = prefix;
      $('#fCedulaNumber').value = digits;
    }
    if ($('#fBirth')) $('#fBirth').value = v.birthDate || '';
    if ($('#fPlace')) $('#fPlace').value = v.birthPlace || '';
    if ($('#fRep')) $('#fRep').value = v.repName || '';
    if ($('#fRepCedula')) $('#fRepCedula').value = v.repCedula || '';
    if ($('#fPhone')) $('#fPhone').value = v.phone || '';
    if ($('#fAddress')) $('#fAddress').value = v.address || '';
    if ($('#fNotes')) $('#fNotes').value = v.notes || '';
    updateSectionOptions(editing ? (v.section || '') : null);
    updateAgeHint();
    if ($('#fBirth')) {
      const today = new Date();
      $('#fBirth').max = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    }

    $('#studentModal').hidden = false;
    syncLock();
    setTimeout(() => { if ($('#fName')) $('#fName').focus(); }, 80);
  }
  function closeForm() {
    $('#studentModal').hidden = true;
    state.editingId = null;
    syncLock();
  }
  function updateAgeHint() {
    const hint = $('#ageHint');
    if (!hint) return;
    const date = parseISO($('#fBirth') ? $('#fBirth').value : '');
    const age = date ? Math.max(0, ageOf(date)) : null;
    hint.textContent = date ? `Edad: ${age} años` : 'Edad: —';
    hint.classList.toggle('is-empty', !date);
  }
  function formError(message, focusId) {
    const box = $('#formError');
    if (box) { box.textContent = message; box.hidden = false; }
    if (focusId && $(focusId)) {
      $(focusId).classList.add('is-invalid');
      $(focusId).focus();
    }
  }
  function readForm() {
    const prefix = $('#fCedulaPrefix') && $('#fCedulaPrefix').value === 'E' ? 'E' : 'V';
    const cedulaNumber = phoneDigits($('#fCedulaNumber') ? $('#fCedulaNumber').value : '');
    return {
      name: ($('#fName') ? $('#fName').value : '').trim(),
      year: Number($('#fYear') ? $('#fYear').value : 0),
      section: $('#fSection') ? $('#fSection').value : '',
      sex: $('#fSex') ? $('#fSex').value : '',
      cedula: cedulaNumber ? `${prefix}-${cedulaNumber}` : '',
      birthDate: $('#fBirth') ? $('#fBirth').value : '',
      birthPlace: ($('#fPlace') ? $('#fPlace').value : '').trim(),
      repName: ($('#fRep') ? $('#fRep').value : '').trim(),
      repCedula: ($('#fRepCedula') ? $('#fRepCedula').value : '').trim(),
      phone: ($('#fPhone') ? $('#fPhone').value : '').trim(),
      address: ($('#fAddress') ? $('#fAddress').value : '').trim(),
      notes: ($('#fNotes') ? $('#fNotes').value : '').trim()
    };
  }
  function saveStudent(e) {
    if (e) e.preventDefault();
    if ($('#formError')) { $('#formError').hidden = true; }
    $$('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
    const data = readForm();

    if (data.name.length < 3) { formError('Escribe los apellidos y nombres del estudiante.', '#fName'); return; }
    if (!(data.year >= 1 && data.year <= 5)) { formError('Selecciona el año que cursa el estudiante.', '#fYear'); return; }
    if (data.sex !== 'M' && data.sex !== 'F') { formError('Selecciona el sexo del estudiante.', '#fSex'); return; }
    if (data.section && !(db.sections[data.year] || []).includes(data.section)) data.section = '';
    if (data.cedula) {
      const cedulaDigits = phoneDigits(data.cedula);
      if (cedulaDigits.length < 4 || cedulaDigits.length > 9) {
        formError('La cédula debe tener entre 4 y 9 dígitos.', '#fCedulaNumber');
        return;
      }
    }
    if (data.birthDate) {
      const d = parseISO(data.birthDate);
      if (!d) { formError('La fecha de nacimiento no es válida.', '#fBirth'); return; }
      if (d > new Date()) { formError('La fecha de nacimiento no puede estar en el futuro.', '#fBirth'); return; }
    }
    if (data.cedula) {
      const digits = phoneDigits(data.cedula);
      const dup = db.students.find((s) => s.id !== state.editingId && digits && phoneDigits(s.cedula) === digits);
      if (dup) { formError(`Ya existe un estudiante con esa cédula: ${dup.name}.`, '#fCedulaNumber'); return; }
    }

    const editing = state.editingId ? db.students.find((s) => s.id === state.editingId) : null;
    const now = nowISO();
    if (editing) {
      Object.assign(editing, data, { updatedAt: now });
    } else {
      const newStudent = Object.assign({ id: uid(), createdAt: now, updatedAt: now }, data);
      db.students.push(newStudent);
      state.page = 1;
    }
    saveDB();
    refreshStudents();
    renderAll(true);
    const addedId = editing ? editing.id : db.students[db.students.length - 1].id;
    closeForm();
    flashSaved('all');
    toast(editing ? 'Ficha actualizada' : 'Estudiante añadido');

    if (!editing) {
      resetFiltersState();
      setView('estudiantes');
      renderStudents();
      openDrawer(addedId);
    } else if (document.body.classList.contains('drawer-open')) {
      renderDrawer();
    }
  }

  let confirmHandler = null;
  function askConfirm(opts) {
    if ($('#confirmTitle')) $('#confirmTitle').textContent = opts.title || '¿Estás seguro?';
    if ($('#confirmMessage')) $('#confirmMessage').textContent = opts.message || 'Esta acción no se puede deshacer.';
    if ($('#confirmOk')) {
      $('#confirmOk').textContent = opts.ok || 'Eliminar';
      $('#confirmOk').className = 'btn ' + (opts.danger === false ? 'btn-primary' : 'btn-danger');
    }
    confirmHandler = opts.onConfirm || null;
    $('#confirmModal').hidden = false;
    syncLock();
    setTimeout(() => { const b = $('#confirmCancel'); if (b) b.focus(); }, 60);
  }
  function closeConfirm() {
    $('#confirmModal').hidden = true;
    syncLock();
  }
  function confirmDelete(id) {
    const s = db.students.find((x) => x.id === id);
    if (!s) return;
    askConfirm({
      title: 'Eliminar estudiante',
      message: `Se eliminará la ficha de ${s.name}. Esta acción no se puede deshacer.`,
      ok: 'Eliminar',
      onConfirm: () => {
        db.students = db.students.filter((x) => x.id !== id);
        saveDB();
        refreshStudents();
        renderAll(true);
        closeForm();
        if (state.activeId === id) closeDrawer();
        flashSaved('all');
        toast('Estudiante eliminado');
      }
    });
  }

  /* ── acciones de datos ───────────────────────────────── */
  function toast(message, kind) {
    const host = $('#toasts');
    if (!host) return;
    const el = document.createElement('div');
    el.className = 'toast' + (kind === 'error' ? ' error' : '');
    el.innerHTML = `<svg class="icon"><use href="#i-${kind === 'error' ? 'alert' : 'check'}"/></svg><span>${esc(message)}</span>`;
    host.appendChild(el);
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 320);
    }, 2600);
  }
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch (e) {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;top:-9999px;opacity:0';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        ta.remove();
        return ok;
      } catch (err) { return false; }
    }
  }
  function fichaText(s) {
    return [
      s.name,
      'Cédula: ' + formatCedula(s.cedula),
      'Año: ' + s.year + '° año',
      'Sección: ' + (s.section || 'Sin sección'),
      'Fecha de nacimiento: ' + formatDateShort(s.birthDate) + (s.age != null ? ' (' + s.age + ' años)' : ''),
      'Lugar de nacimiento: ' + (s.birthPlace || '—'),
      'Sexo: ' + (s.sex === 'M' ? 'Masculino' : 'Femenino'),
      'Representante: ' + (s.repName || '—') + (s.repCedula ? ' (' + formatCedula(s.repCedula) + ')' : ''),
      'Teléfono: ' + (s.phone || 'sin registro'),
      'Dirección: ' + (s.address || 'sin registro'),
      s.notes ? 'Observaciones: ' + s.notes : ''
    ].filter(Boolean).join('\n');
  }
  function downloadBlob(content, type, filename) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
  function exportCSV(list, scope) {
    if (!list.length) { toast('No hay estudiantes para exportar', 'error'); return; }
    const headers = ['Año', 'Sección', 'Apellidos y nombres', 'Cédula', 'Fecha de nacimiento', 'Edad', 'Sexo', 'Lugar de nacimiento', 'Representante', 'Cédula del representante', 'Teléfono', 'Dirección', 'Observaciones'];
    const rows = list.map((s) => [
      s.year + '° año', s.section || '', s.name, s.cedula, formatDateShort(s.birthDate), s.age == null ? '' : s.age,
      s.sex === 'M' ? 'Masculino' : s.sex === 'F' ? 'Femenino' : '',
      s.birthPlace, s.repName, s.repCedula, s.phone, s.address, s.notes
    ]);
    const csv = '\uFEFF' + [headers].concat(rows).map((row) => row.map((c) => `"${String(c == null ? '' : c).replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const date = new Date().toISOString().slice(0, 10);
    downloadBlob(csv, 'text/csv;charset=utf-8;', `estudiantes-fabricio-${date}.csv`);
    toast(`${list.length} estudiante${list.length === 1 ? '' : 's'} exportado${list.length === 1 ? '' : 's'} a CSV`);
  }
  function exportBackup() {
    const date = new Date().toISOString().slice(0, 10);
    downloadBlob(JSON.stringify(db, null, 2), 'application/json;charset=utf-8;', `respaldo-fabricio-${date}.json`);
    toast('Respaldo descargado');
  }
  function importBackup(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!parsed || !Array.isArray(parsed.students)) throw new Error('Formato inválido');
        const incoming = normalizeDB(parsed);
        askConfirm({
          title: 'Restaurar respaldo',
          message: `Se reemplazarán los datos actuales por ${incoming.students.length} estudiante${incoming.students.length === 1 ? '' : 's'} del respaldo. ¿Continuar?`,
          ok: 'Restaurar',
          danger: false,
          onConfirm: () => {
            db = incoming;
            state.perPage = db.settings.perPage;
            applyTheme(db.settings.theme);
            saveDB();
            renderAll(true);
            flashSaved('all');
            toast('Respaldo restaurado');
          }
        });
      } catch (e) {
        toast('El archivo no es un respaldo válido', 'error');
      }
      if ($('#restoreInput')) $('#restoreInput').value = '';
    };
    reader.readAsText(file, 'utf-8');
  }
  function importLegacy(data) {
    if (!data || !Array.isArray(data.students)) { toast('No se encontraron datos del Excel', 'error'); return; }
    const existing = new Set(db.students.map((s) => phoneDigits(s.cedula)).filter(Boolean));
    let added = 0;
    const now = nowISO();
    data.students.forEach((s) => {
      const cedula = cleanStr(s.c, 20);
      const key = phoneDigits(cedula);
      if (key && existing.has(key)) return;
      const phone = s.p && !/no inscrito|sin dato|ficha|no tiene/i.test(s.p) ? cleanStr(s.p, 20) : '';
      const address = s.a && !/no inscrito|sin dato|ficha|no tiene/i.test(s.a) ? cleanStr(s.a, 120) : '';
      const place = s.bp && !/no registrado/i.test(s.bp) ? cleanStr(s.bp, 60) : '';
      db.students.push({
        id: uid(), name: cleanStr(s.n, 90), year: Number(s.y), section: (db.sections[Number(s.y)] || [])[0] || '',
        sex: s.s === 'F' ? 'F' : 'M',
        cedula, birthDate: s.bd || '', birthPlace: place, repName: cleanStr(s.r, 90), repCedula: cleanStr(s.rc, 20),
        phone, address, notes: '', createdAt: now, updatedAt: now
      });
      if (key) existing.add(key);
      added++;
    });
    if (db.initial && initialTotals().total === 0 && data.enrollment && data.enrollment.initial) {
      [1, 2, 3, 4, 5].forEach((y) => {
        const item = data.enrollment.initial[y] || data.enrollment.initial[String(y)];
        if (item) db.initial[y] = { m: parseInt(item.m, 10) || 0, f: parseInt(item.f, 10) || 0 };
      });
    }
    saveDB();
    refreshStudents();
    renderAll(true);
    flashSaved('all');
    toast(added ? `${added} estudiantes recuperados del Excel` : 'Los estudiantes del Excel ya estaban cargados');
    if (added && state.view !== 'estudiantes') {
      /* se queda en configuración para que el usuario vea el resultado */
    }
  }
  let legacyLoading = false;
  function loadLegacy() {
    askConfirm({
      title: 'Recuperar datos del Excel',
      message: 'Se cargarán los 106 estudiantes del archivo “Todos los Años.xlsx”. Se omitirán las cédulas que ya existan, se ubicarán en la primera sección de cada año y, si la matrícula inicial está vacía, se completará con la de septiembre.',
      ok: 'Cargar estudiantes',
      danger: false,
      onConfirm: () => {
        if (window.LEGACY_DATA) { importLegacy(window.LEGACY_DATA); return; }
        if (legacyLoading) return;
        legacyLoading = true;
        const script = document.createElement('script');
        script.src = 'assets/legacy.js';
        script.onload = () => {
          legacyLoading = false;
          if (window.LEGACY_DATA) importLegacy(window.LEGACY_DATA);
          else toast('No se pudo leer el archivo de datos', 'error');
        };
        script.onerror = () => {
          legacyLoading = false;
          toast('No se encontró assets/legacy.js', 'error');
        };
        document.head.appendChild(script);
      }
    });
  }
  function clearAllData() {
    askConfirm({
      title: 'Borrar estudiantes y matrícula',
      message: `Se eliminarán ${students.length} estudiante${students.length === 1 ? '' : 's'} y toda la matrícula inicial. La configuración y el tema se mantienen. Esta acción no se puede deshacer.`,
      ok: 'Borrar todo',
      onConfirm: () => {
        db.students = [];
        db.initial = emptyInitial();
        state.activeId = null;
        state.page = 1;
        state.query = '';
        state.year = 'all';
        state.section = 'all';
        state.sex = 'all';
        state.attention = null;
        if ($('#globalSearch')) $('#globalSearch').value = '';
        if ($('#studentSearch')) $('#studentSearch').value = '';
        saveDB();
        refreshStudents();
        renderAll(true);
        flashSaved('all');
        toast('Datos eliminados. La app está limpia.');
      }
    });
  }

  /* ── render general ──────────────────────────────────── */
  function renderAll(animate) {
    refreshStudents();
    applyBranding();
    updateNav();
    renderDashboard();
    renderSettings();
    renderSectionOptions();
    renderStudents();
    renderMatricula();
    if (animate && state.view === 'resumen' && students.length) requestAnimationFrame(animateDashboard);
  }

  /* ── eventos ─────────────────────────────────────────── */
  function bindEvents() {
    $$('.nav-item, .mobile-nav button, .brand, .topbar-brand').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        setView(btn.dataset.view);
      });
    });
    $$('[data-goto]').forEach((btn) => btn.addEventListener('click', () => setView(btn.dataset.goto)));
    $$('[data-add-student]').forEach((btn) => btn.addEventListener('click', () => openForm()));
    ['#quickAdd', '#addStudentBtn'].forEach((sel) => { const el = $(sel); if (el) el.addEventListener('click', () => openForm()); });

    const themeBtn = $('#themeToggle');
    if (themeBtn) themeBtn.addEventListener('click', () => {
      const order = ['light', 'dark', 'black'];
      const current = order.indexOf(db.settings.theme);
      setTheme(order[(current + 1) % order.length]);
    });

    const globalSearch = $('#globalSearch');
    if (globalSearch) globalSearch.addEventListener('input', (e) => setQuery(e.target.value));
    const studentSearch = $('#studentSearch');
    if (studentSearch) studentSearch.addEventListener('input', (e) => setQuery(e.target.value));
    const searchClear = $('#searchClear');
    if (searchClear) searchClear.addEventListener('click', () => { setQuery(''); if ($('#studentSearch')) $('#studentSearch').focus(); });

    const yearFilter = $('#yearFilter');
    if (yearFilter) yearFilter.addEventListener('click', (e) => {
      const btn = e.target.closest('.chip');
      if (!btn) return;
      state.year = btn.dataset.year;
      state.page = 1;
      syncFilterUI();
      renderStudents();
    });
    const sexFilter = $('#sexFilter');
    if (sexFilter) sexFilter.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      state.sex = btn.dataset.sex;
      state.page = 1;
      syncFilterUI();
      renderStudents();
    });
    const sectionFilter = $('#sectionFilter');
    if (sectionFilter) sectionFilter.addEventListener('change', (e) => {
      state.section = e.target.value;
      state.page = 1;
      renderStudents();
    });
    const sortSelect = $('#sortSelect');
    if (sortSelect) sortSelect.addEventListener('change', (e) => {
      state.sort = e.target.value;
      state.dir = 1;
      state.page = 1;
      renderStudents();
    });
    const clearFilters = $('#clearFilters');
    if (clearFilters) clearFilters.addEventListener('click', () => { resetFiltersState(); renderStudents(); });

    $$('.sort-btn').forEach((btn) => btn.addEventListener('click', () => {
      if (state.sort === btn.dataset.sort) state.dir *= -1;
      else { state.sort = btn.dataset.sort; state.dir = 1; }
      state.page = 1;
      renderStudents();
    }));

    const activeFilters = $('#activeFilters');
    if (activeFilters) activeFilters.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-clear]');
      if (!btn) return;
      const what = btn.dataset.clear;
      if (what === 'all') { resetFiltersState(); renderStudents(); return; }
      if (what === 'query') { state.query = ''; if ($('#globalSearch')) $('#globalSearch').value = ''; if ($('#studentSearch')) $('#studentSearch').value = ''; }
      if (what === 'year') state.year = 'all';
      if (what === 'section') state.section = 'all';
      if (what === 'sex') state.sex = 'all';
      if (what === 'attention') state.attention = null;
      state.page = 1;
      syncFilterUI();
      renderStudents();
    });

    const studentsBody = $('#studentsBody');
    if (studentsBody) {
      studentsBody.addEventListener('click', (e) => {
        const edit = e.target.closest('[data-edit]');
        if (edit) { openForm(edit.dataset.edit); return; }
        const del = e.target.closest('[data-delete]');
        if (del) { confirmDelete(del.dataset.delete); return; }
        const row = e.target.closest('tr[data-id]');
        if (row) openDrawer(row.dataset.id);
      });
      studentsBody.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        if (e.target.closest('button')) return;
        const row = e.target.closest('tr[data-id]');
        if (row) { e.preventDefault(); openDrawer(row.dataset.id); }
      });
    }

    const pager = $('#pager');
    if (pager) pager.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-page]');
      if (!btn) return;
      const pages = Math.max(1, Math.ceil(filteredStudents().length / state.perPage));
      if (btn.dataset.page === 'prev') state.page = Math.max(1, state.page - 1);
      else if (btn.dataset.page === 'next') state.page = Math.min(pages, state.page + 1);
      else state.page = Number(btn.dataset.page);
      renderStudents();
      const card = $('.table-card');
      if (card) window.scrollTo({ top: card.getBoundingClientRect().top + window.scrollY - 90, behavior: 'smooth' });
    });

    const emptyAction = $('#emptyAction');
    if (emptyAction) emptyAction.addEventListener('click', () => {
      if (state.emptyMode === 'add') openForm();
      else { resetFiltersState(); renderStudents(); }
    });

    const healthList = $('#healthList');
    if (healthList) healthList.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-att]');
      if (!btn) return;
      state.attention = btn.dataset.att;
      state.year = 'all'; state.section = 'all'; state.sex = 'all'; state.query = '';
      state.page = 1;
      if ($('#globalSearch')) $('#globalSearch').value = '';
      if ($('#studentSearch')) $('#studentSearch').value = '';
      syncFilterUI();
      setView('estudiantes');
      renderStudents();
    });
    const recentList = $('#recentList');
    if (recentList) recentList.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-recent]');
      if (btn) openDrawer(btn.dataset.recent);
    });

    const exportBtn = $('#exportBtn');
    if (exportBtn) exportBtn.addEventListener('click', () => exportCSV(filteredStudents(), 'filtered'));
    const printBtn = $('#printBtn');
    if (printBtn) printBtn.addEventListener('click', () => {
      state.printing = true;
      state.printMode = 'filtered';
      renderStudents();
      setTimeout(() => window.print(), 250);
    });
    window.addEventListener('afterprint', () => {
      if (!state.printing) return;
      state.printing = false;
      state.printMode = 'filtered';
      renderStudents();
    });
    window.addEventListener('beforeprint', () => {
      if (state.printing) return;
      state.printing = true;
      state.printMode = 'all';
      renderStudents();
    });

    const matBody = $('#matBody');
    if (matBody) {
      matBody.addEventListener('input', (e) => {
        const input = e.target.closest('.mat-input');
        if (input) onInitialInput(input);
      });
      matBody.addEventListener('blur', (e) => {
        const input = e.target.closest('.mat-input');
        if (!input) return;
        if (input.value === '') { input.value = '0'; }
        onInitialInput(input);
      }, true);
    }

    const sectionEditor = $('#sectionEditor');
    if (sectionEditor) {
      sectionEditor.addEventListener('click', (e) => {
        const del = e.target.closest('[data-del-year]');
        if (del) { deleteSection(Number(del.dataset.delYear), del.dataset.delName); return; }
        const add = e.target.closest('[data-add-section]');
        if (add) {
          const year = Number(add.dataset.addSection);
          const input = document.querySelector(`[data-new-section="${year}"]`);
          if (input) addSection(year, input.value);
        }
      });
      sectionEditor.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        const input = e.target.closest('[data-new-section]');
        if (!input) return;
        e.preventDefault();
        addSection(Number(input.dataset.newSection), input.value);
      });
    }

    const themeGrid = $('#themeGrid');
    if (themeGrid) themeGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-theme-choice]');
      if (btn) setTheme(btn.dataset.themeChoice);
    });
    const setPerPage = $('#setPerPage');
    if (setPerPage) setPerPage.addEventListener('change', (e) => {
      const value = Number(e.target.value);
      if (![10, 12, 20, 30].includes(value)) return;
      db.settings.perPage = value;
      state.perPage = value;
      state.page = 1;
      saveDB();
      flashSaved('settings');
      renderStudents();
    });

    const nameInput = $('#setName');
    if (nameInput) {
      nameInput.addEventListener('input', () => onInstitutionInput(nameInput, 'institution'));
      nameInput.addEventListener('blur', () => onInstitutionBlur(nameInput, 'institution'));
    }
    const locInput = $('#setLocation');
    if (locInput) {
      locInput.addEventListener('input', () => onInstitutionInput(locInput, 'location'));
      locInput.addEventListener('blur', () => onInstitutionBlur(locInput, 'location'));
    }
    const yearInput = $('#setYear');
    if (yearInput) {
      yearInput.addEventListener('input', () => onInstitutionInput(yearInput, 'schoolYear'));
      yearInput.addEventListener('blur', () => onInstitutionBlur(yearInput, 'schoolYear'));
    }

    const backupBtn = $('#backupBtn');
    if (backupBtn) backupBtn.addEventListener('click', exportBackup);
    const restoreInput = $('#restoreInput');
    if (restoreInput) restoreInput.addEventListener('change', (e) => importBackup(e.target.files && e.target.files[0]));
    const csvBtn = $('#csvBtn');
    if (csvBtn) csvBtn.addEventListener('click', () => exportCSV(studentsByName(), 'all'));
    const legacyBtn = $('#legacyBtn');
    if (legacyBtn) legacyBtn.addEventListener('click', loadLegacy);
    const clearBtn = $('#clearBtn');
    if (clearBtn) clearBtn.addEventListener('click', clearAllData);

    const drawerClose = $('#drawerClose');
    if (drawerClose) drawerClose.addEventListener('click', closeDrawer);
    const drawerBackdrop = $('#drawerBackdrop');
    if (drawerBackdrop) drawerBackdrop.addEventListener('click', closeDrawer);
    const drawerPrev = $('#drawerPrev');
    if (drawerPrev) drawerPrev.addEventListener('click', () => stepDrawer(-1));
    const drawerNext = $('#drawerNext');
    if (drawerNext) drawerNext.addEventListener('click', () => stepDrawer(1));
    const drawerEdit = $('#drawerEditBtn');
    if (drawerEdit) drawerEdit.addEventListener('click', () => { if (state.activeId) openForm(state.activeId); });
    const drawerCopy = $('#drawerCopyBtn');
    if (drawerCopy) drawerCopy.addEventListener('click', async () => {
      const s = students.find((x) => x.id === state.activeId);
      if (!s) return;
      const ok = await copyText(fichaText(s));
      toast(ok ? 'Ficha copiada' : 'No se pudo copiar', ok ? undefined : 'error');
    });
    const drawerContent = $('#drawerContent');
    if (drawerContent) drawerContent.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-copy]');
      if (!btn) return;
      const ok = await copyText(btn.dataset.copy);
      toast(ok ? 'Teléfono copiado' : 'No se pudo copiar', ok ? undefined : 'error');
    });

    const studentForm = $('#studentForm');
    if (studentForm) {
      studentForm.addEventListener('submit', saveStudent);
      studentForm.addEventListener('input', (e) => {
        if (e.target.classList) e.target.classList.remove('is-invalid');
        const box = $('#formError');
        if (box) box.hidden = true;
        if (e.target.id === 'fBirth') updateAgeHint();
        if (e.target.id === 'fYear') updateSectionOptions(null);
        if (e.target.id === 'fCedulaNumber') {
          const clean = e.target.value.replace(/\D/g, '').slice(0, 9);
          if (clean !== e.target.value) e.target.value = clean;
        }
      });
      $$('[data-close-modal]').forEach((btn) => btn.addEventListener('click', closeForm));
    }
    const studentModal = $('#studentModal');
    if (studentModal) studentModal.addEventListener('click', (e) => { if (e.target === studentModal) closeForm(); });
    const formYear = $('#fYear');
    if (formYear) formYear.addEventListener('change', () => updateSectionOptions(null));
    const deleteStudentBtn = $('#deleteStudentBtn');
    if (deleteStudentBtn) deleteStudentBtn.addEventListener('click', () => {
      if (state.editingId) confirmDelete(state.editingId);
    });

    const confirmCancel = $('#confirmCancel');
    if (confirmCancel) confirmCancel.addEventListener('click', closeConfirm);
    const confirmOk = $('#confirmOk');
    if (confirmOk) confirmOk.addEventListener('click', () => {
      const fn = confirmHandler;
      closeConfirm();
      confirmHandler = null;
      if (fn) fn();
    });
    const confirmModal = $('#confirmModal');
    if (confirmModal) confirmModal.addEventListener('click', (e) => { if (e.target === confirmModal) closeConfirm(); });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!$('#confirmModal').hidden) { closeConfirm(); return; }
        if (!$('#studentModal').hidden) { closeForm(); return; }
        if (document.body.classList.contains('drawer-open')) { closeDrawer(); return; }
      }
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
      if (e.key === '/' && !typing && $('#studentModal').hidden && $('#confirmModal').hidden && !document.body.classList.contains('drawer-open')) {
        e.preventDefault();
        if ($('#globalSearch')) { $('#globalSearch').focus(); $('#globalSearch').select(); }
      }
    });

    const drawer = $('#drawer');
    if (drawer) drawer.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const items = $$('a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])', drawer);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    window.addEventListener('scroll', () => {
      const bar = $('.topbar');
      if (bar) bar.classList.toggle('is-scrolled', window.scrollY > 6);
    }, { passive: true });

    window.addEventListener('hashchange', () => {
      const name = location.hash.replace('#', '');
      if (VIEW_META[name] && name !== state.view) setView(name, { keepHash: true });
    });

    document.addEventListener('pointermove', (e) => {
      const card = e.target.closest('.spotlight');
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });

    document.addEventListener('pointerdown', (e) => {
      const btn = e.target.closest('.btn');
      if (!btn || btn.disabled) return;
      const r = btn.getBoundingClientRect();
      const size = Math.max(r.width, r.height);
      const ripple = document.createElement('span');
      ripple.className = 'ripple';
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - r.left - size / 2) + 'px';
      ripple.style.top = (e.clientY - r.top - size / 2) + 'px';
      btn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 650);
    });
  }

  /* ── navegación ──────────────────────────────────────── */
  function setView(name, opts) {
    if (!VIEW_META[name]) return;
    const changed = state.view !== name;
    state.view = name;
    $$('.view').forEach((v) => v.classList.toggle('is-active', v.dataset.view === name));
    $$('.nav-item, .mobile-nav button, .brand, .topbar-brand').forEach((b) => b.classList.toggle('is-active', b.dataset.view === name));
    if ($('#viewTitle')) $('#viewTitle').textContent = VIEW_META[name].title;
    if ($('#viewEyebrow')) $('#viewEyebrow').textContent = VIEW_META[name].eyebrow;
    if (!opts || !opts.keepHash) {
      try { history.replaceState(null, '', '#' + name); } catch (e) { /* file:// */ }
    }
    if (document.body.classList.contains('drawer-open')) closeDrawer();
    if (changed) window.scrollTo({ top: 0, behavior: 'smooth' });
    if (name === 'resumen') requestAnimationFrame(animateDashboard);
    if (name === 'matricula') renderMatricula();
    if (name === 'configuracion') renderSettings();
  }

  /* ── arranque ────────────────────────────────────────── */
  function init() {
    state.perPage = db.settings.perPage;
    applyTheme(db.settings.theme);
    renderAll(false);
    bindEvents();
    updateClock();
    setInterval(updateClock, 1000);
    const hash = location.hash.replace('#', '');
    setView(VIEW_META[hash] ? hash : 'resumen', { keepHash: true });
    if (!storageOK) toast('El navegador no permite guardar datos localmente', 'error');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
