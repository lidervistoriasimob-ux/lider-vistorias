// Utilidades compartilhadas pelo app.
import { WHATSAPP } from '../shared/catalogo.js';

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const pad = (n) => String(n).padStart(2, '0');

export const WD = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
export const WDL = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
export const MON = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const MONL = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export const iso = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
export function dlabel(s) {
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return WD[dt.getDay()] + ', ' + pad(d) + '/' + pad(m);
}
export const when = (x) => (x.data ? dlabel(x.data) : '—') + ' · ' + (x.horario || 'qualquer horário');
export const enderecoDe = (x) => x.endereco + (x.complemento ? ' — ' + x.complemento : '') + ' — ' + x.cidade;

export function maskPhone(v) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length < 3) return d ? '(' + d : '';
  if (d.length < 7) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
  if (d.length < 11) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
  return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
}
export function maskCep(v) {
  const d = v.replace(/\D/g, '').slice(0, 8);
  return d.length > 5 ? d.slice(0, 5) + '-' + d.slice(5) : d;
}

export const waLink = (text, phone = WHATSAPP) => 'https://wa.me/' + phone + (text ? '?text=' + encodeURIComponent(text) : '');

export function msgOf(x) {
  return '*SOLICITAÇÃO DE VISTORIA*' + (x.protocolo ? ' · ' + x.protocolo : '') + '\n' + x.tipo + ' · ' + x.imovel + ' (' + x.situacao.toLowerCase() + ')\nEndereço: ' + enderecoDe(x) + (x.cep ? ' · CEP ' + maskCep(x.cep) : '') + '\nData: ' + when(x) + '\nSolicitante: ' + x.nome + ' (' + x.papel + ') · ' + x.telefone + (x.observacoes ? '\nObs.: ' + x.observacoes : '');
}

let tt;
export function toast(m) {
  const t = $('#toast');
  t.textContent = m;
  t.classList.add('on');
  clearTimeout(tt);
  tt = setTimeout(() => t.classList.remove('on'), 2800);
}

export async function api(path, opts = {}) {
  const r = await fetch(path, { credentials: 'same-origin', headers: opts.body ? { 'content-type': 'application/json' } : undefined, ...opts });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const err = new Error(data.error || 'Erro de conexão.');
    err.status = r.status;
    throw err;
  }
  return data;
}

// Arquivo .ics para adicionar a vistoria na agenda do celular.
export function icsFor(x) {
  const [y, m, d] = x.data.split('-');
  const [hh, mm] = (x.horario || '09:00').split(':');
  const start = `${y}${m}${d}T${hh}${mm}00`;
  const endD = new Date(+y, +m - 1, +d, +hh + 2, +mm);
  const end = `${endD.getFullYear()}${pad(endD.getMonth() + 1)}${pad(endD.getDate())}T${pad(endD.getHours())}${pad(endD.getMinutes())}00`;
  const e = (s) => String(s).replace(/[,;\\]/g, (c) => '\\' + c).replace(/\n/g, '\\n');
  const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Lider Vistorias//PT-BR', 'BEGIN:VEVENT', `UID:${x.protocolo || Date.now()}@lidervistorias`, `DTSTAMP:${start}`, `DTSTART:${start}`, `DTEND:${end}`, `SUMMARY:${e(x.tipo + ' — Líder Vistorias')}`, `LOCATION:${e(enderecoDe(x))}`, `DESCRIPTION:${e('Protocolo ' + (x.protocolo || '') + '. Aguardando confirmação do responsável.' + (x.horario ? '' : ' Horário a definir.'))}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([body], { type: 'text/calendar' }));
  a.download = (x.protocolo || 'vistoria') + '.ics';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
