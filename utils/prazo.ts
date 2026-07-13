
// Cálculo de prazos processuais em DIAS ÚTEIS (art. 219/224 do CPC).
//
// Regra fixa adotada, a partir da data de disponibilização no DJEN:
//   1. Publicação = primeiro dia útil seguinte à disponibilização.
//   2. Início do prazo = primeiro dia útil seguinte à publicação.
//   3. Prazo final = início + (prazoDias - 1) dias úteis.
//
// Fins de semana e feriados nacionais são desconsiderados na contagem.
// A IA identifica o TIPO do ato; o prazo é sempre calculado por esta regra,
// nunca "adivinhado" pela IA.

// Lista enxuta de feriados nacionais (ajustável no cadastro do sistema).
// Datas móveis (Carnaval, Sexta-feira Santa, Corpus Christi) incluídas para
// o ano corrente e o seguinte a título ilustrativo.
const FERIADOS_NACIONAIS = new Set<string>([
  // 2026
  '2026-01-01', '2026-02-16', '2026-02-17', '2026-04-03', '2026-04-21',
  '2026-05-01', '2026-06-04', '2026-09-07', '2026-10-12', '2026-11-02',
  '2026-11-15', '2026-12-25',
  // 2027
  '2027-01-01', '2027-02-08', '2027-02-09', '2027-03-26', '2027-04-21',
  '2027-05-01', '2027-05-27', '2027-09-07', '2027-10-12', '2027-11-02',
  '2027-11-15', '2027-12-25',
]);

const toISO = (d: Date): string => d.toISOString().split('T')[0];

const parseISO = (iso: string): Date => {
  // Interpreta como data local ao meio-dia para evitar deslocamento de fuso.
  const [y, m, day] = iso.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, day, 12, 0, 0);
};

export const isBusinessDay = (d: Date): boolean => {
  const weekday = d.getDay();
  if (weekday === 0 || weekday === 6) return false;
  return !FERIADOS_NACIONAIS.has(toISO(d));
};

// Retorna o próximo dia útil (não altera a data se já for útil, salvo forceNext).
const nextBusinessDay = (d: Date, forceNext = true): Date => {
  const result = new Date(d);
  if (forceNext) result.setDate(result.getDate() + 1);
  while (!isBusinessDay(result)) {
    result.setDate(result.getDate() + 1);
  }
  return result;
};

// Adiciona `n` dias úteis a partir de `start` (start é o 1º dia contado).
const addBusinessDays = (start: Date, n: number): Date => {
  let count = 1;
  const cursor = new Date(start);
  while (count < n) {
    cursor.setDate(cursor.getDate() + 1);
    if (isBusinessDay(cursor)) count++;
  }
  return cursor;
};

/**
 * Calcula a data final do prazo a partir da disponibilização.
 * Retorna null quando o ato não tem prazo (informativo).
 */
export const calcularPrazoFinal = (
  dataDisponibilizacao: string,
  prazoDias: number | null,
): string | null => {
  if (!prazoDias || prazoDias <= 0) return null;
  const disponibilizacao = parseISO(dataDisponibilizacao);
  const publicacao = nextBusinessDay(disponibilizacao);      // dia útil seguinte
  const inicioPrazo = nextBusinessDay(publicacao);           // 1º dia do prazo
  const final = addBusinessDays(inicioPrazo, prazoDias);
  return toISO(final);
};

/** Dias úteis restantes (negativo => atrasado). Null se não houver prazo. */
export const diasUteisRestantes = (dataPrazoFinal: string | null): number | null => {
  if (!dataPrazoFinal) return null;
  const hoje = parseISO(toISO(new Date()));
  const final = parseISO(dataPrazoFinal);

  if (toISO(final) === toISO(hoje)) return 0;

  let count = 0;
  const cursor = new Date(hoje);
  const atrasado = final < hoje;
  const step = atrasado ? -1 : 1;

  while (toISO(cursor) !== toISO(final)) {
    cursor.setDate(cursor.getDate() + step);
    if (isBusinessDay(cursor)) count += step;
  }
  return count;
};
