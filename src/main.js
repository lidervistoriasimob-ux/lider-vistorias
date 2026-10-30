import './styles.css';
import { TIPOS, IMOVEIS, SITUACOES, PAPEIS, HORARIOS, STATUS } from '../shared/catalogo.js';
import { mountIcons, IC } from './icons.js';
import { $, $$, esc, pad, WD, WDL, MON, MONL, iso, when, enderecoDe, maskPhone, maskCep, waLink, msgOf, toast, api, icsFor } from './util.js';

mountIcons();

const CFG = { dias: 14 };
const tipoDe = (id) => TIPOS.find((t) => t.id === id) || TIPOS[0];
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { console.error('Líder Vistorias: não foi possível salvar no aparelho.', e); } },
};

/* ---------- tema ---------- */
let THEME = null;
const mq = window.matchMedia('(prefers-color-scheme: light)');
function applyTheme(theme, persist) {
  THEME = theme === 'light' || theme === 'dark' ? theme : null;
  if (THEME) document.documentElement.dataset.theme = THEME;
  else delete document.documentElement.dataset.theme;
  const light = THEME ? THEME === 'light' : mq.matches;
  $('#themeColor').content = light ? '#f6f1e7' : '#0b0a08';
  $('#themeIcon').setAttribute('href', light ? '#i-moon' : '#i-sun');
  $('#themeToggle').setAttribute('aria-label', light ? 'Ativar modo escuro' : 'Ativar modo claro');
  if (persist) try { localStorage.setItem('lv.theme', THEME); } catch {}
}

/* ---------- wizard ---------- */
const contato = store.get('lv.contato', {});
const fresh = () => ({ tipoId: 'entrada', imovel: 'Apartamento', situacao: 'Vazio', cep: '', endereco: '', complemento: '', cidade: '', data: null, horario: null, nome: contato.nome || '', telefone: contato.telefone || '', papel: contato.papel || 'Inquilino', observacoes: '', website: '' });
let S = fresh();
let step = 1;
let sending = false;

function past(s, sl) {
  const n = new Date();
  if (s !== iso(n)) return false;
  const [h, m] = sl.split(':').map(Number);
  return h * 60 + m < n.getHours() * 60 + n.getMinutes() + 60;
}
const dayOk = (s) => new Date(s + 'T00:00:00').getDay() !== 0 && HORARIOS.some((x) => !past(s, x));
function dias() {
  const o = [], n = new Date();
  for (let i = 0; i < CFG.dias; i++) {
    const d = new Date(n.getFullYear(), n.getMonth(), n.getDate() + i);
    o.push({ d, s: iso(d) });
  }
  return o.filter((x) => dayOk(x.s));
}
const seg = (id, list, cur) => `<div class="seg" id="${id}" role="radiogroup">${list.map((v) => `<button type="button" role="radio" aria-checked="${cur === v}" data-v="${v}">${v}</button>`).join('')}</div>`;
const pedido = () => ({ ...S, tipo: tipoDe(S.tipoId).n });

