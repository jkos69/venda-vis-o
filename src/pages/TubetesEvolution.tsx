import { useState, useEffect, useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from "recharts";

interface VendaRecord {
  base: string;
  mes: number;
  quantidade: number;
  segmento: string;
  uf: string;
  cliente: string;
  grupoClientes: string;
  grupoProduto: string;
  bu: string;
  descricaoProduto: string;
  codProduto: string;
}

const MESES_PT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

const BASE_MAP: Record<string, { ano: number; tipo: "Real" | "Orc" }> = {
  "Real 25": { ano: 2025, tipo: "Real" },
  "Real 26": { ano: 2026, tipo: "Real" },
  "Orç 26":  { ano: 2026, tipo: "Orc" },
  "ORC 26":  { ano: 2026, tipo: "Orc" },
  "ORÇ26":   { ano: 2026, tipo: "Orc" },
  "Orç26":   { ano: 2026, tipo: "Orc" },
};

const GRANULARIDADES = ["Mensal", "Trimestral", "Anual"] as const;
type Granularidade = typeof GRANULARIDADES[number];

const DIMENSOES = ["Canal", "Estado", "Cliente"] as const;
type Dimensao = typeof DIMENSOES[number];

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function fetchVendas(): Promise<VendaRecord[]> {
  let allRecords: VendaRecord[] = [];
  let offset = 0;
  const pageSize = 1000;
  while (true) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/uploads?select=data&order=uploaded_at.desc&limit=${pageSize}&offset=${offset}`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    if (!res.ok) throw new Error(`Supabase error: ${res.status}`);
    const rows: { data: VendaRecord | VendaRecord[] }[] = await res.json();
    if (rows.length === 0) break;
    rows.forEach((row) => {
      if (!row.data) return;
      if (Array.isArray(row.data)) allRecords.push(...row.data);
      else allRecords.push(row.data);
    });
    if (rows.length < pageSize) break;
    offset += pageSize;
  }
  return allRecords;
}

function parseBase(base: string): { ano: number; tipo: "Real" | "Orc" } | null {
  const b = base?.trim() ?? "";
  for (const [key, val] of Object.entries(BASE_MAP)) {
    if (b.toLowerCase() === key.toLowerCase()) return val;
  }
  const m = b.match(/(\d{2,4})/);
  if (m) {
    const ano = parseInt(m[1]) < 100 ? 2000 + parseInt(m[1]) : parseInt(m[1]);
    const tipo = b.toLowerCase().includes("orc") || b.toLowerCase().includes("orç") ? "Orc" : "Real";
    return { ano, tipo };
  }
  return null;
}

function getTrimestre(mes: number): string {
  return `T${Math.ceil(mes / 3)}`;
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toFixed(0);
}

function variacao(atual: number, anterior: number): number | null {
  if (!anterior) return null;
  return ((atual - anterior) / anterior) * 100;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg shadow-xl p-3 text-xs space-y-1.5">
      <p className="font-semibold text-foreground">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
            <span className="text-muted-foreground">{p.name}</span>
          </span>
          <span className="font-medium text-foreground tabular-nums">{formatNum(p.value ?? 0)}</span>
        </div>
      ))}
    </div>
  );
}

function VarBadge({ pct }: { pct: number | null }) {
  if (pct === null) return null;
  const isPositive = pct >= 0;
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-bold ml-1.5 ${isPositive ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'}`}>
      {isPositive ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

function KpiCard({ label, value, sub, pct }: { label:string; value:number; sub?:string; pct?:number|null }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex-1 min-w-[160px]">
      <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">{label}</div>
      <div className="text-2xl font-extrabold text-foreground">
        {formatNum(value)}
        {pct !== undefined && <VarBadge pct={pct ?? null} />}
      </div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

export default function TubetesEvolution() {
  const [records, setRecords] = useState<VendaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [granularidade, setGranularidade] = useState<Granularidade>("Mensal");
  const [dimensao, setDimensao] = useState<Dimensao>("Canal");
  const [selectedDimValue, setSelectedDimValue] = useState<string>("Todos");
  const [mostrarOrc, setMostrarOrc] = useState(true);

  useEffect(() => {
    fetchVendas().then(setRecords).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  const dimValues = useMemo(() => {
    const vals = new Set<string>();
    records.forEach((r) => {
      if (dimensao === "Canal") vals.add(r.segmento || "N/A");
      else if (dimensao === "Estado") vals.add(r.uf || "N/A");
      else vals.add(r.grupoClientes || r.cliente || "N/A");
    });
    return ["Todos", ...Array.from(vals).sort()];
  }, [records, dimensao]);

  const filteredRecords = useMemo(() => {
    if (selectedDimValue === "Todos") return records;
    return records.filter((r) => {
      if (dimensao === "Canal") return r.segmento === selectedDimValue;
      if (dimensao === "Estado") return r.uf === selectedDimValue;
      return (r.grupoClientes || r.cliente) === selectedDimValue;
    });
  }, [records, dimensao, selectedDimValue]);

  const chartData = useMemo(() => {
    const agg: Record<string, { real25:number; real26:number; orc26:number }> = {};
    filteredRecords.forEach((r) => {
      const parsed = parseBase(r.base);
      if (!parsed) return;
      const { ano, tipo } = parsed;
      let key: string;
      if (granularidade === "Mensal") key = `${MESES_PT[(r.mes ?? 1) - 1]}/${String(ano).slice(2)}`;
      else if (granularidade === "Trimestral") key = `${getTrimestre(r.mes ?? 1)}/${String(ano).slice(2)}`;
      else key = String(ano);
      if (!agg[key]) agg[key] = { real25:0, real26:0, orc26:0 };
      const qty = Number(r.quantidade) || 0;
      if (ano === 2025 && tipo === "Real") agg[key].real25 += qty;
      else if (ano === 2026 && tipo === "Real") agg[key].real26 += qty;
      else if (ano === 2026 && tipo === "Orc") agg[key].orc26 += qty;
    });
    const ordenar = (k: string) => {
      if (granularidade === "Mensal") { const [mes, ano] = k.split("/"); return parseInt(ano)*100 + MESES_PT.indexOf(mes); }
      if (granularidade === "Trimestral") { const [t, ano] = k.split("/"); return parseInt(ano)*10 + parseInt(t.replace("T","")); }
      return parseInt(k);
    };
    return Object.entries(agg).sort(([a],[b]) => ordenar(a) - ordenar(b)).map(([periodo,vals]) => ({ periodo, ...vals }));
  }, [filteredRecords, granularidade]);

  const kpis = useMemo(() => {
    const total25 = filteredRecords.filter((r) => parseBase(r.base)?.ano===2025 && parseBase(r.base)?.tipo==="Real").reduce((s,r) => s+(Number(r.quantidade)||0), 0);
    const total26real = filteredRecords.filter((r) => parseBase(r.base)?.ano===2026 && parseBase(r.base)?.tipo==="Real").reduce((s,r) => s+(Number(r.quantidade)||0), 0);
    const total26orc = filteredRecords.filter((r) => parseBase(r.base)?.tipo==="Orc").reduce((s,r) => s+(Number(r.quantidade)||0), 0);
    return { total25, total26real, total26orc, vsAno: variacao(total26real,total25), vsOrc: variacao(total26real,total26orc) };
  }, [filteredRecords]);

  const topDim = useMemo(() => {
    const agg: Record<string,number> = {};
    filteredRecords.filter((r) => parseBase(r.base)?.ano===2026 && parseBase(r.base)?.tipo==="Real").forEach((r) => {
      let k: string;
      if (dimensao==="Canal") k = r.segmento||"N/A";
      else if (dimensao==="Estado") k = r.uf||"N/A";
      else k = r.grupoClientes||r.cliente||"N/A";
      agg[k] = (agg[k]||0)+(Number(r.quantidade)||0);
    });
    return Object.entries(agg).sort(([,a],[,b]) => b-a).slice(0,8);
  }, [filteredRecords, dimensao]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px] text-muted-foreground">
      Carregando dados de tubetes...
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="bg-destructive/10 border border-destructive rounded-xl p-5 text-destructive">
        <strong>Erro ao carregar dados:</strong><br />{error}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div>
        <div className="text-xl font-extrabold text-foreground tracking-tight">📦 Evolução de Tubetes</div>
        <div className="text-sm text-muted-foreground mt-0.5">
          {records.length.toLocaleString("pt-BR")} registros · Comparativo 2025 vs 2026
        </div>
      </div>

      {/* FILTROS */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex gap-6 flex-wrap items-center">
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Granularidade</div>
            <div className="flex gap-1.5">
              {GRANULARIDADES.map((g) => (
                <button key={g} onClick={() => setGranularidade(g)}
                  className={`px-3 py-1 rounded-full text-xs border transition-colors ${granularidade === g ? 'border-primary bg-primary/10 text-primary font-bold' : 'border-border text-muted-foreground hover:text-foreground'}`}>
                  {g}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Ver por</div>
            <div className="flex gap-1.5">
              {DIMENSOES.map((d) => (
                <button key={d} onClick={() => { setDimensao(d); setSelectedDimValue("Todos"); }}
                  className={`px-3 py-1 rounded-full text-xs border transition-colors ${dimensao === d ? 'border-primary bg-primary/10 text-primary font-bold' : 'border-border text-muted-foreground hover:text-foreground'}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">{dimensao}</div>
            <select className="bg-background border border-border rounded-lg text-foreground px-3 py-1.5 text-xs cursor-pointer max-w-[220px]"
              value={selectedDimValue} onChange={(e) => setSelectedDimValue(e.target.value)}>
              {dimValues.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="ml-auto">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground">
              <input type="checkbox" checked={mostrarOrc} onChange={(e) => setMostrarOrc(e.target.checked)} className="accent-primary" />
              Mostrar Orçado 2026
            </label>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="flex gap-3 flex-wrap">
        <KpiCard label="Real 2025 (total)" value={kpis.total25} />
        <KpiCard label="Real 2026 (acum.)" value={kpis.total26real} pct={kpis.vsAno}
          sub={`vs 2025: ${kpis.vsAno!==null ? (kpis.vsAno>=0?"+":"")+kpis.vsAno.toFixed(1)+"%" : "—"}`} />
        <KpiCard label="Orçado 2026 (acum.)" value={kpis.total26orc} />
        <KpiCard label="Real vs Orçado" value={kpis.total26real - kpis.total26orc} pct={kpis.vsOrc} sub="diferença acumulada" />
      </div>

      {/* GRÁFICO LINHA */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3.5">
          Evolução — {granularidade} · {selectedDimValue==="Todos" ? `Todos os ${dimensao}s` : selectedDimValue}
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData} margin={{ top:10, right:20, bottom:0, left:10 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="periodo" tick={{ fontSize:10 }} className="text-muted-foreground" />
            <YAxis tick={{ fontSize:10 }} tickFormatter={formatNum} className="text-muted-foreground"
              label={{ value:"Tubetes", angle:-90, position:"insideLeft", style:{ fontSize:10 } }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize:11 }} />
            <Line type="monotone" dataKey="real25" name="Real 2025" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} strokeDasharray="4 4" />
            <Line type="monotone" dataKey="real26" name="Real 2026" stroke="hsl(var(--chart-2))" strokeWidth={2.5} dot={{ r:3 }} />
            {mostrarOrc && <Line type="monotone" dataKey="orc26" name="Orçado 2026" stroke="hsl(var(--chart-3))" strokeWidth={1.5} dot={false} strokeDasharray="2 4" />}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* GRÁFICO CRESCIMENTO YoY */}
      {granularidade !== "Anual" && (
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3.5">Crescimento Real 2026 vs 2025 (%)</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={chartData.map((d) => ({ periodo:d.periodo, crescimento: d.real25>0 ? ((d.real26-d.real25)/d.real25)*100 : 0 }))}
              margin={{ top:10, right:20, bottom:0, left:10 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="periodo" tick={{ fontSize:10 }} className="text-muted-foreground" />
              <YAxis tick={{ fontSize:10 }} tickFormatter={(v) => `${v.toFixed(0)}%`} className="text-muted-foreground" />
              <Tooltip content={<CustomTooltip valueFormatter={(v) => `${v.toFixed(1)}%`} />} />
              <ReferenceLine y={0} className="stroke-border" />
              <Bar dataKey="crescimento" name="Crescimento YoY" fill="hsl(var(--chart-4))" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* RANKING */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3.5">Top {dimensao}s — Real 2026</div>
        <div className="flex flex-col gap-2">
          {topDim.length===0 && <div className="text-muted-foreground text-xs">Nenhum dado de Real 2026 disponível.</div>}
          {topDim.map(([nome,val],i) => {
            const max = topDim[0]?.[1] || 1;
            return (
              <div key={nome} className="flex items-center gap-2.5">
                <div className="w-5 text-[11px] text-muted-foreground text-right">{i+1}</div>
                <div className="flex-1 text-xs text-foreground whitespace-nowrap overflow-hidden text-ellipsis">{nome}</div>
                <div className="flex-[2]">
                  <div className="h-1.5 rounded-full bg-muted">
                    <div className="h-1.5 rounded-full transition-all duration-400" style={{ width:`${(val/max)*100}%`, backgroundColor: i===0 ? 'hsl(var(--chart-1))' : 'hsl(var(--chart-2))' }} />
                  </div>
                </div>
                <div className="w-[72px] text-right text-xs font-bold text-foreground tabular-nums">{formatNum(val)}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* TABELA */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3.5">Tabela por período</div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-border">
                {["Período","Real 2025","Real 2026","Orçado 2026","Var. vs 2025","Var. vs Orç"].map((h) => (
                  <th key={h} className={`px-3 py-2 text-muted-foreground font-semibold text-[10px] uppercase tracking-wider ${h==="Período"?"text-left":"text-right"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chartData.map((row,i) => (
                <tr key={row.periodo} className={`border-b border-border ${i%2===0?'':'bg-muted/30'}`}>
                  <td className="px-3 py-1.5 font-semibold text-foreground">{row.periodo}</td>
                  <td className="px-3 py-1.5 text-right text-muted-foreground">{formatNum(row.real25)}</td>
                  <td className="px-3 py-1.5 text-right text-foreground font-bold">{formatNum(row.real26)}</td>
                  <td className="px-3 py-1.5 text-right text-muted-foreground">{formatNum(row.orc26)}</td>
                  <td className="px-3 py-1.5 text-right"><VarBadge pct={variacao(row.real26,row.real25)} /></td>
                  <td className="px-3 py-1.5 text-right"><VarBadge pct={variacao(row.real26,row.orc26)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
