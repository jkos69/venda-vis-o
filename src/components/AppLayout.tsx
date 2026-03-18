import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useStore } from '@/store/useStore';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const uploadMeta = useStore((s) => s.uploadMeta);
  const filters = useStore((s) => s.filters);

  const mesLabel = filters.mes === 'acumulado' ? 'Acumulado' : `Mês ${String(filters.mes).padStart(2, '0')}`;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center justify-between border-b border-border px-4 shrink-0">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <span className="text-xs text-muted-foreground">
                Performance Comercial — {mesLabel}
              </span>
            </div>
            {uploadMeta && (
              <span className="text-[10px] text-muted-foreground/50">
                Atualizado em {uploadMeta.uploadedAt.toLocaleDateString('pt-BR')} às {uploadMeta.uploadedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </header>
          <main className="flex-1 overflow-auto p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