function render() {
  let h = '';
  if (step === 1) {
    h = `<div class="step">
      <section class="card flush"><span class="q">Tipo de vistoria</span><div class="opts" role="radiogroup">${TIPOS.map((t, i) => `
        <button type="button" class="opt" role="radio" aria-checked="${S.tipoId === t.id}" data-type="${t.id}">
          <span class="tile">${IC(t.i)}</span><span class="t"><b>${t.n}</b><small>${t.s}</small></span><span class="ck">${IC('check')}</span>
        </button>`).join('')}</div></section>
      <section class="card"><span class="q">Tipo de imóvel</span>${seg('props', IMOVEIS, S.imovel)}</section>
      <section class="card"><span class="q">Situação</span>${seg('conds', SITUACOES, S.situacao)}</section>
    </div>`;
  } else if (step === 2) {
    const ds = dias();
    if (!S.data || !dayOk(S.data)) S.data = ds[0] ? ds[0].s : null;
    h = `<div class="step">
      <section class="card"><span class="q">Endereço do imóvel</span><div class="col">
        <div class="field cep"><label for="f-cep">CEP <small>preenche o endereço automaticamente</small></label><div class="in-wrap"><input class="in mono" id="f-cep" data-k="cep" inputmode="numeric" placeholder="00000-000" autocomplete="postal-code" value="${esc(maskCep(S.cep))}"><span class="spin" id="cepSpin" hidden></span></div></div>
        <div class="field"><label for="f-street">Rua / avenida e número</label><input class="in" id="f-street" data-k="endereco" placeholder="Ex.: Rua das Palmeiras, 120" autocomplete="address-line1" value="${esc(S.endereco)}"></div>
        <div class="two">
          <div class="field"><label for="f-comp">Apto / bloco (opcional)</label><input class="in" id="f-comp" data-k="complemento" placeholder="Apto 204" value="${esc(S.complemento)}"></div>
          <div class="field"><label for="f-city">Bairro e cidade</label><input class="in" id="f-city" data-k="cidade" placeholder="Centro, Rio Verde" value="${esc(S.cidade)}"></div>
        </div></div></section>
      <section class="card"><span class="q">Data desejada</span><div class="days" id="days" role="radiogroup">${ds.map((x) => `
        <button type="button" class="day" role="radio" aria-checked="${S.data === x.s}" data-date="${x.s}"><small>${WD[x.d.getDay()]}</small><b>${x.d.getDate()}</b><small>${MON[x.d.getMonth()]}</small></button>`).join('')}</div></section>
      <section class="card"><span class="q">Horário</span><div class="slots" role="radiogroup">${HORARIOS.map((s) => `
        <button type="button" class="slot" role="radio" aria-checked="${S.horario === s}" data-slot="${s}"${S.data && past(S.data, s) ? ' disabled' : ''}>${s}</button>`).join('')}
        <button type="button" class="slot w" role="radio" aria-checked="${!S.horario}" data-slot="any">${IC('clock', 's')} Qualquer horário</button></div></section>
    </div>`;
  } else {
    const x = pedido();
    h = `<div class="step">
      <section class="card"><span class="q">Seus dados</span><div class="col">
        <div class="field"><label for="f-name">Seu nome completo</label><input class="in" id="f-name" data-k="nome" placeholder="Ex.: Carlos Eduardo Silva" autocomplete="name" value="${esc(S.nome)}"></div>
        <div class="field"><label for="f-phone">Seu WhatsApp</label><input class="in mono" id="f-phone" data-k="telefone" type="tel" inputmode="tel" placeholder="(64) 99999-9999" autocomplete="tel" value="${esc(S.telefone)}"></div>
        <input type="text" class="hp" data-k="website" tabindex="-1" autocomplete="off" aria-hidden="true">
      </div></section>
      <section class="card"><span class="q">Seu papel</span>${seg('roles', PAPEIS, S.papel)}</section>
      <section class="card"><div class="field"><label for="f-notes" class="q">Observações (opcional)</label><textarea class="in" id="f-notes" data-k="observacoes" rows="3" placeholder="Ex.: Pet no quintal, chaves na portaria.">${esc(S.observacoes)}</textarea></div></section>
      <section class="card receipt"><span class="q">Resumo do pedido</span><div class="kv">
        <div><span>Serviço</span><b>${esc(x.tipo)}</b></div>
        <div><span>Imóvel</span><b>${esc(x.imovel + ' · ' + x.situacao)}</b></div>
        <div><span>Endereço</span><b>${esc(enderecoDe(x))}</b></div>
        <div><span>Quando</span><b>${esc(x.data ? when(x) : '—')}</b></div>
      </div></section>
    </div>`;
  }
  $('#steps').innerHTML = h;
  $$('.prog li').forEach((e, i) => { e.classList.toggle('on', i < step); e.classList.toggle('cur', i === step - 1); });
  $('#back').hidden = step === 1;
  $('#next').hidden = step === 3;
  $('#send').hidden = step !== 3;
  $('#sendHint').hidden = step !== 3;
}

