import * as XLSX from 'xlsx';
import type { RawDataRow } from '@/types/data';

function getVal(row: any, keys: string[]): any {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null) return row[k];
  }
  return '';
}

function getNum(row: any, keys: string[]): number {
  const v = getVal(row, keys);
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(/\./g, '').replace(',', '.'));
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

export function parseExcelFile(buffer: ArrayBuffer): { data: RawDataRow[]; preview: Record<string, any>[] } {
  const workbook = XLSX.read(buffer, { type: 'array' });
  
  // Try "Base de Dados" first, then first sheet
  const sheetName = workbook.SheetNames.find(n => 
    n.toLowerCase().includes('base') || n.toLowerCase().includes('dados')
  ) || workbook.SheetNames[0];
  
  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  
  const preview = jsonData.slice(0, 5) as Record<string, any>[];
  
  const data: RawDataRow[] = jsonData.map((row: any) => ({
    base: String(getVal(row, ['Base', 'base', 'BASE'])),
    mes: Number(getVal(row, ['Mês', 'Mes', 'mes', 'MÊS', 'MES'])) || 0,
    codProduto: String(getVal(row, ['Cod Produto', 'COD PRODUTO', 'Cod_Produto', 'CodProduto'])),
    descricaoProduto: String(getVal(row, ['Descricao Produto', 'Descrição Produto', 'DESCRICAO PRODUTO', 'DescricaoProduto', 'Descricao_Produto'])),
    familia: String(getVal(row, ['FAMILIA', 'Familia', 'familia', 'Família'])),
    grupoProduto: String(getVal(row, ['GRUPO PRODUTO', 'Grupo Produto', 'GrupoProduto'])),
    subcategoria1: String(getVal(row, ['SUBCAT EGORIA 1', 'SUBCATEGORIA 1', 'Subcategoria1', 'SUBCAT_EGORIA_1'])),
    subcategoria2: String(getVal(row, ['SUBCAT EGORIA 2', 'SUBCATEGORIA 2', 'Subcategoria2', 'SUBCAT_EGORIA_2'])),
    subcategoria3: String(getVal(row, ['SUBCAT EGORIA 3', 'SUBCATEGORIA 3', 'Subcategoria3', 'SUBCAT_EGORIA_3'])),
    bu: String(getVal(row, ['BU', 'Bu', 'bu'])),
    segmento: String(getVal(row, ['Segmento', 'SEGMENTO', 'segmento'])),
    pais: String(getVal(row, ['País', 'Pais', 'PAIS', 'PAÍS', 'pais'])),
    uf: String(getVal(row, ['UF', 'uf', 'Uf'])),
    mercado: String(getVal(row, ['Mercado', 'MERCADO', 'mercado'])),
    codCliente: String(getVal(row, ['Cod Cliente', 'COD CLIENTE', 'CodCliente'])),
    cliente: String(getVal(row, ['CLIENTE', 'Cliente', 'cliente'])),
    grupoClientes: String(getVal(row, ['Grupo de Clientes', 'GRUPO DE CLIENTES', 'GrupoClientes', 'Grupo_de_Clientes'])),
    quantidade: getNum(row, ['Quant.', 'QUANT.', 'Quant', 'Quantidade', 'QUANTIDADE', 'quantidade']),
    receitaBrutaProdutos: getNum(row, ['Receita Bruta com Produtos', 'RECEITA BRUTA COM PRODUTOS']),
    valorFrete: getNum(row, ['Valor Frete', 'VALOR FRETE', 'VlrFrete']),
    valorSeguro: getNum(row, ['Vlr Seguro', 'VLR SEGURO', 'ValorSeguro']),
    outrasDespesas: getNum(row, ['Outras Despesas', 'OUTRAS DESPESAS']),
    valorDespesas: getNum(row, ['Vlr Despesas', 'VLR DESPESAS', 'ValorDespesas']),
    receitaBrutaOutrasReceitas: getNum(row, ['Receita Bruta Outras Receitas', 'RECEITA BRUTA OUTRAS RECEITAS']),
    receitaBrutaOperacional: getNum(row, ['Receita Bruta Operacional', 'RECEITA BRUTA OPERACIONAL']),
    devolucao: getNum(row, ['(-)Devolução', '(-)Devoluçao', 'Devolução', 'DEVOLUÇÃO', 'Devolucao', '(-)DEVOLUÇÃO']),
    impostosSemST: getNum(row, ['(-)Impostos S/ST', 'Impostos S/ST', 'IMPOSTOS S/ST', '(-)IMPOSTOS S/ST']),
    icms: getNum(row, ['ICMS', 'icms', 'Icms']),
    icmsST: getNum(row, ['ICMS ST', 'ICMS_ST', 'IcmsST']),
  }));

  return { data, preview };
}
