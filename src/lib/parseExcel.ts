import * as XLSX from 'xlsx';
import type { RawDataRow } from '@/types/data';

/**
 * Normaliza uma string removendo acentos, convertendo para minúsculas,
 * e colapsando espaços múltiplos / underscores para um único espaço.
 */
function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[_\s]+/g, ' ')
    .trim();
}

/**
 * Busca um valor na row tentando match exato primeiro,
 * depois por nome normalizado.
 */
function getVal(row: Record<string, any>, candidates: string[]): any {
  // 1) Exact match
  for (const c of candidates) {
    if (row[c] !== undefined && row[c] !== null) return row[c];
  }
  // 2) Normalized match against all row keys
  const normalizedCandidates = candidates.map(normalize);
  for (const key of Object.keys(row)) {
    const nk = normalize(key);
    if (normalizedCandidates.includes(nk)) {
      if (row[key] !== undefined && row[key] !== null) return row[key];
    }
  }
  return '';
}

function getNum(row: Record<string, any>, candidates: string[]): number {
  const v = getVal(row, candidates);
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    // Handle Brazilian number format: 1.234.567,89
    const cleaned = v.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

/**
 * Mapeamento exato das colunas da planilha conforme especificação.
 * Cada campo lista o nome principal da coluna + variações comuns.
 */
const COLUMN_MAP = {
  base: ['Base'],
  mes: ['Mês', 'Mes'],
  codProduto: ['Cod Produto'],
  descricaoProduto: ['Descricao Produto', 'Descrição Produto'],
  familia: ['FAMILIA', 'Família', 'Familia'],
  grupoProduto: ['GRUPO PRODUTO', 'Grupo Produto'],
  subcategoria1: ['SUBCAT EGORIA 1', 'SUBCATEGORIA 1', 'SUBCATEGORIA1'],
  subcategoria2: ['SUBCAT EGORIA 2', 'SUBCATEGORIA 2', 'SUBCATEGORIA2'],
  subcategoria3: ['SUBCAT EGORIA 3', 'SUBCATEGORIA 3', 'SUBCATEGORIA3'],
  bu: ['BU'],
  segmento: ['Segmento'],
  pais: ['País', 'Pais'],
  uf: ['UF'],
  mercado: ['Mercado'],
  codCliente: ['Cod Cliente'],
  cliente: ['CLIENTE', 'Cliente'],
  grupoClientes: ['Grupo de Clientes'],
  quantidade: ['Quant.', 'Quant', 'Quantidade'],
  receitaBrutaProdutos: ['Receita Bruta com Produtos'],
  valorFrete: ['Valor Frete'],
  valorSeguro: ['Vlr Seguro', 'Valor Seguro'],
  outrasDespesas: ['Outras Despesas'],
  valorDespesas: ['Vlr Despesas', 'Valor Despesas'],
  receitaBrutaOutrasReceitas: ['Receita Bruta Outras Receitas'],
  receitaBrutaOperacional: ['Receita Bruta Operacional'],
  devolucao: ['(-)Devolução', '(-)Devoluçao', '(-)Devolucao', 'Devolução', 'Devolucao'],
  impostosSemST: ['(-)Impostos S/ST', 'Impostos S/ST'],
  icms: ['ICMS'],
  icmsST: ['ICMS ST'],
} as const;

const TEXT_FIELDS = new Set([
  'base', 'codProduto', 'descricaoProduto', 'familia', 'grupoProduto',
  'subcategoria1', 'subcategoria2', 'subcategoria3', 'bu', 'segmento',
  'pais', 'uf', 'mercado', 'codCliente', 'cliente', 'grupoClientes',
]);

const NUM_FIELDS = new Set([
  'mes', 'quantidade', 'receitaBrutaProdutos', 'valorFrete', 'valorSeguro',
  'outrasDespesas', 'valorDespesas', 'receitaBrutaOutrasReceitas',
  'receitaBrutaOperacional', 'devolucao', 'impostosSemST', 'icms', 'icmsST',
]);

export interface ParseResult {
  data: RawDataRow[];
  preview: Record<string, any>[];
  unmappedColumns: string[];
  sheetName: string;
}

export function parseExcelFile(buffer: ArrayBuffer): ParseResult {
  const workbook = XLSX.read(buffer, { type: 'array' });

  // Prioriza aba "Base de Dados", senão usa a primeira
  const sheetName = workbook.SheetNames.find((n) => {
    const nl = n.toLowerCase();
    return nl.includes('base') && nl.includes('dado');
  }) || workbook.SheetNames.find((n) => {
    const nl = n.toLowerCase();
    return nl.includes('base') || nl.includes('dado');
  }) || workbook.SheetNames[0];

  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Record<string, any>[];

  const preview = jsonData.slice(0, 5);

  // Detecta colunas não mapeadas para debug
  const allSheetCols = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];
  const allMappedNormalized = new Set(
    Object.values(COLUMN_MAP).flatMap((candidates) => candidates.map(normalize))
  );
  const unmappedColumns = allSheetCols.filter(
    (col) => !allMappedNormalized.has(normalize(col))
  );

  if (unmappedColumns.length > 0) {
    console.warn('[OdontoBI] Colunas da planilha não mapeadas:', unmappedColumns);
  }

  const data: RawDataRow[] = jsonData.map((row) => {
    const result: any = {};

    for (const [field, candidates] of Object.entries(COLUMN_MAP)) {
      if (TEXT_FIELDS.has(field)) {
        const v = getVal(row, candidates as unknown as string[]);
        result[field] = String(v).trim();
      } else if (NUM_FIELDS.has(field)) {
        result[field] = getNum(row, candidates as unknown as string[]);
      }
    }

    // Garante que 'mes' é inteiro
    result.mes = Math.round(result.mes) || 0;

    return result as RawDataRow;
  });

  return { data, preview, unmappedColumns, sheetName };
}