function validate() {
  if (step === 2) {
    if (S.endereco.trim().length < 4 || S.cidade.trim().length < 2) { toast('Informe a rua com número e o bairro/cidade.'); return false; }
    if (!S.data) { toast('Sem datas disponíveis no momento.'); return false; }
  }
  if (step === 3) {
    if (S.nome.trim().length < 3) { toast('Informe seu nome completo.'); return false; }
    const d = S.telefone.replace(/\D/g, '');
    if (d.length < 10 || d.length > 11) { toast('Informe um WhatsApp válido com DDD.'); return false; }
  }
  return true;
}

function go(n) {
  step = n;
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function startFlow(tipoId) {
  if (!$('#done').hidden) { S = fresh(); $('#done').hidden = true; $('#flow').hidden = false; }
  if (tipoId) S.tipoId = tipoId;
  step = 1;
  render();
}

async function buscaCep(cep) {
  $('#cepSpin').hidden = false;
  try {
    const r = await fetch('https://viacep.com.br/ws/' + cep + '/json/');
    const d = await r.json();
    if (step !== 2 || !$('#f-street')) return;
    if (d.erro) { toast('CEP não encontrado. Preencha o endereço manualmente.'); return; }
    if (d.logradouro) { S.endereco = d.logradouro + ', '; $('#f-street').value = S.endereco; }
    S.cidade = [d.bairro, d.localidade && d.localidade + (d.uf ? '/' + d.uf : '')].filter(Boolean).join(', ');
    $('#f-city').value = S.cidade;
    const st = $('#f-street');
    st.focus();
    st.setSelectionRange(st.value.length, st.value.length);
    toast('Endereço encontrado — informe o número.');
  } catch (e) {
    console.error('Líder Vistorias: falha na busca de CEP.', e);
  } finally {
    const sp = $('#cepSpin');
    if (sp) sp.hidden = true;
  }
}

async function enviar() {
  if (sending || !validate()) return;
  sending = true;
  const btn = $('#send');
  btn.classList.add('loading');
  const x = pedido();
  store.set('lv.contato', { nome: x.nome, telefone: x.telefone, papel: x.papel });
  let salvo = null;
  try {
    salvo = await api('/api/pedidos', { method: 'POST', body: JSON.stringify(x) });
    const mine = store.get('lv.pedidos', []);
    mine.unshift({ protocolo: salvo.protocolo, tel: x.telefone.replace(/\D/g, '').slice(-4), tipo: salvo.tipo, tipoId: salvo.tipoId, data: salvo.data, horario: salvo.horario, status: salvo.status, createdAt: salvo.createdAt });
    store.set('lv.pedidos', mine.slice(0, 20));
  } catch (e) {
    console.error('Líder Vistorias: falha ao registrar pedido.', e);
    if (e.status === 422) { toast(e.message); sending = false; btn.classList.remove('loading'); return; }
  }
  sending = false;
  btn.classList.remove('loading');
  showDone(salvo ? { ...x, ...salvo } : x, !!salvo);
}

function showDone(x, ok) {
  $('#flow').hidden = true;
  const d = $('#done');
  d.hidden = false;
  d.innerHTML = `<div class="done">
    <svg class="big" viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="28"/><path d="M18 31l8 8 16-17"/></svg>
    <p class="eb">${ok ? 'Pedido registrado' : 'Quase lá'}</p>
    <h2 class="h2">${ok ? 'Recebemos sua <em>solicitação.</em>' : 'Envie pelo <em>WhatsApp</em> para concluir.'}</h2>
    ${ok ? `<button type="button" class="proto" data-copyproto="${esc(x.protocolo)}" aria-label="Copiar protocolo"><small>Protocolo</small><b>${esc(x.protocolo)}</b>${IC('copy', 's')}</button>` : ''}
    <p class="muted">${ok ? 'Para agilizar a confirmação, encaminhe o pedido ao responsável pelo WhatsApp. Você pode acompanhar o status a qualquer momento.' : 'Não conseguimos registrar o pedido online agora. Toque abaixo para enviá-lo diretamente ao responsável.'}</p>
    <div class="wait">${IC('clock', 's')} Aguardando confirmação · ${esc(when(x))}</div>
    <div class="done-acts">
      <a class="btn wa" href="${waLink(msgOf(x))}" target="_blank" rel="noopener">${IC('wa')} Enviar pelo WhatsApp</a>
      <div class="two">
        <button type="button" class="btn line" data-ics>${IC('calplus', 's')} Salvar na agenda</button>
        ${ok ? `<a class="btn line" href="#acompanhar">${IC('search', 's')} Acompanhar</a>` : `<button type="button" class="btn line" data-retry>${IC('refresh', 's')} Tentar de novo</button>`}
      </div>
      <button type="button" class="btn ghost" data-new>Fazer novo pedido</button>
    </div>
  </div>`;
  d._pedido = x;
  confetti(d.querySelector('.done'));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function confetti(host) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const box = document.createElement('div');
  box.className = 'sparkles';
  for (let i = 0; i < 26; i++) {
    const s = document.createElement('i');
    s.style.setProperty('--x', (Math.random() * 2 - 1) * 160 + 'px');
    s.style.setProperty('--y', -(Math.random() * 140 + 40) + 'px');
    s.style.setProperty('--r', Math.random() * 360 + 'deg');
    s.style.animationDelay = Math.random() * 0.25 + 0.35 + 's';
    box.appendChild(s);
  }
  host.appendChild(box);
  setTimeout(() => box.remove(), 2200);
}

/* ---------- acompanhar ---------- */
const ORDEM = ['novo', 'confirmado', 'concluido'];
function timeline(x) {
  if (x.status === 'cancelado') return `<div class="note">${IC('ban', 's')} Este pedido foi cancelado. Fale com o responsável se precisar reagendar.</div>`;
  const idx = ORDEM.indexOf(x.status);
  const labels = [['Pedido recebido', 'Registrado e aguardando análise'], ['Agendamento confirmado', when(x)], ['Vistoria concluída', 'Laudo digital com fotos e assinatura']];
  return `<ol class="tl">${labels.map((l, i) => `<li class="${i <= idx ? 'on' : ''}${i === idx ? ' cur' : ''}"><i>${i <= idx ? IC('check', 's') : ''}</i><div><b>${l[0]}</b><small>${esc(l[1])}</small></div></li>`).join('')}</ol>`;
}
function trackCard(x) {
  const t = tipoDe(x.tipoId);
  return `<article class="card track rise">
    <div class="tp"><span class="tile">${IC(t.i)}</span><div class="grow"><h3>${esc(x.tipo)}</h3><div class="m mono">${esc(x.protocolo)}</div></div><span class="pill ${x.status}">${STATUS[x.status] || x.status}</span></div>
    ${timeline(x)}
  </article>`;
}
async function consultar(prot, tel) {
  const box = $('#trackResult');
  box.innerHTML = `<div class="card skel"><i></i><i></i><i></i></div>`;
  try {
    const x = await api('/api/acompanhar?protocolo=' + encodeURIComponent(prot) + '&tel=' + encodeURIComponent(tel));
    box.innerHTML = trackCard(x);
    const mine = store.get('lv.pedidos', []);
    const m = mine.find((p) => p.protocolo === x.protocolo);
    if (m) { m.status = x.status; store.set('lv.pedidos', mine); renderMine(); }
  } catch (e) {
    box.innerHTML = `<div class="note">${IC('help', 's')} ${esc(e.message)}</div>`;
  }
}
function renderMine() {
  const mine = store.get('lv.pedidos', []);
  const el = $('#mine');
  if (!mine.length) {
    el.innerHTML = `<div class="empty card">${IC('inbox', 'l')}<h3>Nenhum pedido neste aparelho</h3><p>Quando você enviar uma solicitação, ela aparece aqui com o status atualizado.</p><a class="btn gold sm" href="#solicitar" data-start="entrada">Solicitar vistoria</a></div>`;
    return;
  }
  el.innerHTML = mine.map((p) => {
    const t = tipoDe(p.tipoId);
    return `<button type="button" class="card mini" data-track="${esc(p.protocolo)}" data-tel="${esc(p.tel)}"><span class="tile">${IC(t.i)}</span><span class="grow"><b>${esc(p.tipo)}</b><small class="mono">${esc(p.protocolo)} · ${esc(when(p))}</small></span><span class="pill ${p.status}">${STATUS[p.status] || ''}</span></button>`;
  }).join('');
}
async function refreshMine() {
  const mine = store.get('lv.pedidos', []);
  if (!mine.length) return;
  await Promise.all(mine.slice(0, 8).map(async (p) => {
    try { const x = await api('/api/acompanhar?protocolo=' + p.protocolo + '&tel=' + p.tel); p.status = x.status; p.data = x.data; p.horario = x.horario; } catch {}
  }));
  store.set('lv.pedidos', mine);
  renderMine();
}

/* ---------- ajuda: checklist ---------- */
const PREP = [
  'Combinar quem dará acesso ao imóvel',
  'Deixar chaves, controles e tags separados',
  'Ligar água, luz e gás (se houver)',
  'Liberar acesso a todos os ambientes e áreas externas',
  'Separar o laudo de entrada (em vistorias de saída)',
  'Anotar reparos ou itens que precisam de atenção',
];
function renderPrep() {
  const done = store.get('lv.prep', []);
  $('#prepList').innerHTML = PREP.map((p, i) => `<button type="button" class="chk" role="checkbox" aria-checked="${done.includes(i)}" data-prep="${i}"><i>${IC('check', 's')}</i>${p}</button>`).join('');
  const pct = Math.round((done.length / PREP.length) * 100);
  $('#prepPct').textContent = pct + '%';
  $('#prepArc').style.strokeDashoffset = String(106.8 * (1 - pct / 100));
}

/* ---------- rotas ---------- */
const VIEWS = ['inicio', 'solicitar', 'acompanhar', 'ajuda', 'painel'];
let painel = null;
function route() {
  let h = location.hash.replace('#', '');
  if (!VIEWS.includes(h)) h = 'inicio';
  VIEWS.forEach((x) => { $('#view-' + x).hidden = x !== h; });
  $$('[data-tab]').forEach((a) => (a.dataset.tab === h ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  document.body.dataset.view = h;
  window.scrollTo({ top: 0 });
  if (h === 'acompanhar') { renderMine(); refreshMine(); }
  if (h === 'painel') loadPainel().then((m) => m.show());
  observeReveals();
}
function loadPainel() {
  painel ||= import('./painel.js');
  return painel;
}

let io;
function observeReveals() {
  if (!('IntersectionObserver' in window)) { $$('.reveal').forEach((e) => e.classList.add('in')); return; }
  io ||= new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12 });
  $$('.reveal:not(.in)').forEach((e) => io.observe(e));
}

/* ---------- eventos ---------- */
document.addEventListener('click', (e) => {
  const t = e.target.closest('button,a');
  if (!t) return;
  const ds = t.dataset;
  if (t.id === 'themeToggle') { const light = THEME ? THEME === 'light' : mq.matches; applyTheme(light ? 'dark' : 'light', true); return; }
  if (ds.start) { startFlow(ds.start); return; }
  if (ds.type) { S.tipoId = ds.type; render(); return; }
  if (ds.v && t.parentElement) {
    const id = t.parentElement.id;
    if (id === 'props') S.imovel = ds.v; else if (id === 'conds') S.situacao = ds.v; else if (id === 'roles') S.papel = ds.v; else return;
    render();
    return;
  }
  if (ds.date) { S.data = ds.date; if (S.horario && past(S.data, S.horario)) S.horario = null; render(); return; }
  if (ds.slot) { S.horario = ds.slot === 'any' ? null : ds.slot; render(); return; }
  if (ds.prep) {
    const i = +ds.prep, done = store.get('lv.prep', []);
    store.set('lv.prep', done.includes(i) ? done.filter((x) => x !== i) : [...done, i]);
    renderPrep();
    return;
  }
  if (ds.track) { $('#t-prot').value = ds.track; $('#t-tel').value = ds.tel; consultar(ds.track, ds.tel); return; }
  if ('copyproto' in ds) { navigator.clipboard?.writeText(ds.copyproto).then(() => toast('Protocolo copiado'), () => {}); return; }
  if ('ics' in ds) { icsFor($('#done')._pedido); return; }
  if ('retry' in ds) { $('#done').hidden = true; $('#flow').hidden = false; step = 3; render(); enviar(); return; }
  if ('new' in ds) { S = fresh(); Object.assign(S, store.get('lv.contato', {})); $('#done').hidden = true; $('#flow').hidden = false; go(1); return; }
});
$('#steps').addEventListener('input', (e) => {
  const k = e.target.dataset.k;
  if (!k) return;
  let v = e.target.value;
  if (k === 'telefone') { v = maskPhone(v); e.target.value = v; }
  if (k === 'cep') {
    e.target.value = maskCep(v);
    v = v.replace(/\D/g, '').slice(0, 8);
    if (v.length === 8 && v !== S.cep) { S.cep = v; buscaCep(v); return; }
  }
  S[k] = v;
});
$('#next').addEventListener('click', () => { if (validate() && step < 3) go(step + 1); });
$('#back').addEventListener('click', () => go(step - 1));
$('#send').addEventListener('click', enviar);
$('#trackForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const p = $('#t-prot').value.trim().toUpperCase(), tl = $('#t-tel').value.replace(/\D/g, '');
  if (!p || tl.length !== 4) { toast('Informe o protocolo e os 4 últimos dígitos.'); return; }
  consultar(p, tl);
});
$('#t-tel').addEventListener('input', (e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4); });
window.addEventListener('hashchange', route);

