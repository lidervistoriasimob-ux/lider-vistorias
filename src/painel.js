// Painel do responsável: login via Netlify Identity e gestão dos pedidos.
import { login, logout, getUser, handleAuthCallback, updateUser, acceptInvite, requestPasswordRecovery, AuthError, MissingIdentityError } from '@netlify/identity';
import { TIPOS, STATUS } from '../shared/catalogo.js';
import { IC } from './icons.js';
import { $, $$, esc, pad, when, enderecoDe, msgOf, toast, api } from './util.js';

const tipoDe = (id) => TIPOS.find((t) => t.id === id) || TIPOS[0];
const isAdmin = (u) => !!u && (u.roles || u.appMetadata?.roles || []).includes('admin');

let user = null;
let rows = [];
let FLT = 'novo';
let Q = '';
let timer = null;
let loaded = false;

function setAdminUi(on) {
  $$('.only-admin').forEach((e) => { e.hidden = !on; });
  document.body.classList.toggle('is-admin', on);
}
function badge() {
  const n = rows.filter((x) => x.status === 'novo').length;
  $$('.only-admin .badge').forEach((b) => { b.hidden = !n; b.textContent = n; });
}

export async function boot() {
  user = await getUser();
  setAdminUi(isAdmin(user));
  if (isAdmin(user)) { await fetchRows(true); badge(); }
}

export async function show() {
  if (!loaded) { user = await getUser(); loaded = true; }
  if (!user) return renderLogin();
  if (!isAdmin(user)) return renderNoAccess();
  setAdminUi(true);
  $('#adminActs').hidden = false;
  if (!rows.length) renderSkeleton();
  await fetchRows();
  clearInterval(timer);
  timer = setInterval(() => { if (document.body.dataset.view === 'painel' && !document.hidden) fetchRows(true); }, 30000);
}

export async function callback() {
  try {
    const r = await handleAuthCallback();
    if (!r) return;
    location.hash = '#painel';
    if (r.type === 'invite') return passwordSheet('Bem-vindo à Líder Vistorias', 'Crie uma senha para acessar o painel.', async (pw) => { user = await acceptInvite(r.token, pw); });
    if (r.type === 'recovery') return passwordSheet('Redefinir senha', 'Escolha uma nova senha para sua conta.', async (pw) => { user = await updateUser({ password: pw }); });
    user = r.user;
    toast(r.type === 'confirmation' ? 'E-mail confirmado.' : 'Login realizado.');
  } catch (e) {
    console.error('Líder Vistorias: falha no retorno de autenticação.', e);
    toast(e instanceof AuthError ? e.message : 'Link inválido ou expirado.');
  }
}

async function fetchRows(silent) {
  try {
    rows = await api('/api/pedidos');
    badge();
    if (document.body.dataset.view === 'painel') renderList();
  } catch (e) {
    if (silent) return;
    if (e.status === 401) { user = null; return renderLogin(); }
    if (e.status === 403) return renderNoAccess();
    $('#painel').innerHTML = `<div class="note">${IC('help', 's')} ${esc(e.message)}</div>`;
  }
}

function renderSkeleton() {
  $('#painel').innerHTML = `<div class="stats">${'<div class="stat skel"><i></i></div>'.repeat(4)}</div><div class="list">${'<div class="card skel"><i></i><i></i><i></i></div>'.repeat(3)}</div>`;
}

function renderLogin(msg = '') {
  $('#adminActs').hidden = true;
  $('#painel').innerHTML = `<form class="card login col rise" id="loginForm" novalidate>
    <div class="login-h"><img src="/.netlify/images?url=/img/lider-emblema.png&w=120&fm=webp" width="48" height="61" alt=""><div><h2>Entrar</h2><p class="muted">Acesso exclusivo do responsável pelos agendamentos.</p></div></div>
    ${msg ? `<div class="note">${esc(msg)}</div>` : ''}
    <div class="field"><label for="l-email">E-mail</label><input class="in" id="l-email" type="email" autocomplete="username" required></div>
    <div class="field"><label for="l-pw">Senha</label><input class="in" id="l-pw" type="password" autocomplete="current-password" required></div>
    <button class="btn gold" type="submit">${IC('lock', 's')} Entrar no painel</button>
    <button class="btn ghost sm" type="button" id="forgot">Esqueci minha senha</button>
  </form>`;
  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const b = e.submitter || $('#loginForm .btn.gold');
    b.classList.add('loading');
    try {
      user = await login($('#l-email').value.trim(), $('#l-pw').value);
      toast('Bem-vindo de volta' + (user.name ? ', ' + user.name.split(' ')[0] : '') + '!');
      show();
    } catch (err) {
      b.classList.remove('loading');
      if (err instanceof MissingIdentityError) return renderLogin('O login ainda não está ativo neste site.');
      renderLogin(err instanceof AuthError && err.status === 401 ? 'E-mail ou senha incorretos.' : (err.message || 'Não foi possível entrar.'));
    }
  });
  $('#forgot').addEventListener('click', async () => {
    const em = $('#l-email').value.trim();
    if (!em) { toast('Digite seu e-mail primeiro.'); $('#l-email').focus(); return; }
    try { await requestPasswordRecovery(em); toast('Enviamos um link de redefinição para seu e-mail.'); } catch (err) { toast(err.message || 'Não foi possível enviar o link.'); }
  });
}

