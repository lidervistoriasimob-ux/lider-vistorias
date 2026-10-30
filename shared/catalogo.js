// Catálogo compartilhado entre o app e as funções da API.
export const TIPOS = [
  { id: 'entrada', n: 'Vistoria de entrada', s: 'Registra o estado do imóvel antes de entregar as chaves.', i: 'key' },
  { id: 'saida', n: 'Vistoria de saída', s: 'Compara o imóvel devolvido com o laudo de entrada.', i: 'door' },
  { id: 'periodica', n: 'Vistoria periódica', s: 'Acompanha a conservação durante o contrato.', i: 'refresh' },
  { id: 'constatacao', n: 'Constatação', s: 'Registra avarias, reformas ou melhorias.', i: 'tool' },
  { id: 'prevenda', n: 'Pré-compra', s: 'Confere o imóvel antes de fechar negócio.', i: 'shield' },
  { id: 'obra', n: 'Entrega de obra', s: 'Confere acabamentos e instalações ao receber as chaves.', i: 'building' },
];
export const IMOVEIS = ['Apartamento', 'Casa', 'Comercial', 'Galpão'];
export const SITUACOES = ['Vazio', 'Mobiliado', 'Ocupado'];
export const PAPEIS = ['Inquilino', 'Proprietário', 'Corretor', 'Comprador'];
export const HORARIOS = ['08:00', '09:30', '11:00', '14:00', '15:30', '17:00'];
export const STATUS = { novo: 'Recebido', confirmado: 'Confirmado', concluido: 'Concluído', cancelado: 'Cancelado' };
export const WHATSAPP = '5564999011031';