// parallax suave no hero + barra superior compacta ao rolar
let ticking = false;
window.addEventListener('scroll', () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    const y = window.scrollY;
    document.body.classList.toggle('scrolled', y > 24);
    const bg = $('.hero-bg img');
    if (bg && document.body.dataset.view === 'inicio' && y < 900) bg.style.transform = `translate3d(0,${y * 0.25}px,0) scale(1.08)`;
    ticking = false;
  });
}, { passive: true });

// brilho que acompanha o cursor nos cartões
document.addEventListener('pointermove', (e) => {
  const c = e.target.closest?.('.svc,.who article');
  if (!c) return;
  const r = c.getBoundingClientRect();
  c.style.setProperty('--mx', e.clientX - r.left + 'px');
  c.style.setProperty('--my', e.clientY - r.top + 'px');
});

/* ---------- init ---------- */
try { applyTheme(localStorage.getItem('lv.theme'), false); } catch { applyTheme(null, false); }
mq.addEventListener('change', () => { if (!THEME) applyTheme(null, false); });
const now = new Date();
$('#today').textContent = WDL[now.getDay()] + ', ' + now.getDate() + ' de ' + MONL[now.getMonth()];
$('#yr').textContent = now.getFullYear();
['#waTalk', '#waHelp', '#fab'].forEach((s) => { $(s).href = waLink('Olá! Gostaria de informações sobre vistoria de imóvel.'); });
$('#rail').innerHTML = TIPOS.map((t, i) => `
  <article class="svc reveal" style="--d:${i * 70}ms">
    <div class="svc-top"><span class="tile lg">${IC(t.i)}</span><span class="idx">${pad(i + 1)}</span></div>
    <h3>${t.n}</h3><p>${t.s}</p>
    <a class="link" href="#solicitar" data-start="${t.id}">Solicitar ${IC('arrow', 's')}</a>
  </article>`).join('');
render();
renderPrep();

if (/(invite|recovery|confirmation|email_change)_token=|access_token=/.test(location.hash)) {
  loadPainel().then((m) => m.callback()).finally(route);
} else {
  route();
  const idle = window.requestIdleCallback || ((f) => setTimeout(f, 1200));
  idle(() => loadPainel().then((m) => m.boot()));
}