function renderNoAccess() {
  $('#adminActs').hidden = true;
  $('#painel').innerHTML = `<div class="empty card">${IC('lock', 'l')}<h3>Conta sem acesso ao painel</h3><p>Você entrou como ${esc(user?.email || '')}, mas esta conta não tem permissão de responsável.</p><button type="button" class="btn line sm" id="logout2">Sair</button></div>`;
  $('#logout2').addEventListener('click', doLogout);
}

function passwordSheet(title, sub, fn) {
  const d = $('#sheet');
  d.innerHTML = `<form method="dialog" class="col" id="pwForm"><h2 class="h2">${esc(title)}</h2><p class="muted">${esc(sub)}</p>
    <div class="field"><label for="pw1">Nova senha</label><input class="in" id="pw1" type="password" minlength="8" autocomplete="new-password" required></div>
    <button class="btn gold" type="submit">Salvar senha</button></form>`;
  d.showModal();
  $('#pwForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pw = $('#pw1').value;
    if (pw.length < 8) { toast('Use pelo menos 8 caracteres.'); return; }
    try { await fn(pw); d.close(); toast('Senha salva.'); loaded = true; boot(); show(); } catch (err) { toast(err.message || 'Não foi possível salvar.'); }
  });
}

async function doLogout() {
  try { await logout(); } catch {}
  user = null; rows = []; clearInterval(timer);
  setAdminUi(false);
  renderLogin();
  toast('Você saiu do painel.');
}

