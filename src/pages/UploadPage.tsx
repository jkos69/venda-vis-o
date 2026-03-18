import { useCallback, useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Trash2, Loader2 } from 'lucide-react';
import { parseExcelFile } from '@/lib/parseExcel';
import { useStore } from '@/store/useStore';
import { saveUploadToSupabase, clearSupabaseUploads } from '@/hooks/useSupabaseData';
import { useNavigate } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { UploadMeta } from '@/types/data';

export default function UploadPage() {
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<Record<string, any>[] | null>(null);
  const [rowCount, setRowCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState('');
  const [sheetInfo, setSheetInfo] = useState<{ sheetName: string; unmapped: string[] } | null>(null);
  const setData = useStore((s) => s.setData);
  const clearData = useStore((s) => s.clearData);
  const uploadMeta = useStore((s) => s.uploadMeta);
  const navigate = useNavigate();

  const processFile = useCallback(async (file: File) => {
    setError(null);
    setProcessing(true);
    setProgress(0);
    setFileName(file.name);

    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 15, 40));
    }, 150);

    try {
      const buffer = await file.arrayBuffer();
      const { data, preview: prev, unmappedColumns, sheetName } = parseExcelFile(buffer);
      clearInterval(interval);
      setProgress(50);
      setPreview(prev);
      setRowCount(data.length);
      setSheetInfo({ sheetName, unmapped: unmappedColumns });

      const meta: UploadMeta = {
        fileName: file.name,
        rowCount: data.length,
        sheetName,
        uploadedAt: new Date(),
      };

      // Salva no banco
      setSaving(true);
      setProgress(60);

      const progressInterval = setInterval(() => {
        setProgress((p) => Math.min(p + Math.random() * 5, 90));
      }, 300);

      const { error: saveError } = await saveUploadToSupabase(data, meta);
      clearInterval(progressInterval);

      if (saveError) {
        setError(`Erro ao salvar no banco: ${saveError}`);
        toast.error(`Erro ao salvar: ${saveError}`);
      } else {
        setProgress(100);
        setData(data, meta);
        toast.success(`${data.length.toLocaleString('pt-BR')} linhas carregadas e salvas com sucesso!`);
      }
    } catch (e: any) {
      clearInterval(interval);
      setProgress(0);
      setError(e.message || 'Erro ao processar arquivo');
    } finally {
      setProcessing(false);
      setSaving(false);
    }
  }, [setData]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleClearData = useCallback(async () => {
    await clearSupabaseUploads();
    clearData();
    setPreview(null);
    setRowCount(0);
    setSheetInfo(null);
    setFileName('');
    setProgress(0);
    toast.success('Dados removidos com sucesso.');
  }, [clearData]);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">Upload de Dados</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Importe a planilha Excel (.xlsx) com a base de vendas para análise.
          </p>
        </div>
        {(uploadMeta || preview) && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-lg hover:bg-destructive/20 transition-colors duration-150">
                <Trash2 className="h-4 w-4" />
                Limpar Dados
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remover todos os dados?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja remover todos os dados? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearData} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Sim, remover tudo
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
          transition-all duration-150
          ${dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'}
        `}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <input
          id="file-input"
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={handleFileInput}
        />
        <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-4" strokeWidth={1.5} />
        <p className="text-sm text-foreground font-medium">
          Arraste o arquivo .xlsx aqui ou clique para selecionar
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Suporta arquivos Excel com a aba "Base de Dados"
        </p>
      </div>

      {(processing || saving) && (
        <div className="space-y-3 p-4 rounded-lg bg-surface shadow-layered">
          <div className="flex items-center gap-3">
            <Loader2 className="h-4 w-4 text-primary animate-spin" />
            <span className="text-sm text-muted-foreground">
              {saving ? `Salvando ${fileName} no banco...` : `Processando ${fileName}...`}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
          <span className="text-sm text-destructive">{error}</span>
        </div>
      )}

      {preview && !processing && !saving && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <div>
                <p className="text-sm font-medium text-foreground">{fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {rowCount.toLocaleString('pt-BR')} linhas carregadas da aba "{sheetInfo?.sheetName}"
                </p>
                {sheetInfo && sheetInfo.unmapped.length > 0 && (
                  <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                    Colunas ignoradas: {sheetInfo.unmapped.join(', ')}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors duration-150"
            >
              Ir para Dashboard
            </button>
          </div>

          <div className="rounded-xl bg-surface shadow-layered overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Preview — primeiras 5 linhas
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    {Object.keys(preview[0] || {}).slice(0, 10).map((key) => (
                      <th key={key} className="px-3 py-2 text-left text-muted-foreground font-medium whitespace-nowrap">
                        {key}
                      </th>
                    ))}
                    {Object.keys(preview[0] || {}).length > 10 && (
                      <th className="px-3 py-2 text-left text-muted-foreground font-medium">...</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-accent/30 transition-colors duration-150">
                      {Object.values(row).slice(0, 10).map((val, j) => (
                        <td key={j} className="px-3 py-2 text-foreground whitespace-nowrap">
                          {String(val)}
                        </td>
                      ))}
                      {Object.keys(row).length > 10 && (
                        <td className="px-3 py-2 text-muted-foreground">...</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {uploadMeta && !preview && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-surface shadow-layered">
          <FileSpreadsheet className="h-5 w-5 text-primary shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Dados carregados: {uploadMeta.fileName}</p>
            <p className="text-xs text-muted-foreground">
              {uploadMeta.rowCount?.toLocaleString('pt-BR')} linhas | Importado em {new Date(uploadMeta.uploadedAt).toLocaleDateString('pt-BR')} às {new Date(uploadMeta.uploadedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
