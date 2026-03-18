export interface RawDataRow {
  base: string; // "Orç 26", "Real 26", "Real 25"
  mes: number;
  codProduto: string;
  descricaoProduto: string;
  familia: string;
  grupoProduto: string;
  subcategoria1: string;
  subcategoria2: string;
  subcategoria3: string;
  bu: string;
  segmento: string;
  pais: string;
  uf: string;
  mercado: string;
  codCliente: string;
  cliente: string;
  grupoClientes: string;
  quantidade: number;
  receitaBrutaProdutos: number;
  valorFrete: number;
  valorSeguro: number;
  outrasDespesas: number;
  valorDespesas: number;
  receitaBrutaOutrasReceitas: number;
  receitaBrutaOperacional: number;
  devolucao: number;
  impostosSemST: number;
  icms: number;
  icmsST: number;
}

export interface FilterState {
  mes: number | 'acumulado';
  baseComparacao: 'orcamento' | 'anoAnterior';
  bus: string[];
  segmentos: string[];
  familias: string[];
  paises: string[];
  ufs: string[];
  mercados: string[];
}

export interface UploadMeta {
  fileName: string;
  rowCount: number;
  uploadedAt: Date;
}