const FILTROS = [['novo', 'Novos'], ['confirmado', 'Confirmados'], ['concluido', 'Concluídos'], ['todos', 'Todos']];
function renderList() {
  const c = (s) => rows.filter((x) => x.status === s).length;
  const hoje = new Date();
  const hojeIso = hoje.getFullYear() + '-' + pad(hoje.getMonth() + 1) + '-' + pad(hoje.getDate());
  const agenda = rows.filter((x) => x.status === 'confirmado' && x.data === hojeIso).length;
  const q = Q.toLowerCase();
  const l = rows.filter((x) => (FLT === 'todos' || x.status === FLT) && (!q || [x.protocolo, x.nome, x.telefone, x.endereco, x.cidade, x.tipo].join(' ').toLowerCase().includes(q)));
  const box = $('#painel');
  const keepFocus = document.activeElement?.id === 'q';
  box.innerHTML = `
    <div class="stats">
      <div class="stat novo"><span>Novos</span><b>${c('novo')}</b></div>
      <div class="stat confirmado"><span>Confirmados</span><b>${c('confirmado')}</b></div>
      <div class="stat concluido"><span>Concluídos</span><b>${c('concluido')}</b></div>
      <div class="stat hoje"><span>Agenda de hoje</span><b>${agenda}</b></div>
    </div>
    <div class="toolbar">
      <div class="in-wrap search">${IC('search', 's')}<input class="in" id="q" type="search" placeholder="Buscar por nome, protocolo, endereço…" value="${esc(Q)}"></div>
      <div class="seg" id="flt" role="radiogroup">${FILTROS.map((f) => `<button type="button" role="radio" aria-checked="${FLT === f[0]}" data-flt="${f[0]}">${f[1]}</button>`).join('')}</div>
    </div>
    <div class="list">${l.length ? l.map(card).join('') : `<div class="empty card">${IC('inbox', 'l')}<h3>Nenhum pedido aqui</h3><p>${Q ? 'Nenhum resultado para a busca.' : 'Quando alguém solicitar uma vistoria, ela aparece nesta tela.'}</p></div>`}</div>`;
  if (keepFocus) { const i = $('#q'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
}

function waTo(x) {
  let d = x.telefone.replace(/\D/g, '');
  if (d.length <= 11) d = '55' + d;
  const first = x.nome.split(' ')[0];
  const txt = x.status === 'confirmado'
    ? `Olá, ${first}! Sua ${x.tipo.toLowerCase()} (${x.protocolo}) está confirmada para ${when(x)}.`
    : `Olá, ${first}! Recebi seu pedido de ${x.tipo.toLowerCase()} (${x.protocolo}) para ${when(x)}. Posso confirmar?`;
  return 'https://wa.me/' + d + '?text=' + encodeURIComponent(txt);
}

function card(x) {
  const t = tipoDe(x.tipoId), dt = new Date(x.createdAt);
  const p = esc(x.protocolo);
  return `<article class="card pc rise">
    <div class="tp"><span class="tile">${IC(t.i)}</span><div class="grow"><h3>${esc(x.tipo)}</h3><div class="m mono">${p} · ${pad(dt.getDate())}/${pad(dt.getMonth() + 1)} ${pad(dt.getHours())}:${pad(dt.getMinutes())}</div></div><span class="pill ${x.status}">${STATUS[x.status] === 'Recebido' ? 'Novo' : STATUS[x.status]}</span></div>
    <div class="kv">
      <div><span>Quando</span><b>${esc(when(x))}</b></div>
      <div><span>Endereço</span><b><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(enderecoDe(x))}" target="_blank" rel="noopener">${esc(enderecoDe(x))}</a></b></div>
      <div><span>Imóvel</span><b>${esc(x.imovel + ' · ' + x.situacao)}</b></div>
      <div><span>Cliente</span><b>${esc(x.nome + ' (' + x.papel + ')')}</b></div>
      <div><span>WhatsApp</span><b><a href="tel:${esc(x.telefone.replace(/\D/g, ''))}">${esc(x.telefone)}</a></b></div>
      ${x.observacoes ? `<div><span>Obs.</span><b>${esc(x.observacoes)}</b></div>` : ''}
    </div>
    <div class="acts">
      <a class="btn soft wa-s" target="_blank" rel="noopener" href="${waTo(x)}">${IC('wa', 's')}Responder</a>
      ${x.status === 'novo' ? `<button type="button" class="btn soft" data-st="confirmado" data-p="${p}">${IC('check', 's')}Confirmar</button>` : ''}
      ${x.status === 'confirmado' ? `<button type="button" class="btn soft" data-st="concluido" data-p="${p}">${IC('check', 's')}Concluir</button>` : ''}
      ${x.status === 'novo' || x.status === 'confirmado' ? `<button type="button" class="btn soft" data-st="cancelado" data-p="${p}">${IC('ban', 's')}Cancelar</button>` : ''}
      ${x.status === 'cancelado' || x.status === 'concluido' ? `<button type="button" class="btn soft" data-st="novo" data-p="${p}">${IC('refresh', 's')}Reabrir</button>` : ''}
      <button type="button" class="btn soft" data-cp="${p}">${IC('copy', 's')}Copiar</button>
      <button type="button" class="btn dg" data-rm="${p}">${IC('trash', 's')}<span>Remover</span></button>
    </div>
  </article>`;
}

async function setStatus(p, st) {
  const prev = rows;
  rows = rows.map((x) => (x.protocolo === p ? { ...x, status: st } : x));
  renderList(); badge();
  try { await api('/api/pedidos/' + encodeURIComponent(p), { method: 'PATCH', body: JSON.stringify({ status: st }) }); toast('Pedido ' + (st === 'novo' ? 'reaberto' : STATUS[st].toLowerCase())); }
  catch (e) { rows = prev; renderList(); badge(); toast('Não foi possível atualizar o pedido.'); }
}
async function remove(p) {
  const prev = rows;
  rows = rows.filter((x) => x.protocolo !== p);
  renderList(); badge();
  try { await api('/api/pedidos/' + encodeURIComponent(p), { method: 'DELETE' }); toast('Pedido removido'); }
  catch (e) { rows = prev; renderList(); badge(); toast('Não foi possível remover o pedido.'); }
}

function exportCsv() {
  const cols = [['protocolo', 'Protocolo'], ['status', 'Status'], ['tipo', 'Serviço'], ['imovel', 'Imóvel'], ['situacao', 'Situação'], ['data', 'Data'], ['horario', 'Horário'], ['endereco', 'Endereço'], ['complemento', 'Complemento'], ['cidade', 'Bairro/Cidade'], ['cep', 'CEP'], ['nome', 'Cliente'], ['papel', 'Papel'], ['telefone', 'WhatsApp'], ['observacoes', 'Observações'], ['createdAt', 'Recebido em']];
  const q = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const csv = '﻿' + [cols.map((c) => q(c[1])).join(';'), ...rows.map((r) => cols.map((c) => q(c[0] === 'status' ? STATUS[r.status] : r[c[0]])).join(';'))].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = 'pedidos-lider-vistorias.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

document.addEventListener('click', (e) => {
  const t = e.target.closest('#view-painel button');
  if (!t) return;
  const ds = t.dataset;
  if (t.id === 'refresh') { fetchRows().then(() => toast('Lista atualizada')); return; }
  if (t.id === 'csv') { exportCsv(); return; }
  if (t.id === 'logout') { doLogout(); return; }
  if (ds.flt) { FLT = ds.flt; renderList(); return; }
  if (ds.st) { setStatus(ds.p, ds.st); return; }
  if (ds.cp) { const x = rows.find((y) => y.protocolo === ds.cp); if (x) navigator.clipboard?.writeText(msgOf(x)).then(() => toast('Pedido copiado'), () => toast('Não foi possível copiar')); return; }
  if (ds.rm) {
    if (ds.armed) { remove(ds.rm); return; }
    ds.armed = '1';
    t.classList.add('armed');
    t.lastChild.textContent = 'Confirmar?';
    setTimeout(() => { if (t.isConnected) { delete ds.armed; t.classList.remove('armed'); t.lastChild.textContent = 'Remover'; } }, 3000);
  }
});
document.addEventListener('input', (e) => {
  if (e.target.id !== 'q') return;
  Q = e.target.value;
  renderList();
});
