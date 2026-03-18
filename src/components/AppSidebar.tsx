import { BarChart3, Building2, Radio, Users, Package, MapPin, TrendingUp, Upload, Database } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useStore } from '@/store/useStore';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';

const navItems = [
  { title: 'Dashboard P&L', url: '/', icon: BarChart3 },
  { title: 'Por BU', url: '/bu', icon: Building2 },
  { title: 'Por Canal', url: '/canal', icon: Radio },
  { title: 'Por Cliente', url: '/cliente', icon: Users },
  { title: 'Por Produto', url: '/produto', icon: Package },
  { title: 'Por Geografia', url: '/geografia', icon: MapPin },
  { title: 'Evolução Mensal', url: '/evolucao', icon: TrendingUp },
];

const configItems = [
  { title: 'Upload de Dados', url: '/upload', icon: Upload },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const uploadMeta = useStore((s) => s.uploadMeta);

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent className="flex flex-col h-full overflow-hidden">
        {/* Logo — fixo */}
        <div className="px-4 py-5 shrink-0">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-foreground tracking-tight">OdontoBI</h1>
                <p className="text-[10px] text-muted-foreground">Performance Comercial</p>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="flex justify-center">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-primary-foreground" />
              </div>
            </div>
          )}
        </div>

        {/* Navegação — scrollável */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">
              Análises
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === '/'}
                        className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-150"
                        activeClassName="bg-accent text-foreground font-medium"
                      >
                        <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">
              Configurações
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {configItems.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-150"
                        activeClassName="bg-accent text-foreground font-medium"
                      >
                        <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>

        {/* Status badge + footer — fixo */}
        {!collapsed && uploadMeta && (
          <div className="shrink-0 px-4 py-3 border-t border-border space-y-2">
            <div className="flex items-center gap-2">
              <Database className="h-3.5 w-3.5 text-success shrink-0" />
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-success/15 text-success border-0 font-medium">
                Dados carregados
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground/60 truncate">
              {uploadMeta.fileName}
            </p>
            <p className="text-[10px] text-muted-foreground/60">
              {uploadMeta.rowCount?.toLocaleString('pt-BR')} linhas | {new Date(uploadMeta.uploadedAt).toLocaleDateString('pt-BR')}
            </p>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
