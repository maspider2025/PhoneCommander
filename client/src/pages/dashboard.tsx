import { useQuery } from "@tanstack/react-query";
import type { Device, Session, ApkConfiguration } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DeviceControlPanel } from "@/components/device-control-panel";
import { ConnectedDevicesList } from "@/components/connected-devices-list";
import { APKGenerator } from "@/components/apk-generator";
import { ActivityLog } from "@/components/activity-log";
import { SystemControls } from "@/components/system-controls";
import { ServerManagement } from "@/components/server-management";
import { APIStatusTable } from "@/components/api-status-table";
import { useWebSocket } from "@/hooks/use-websocket";
import { 
  Home, 
  Smartphone, 
  Download, 
  TrendingUp, 
  Settings,
  User,
  LogOut,
  Plus,
  Server,
  Activity,
  Eye,
  Clock
} from "lucide-react";

export default function Dashboard() {
  const { data: stats = {} } = useQuery<any>({
    queryKey: ["/api/stats"],
    refetchInterval: 5000,
  });

  const { data: devices = [] } = useQuery<Device[]>({
    queryKey: ["/api/devices"],
    refetchInterval: 3000,
  });

  const { data: sessions = [] } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
    refetchInterval: 3000,
  });

  const { data: apkConfigs = [] } = useQuery<ApkConfiguration[]>({
    queryKey: ["/api/apk-configs"],
    refetchInterval: 5000,
  });

  const { isConnected } = useWebSocket();

  const connectedDevices = devices.filter((d: Device) => d.isConnected);
  const activeSessions = sessions.filter((s: Session) => s.isActive);
  const completedBuilds = apkConfigs.filter((c: ApkConfiguration) => c.buildStatus === "completed");

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Smartphone className="text-primary-foreground text-sm" />
            </div>
            <div>
              <h1 className="font-bold text-lg">SmartControl</h1>
              <p className="text-xs text-muted-foreground">Pro Dashboard</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            <li>
              <Button 
                variant="default" 
                className="w-full justify-start gap-3"
                data-testid="nav-dashboard"
              >
                <Home className="w-4 h-4" />
                Dashboard
              </Button>
            </li>
            <li>
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-3 text-muted-foreground hover:bg-muted hover:text-foreground"
                data-testid="nav-devices"
              >
                <Smartphone className="w-4 h-4" />
                Devices
                <span className="ml-auto bg-accent text-accent-foreground text-xs px-2 py-1 rounded-full">
                  {connectedDevices.length}
                </span>
              </Button>
            </li>
            <li>
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-3 text-muted-foreground hover:bg-muted hover:text-foreground"
                data-testid="nav-apk-manager"
              >
                <Download className="w-4 h-4" />
                APK Manager
              </Button>
            </li>
            <li>
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-3 text-muted-foreground hover:bg-muted hover:text-foreground"
                data-testid="nav-analytics"
              >
                <TrendingUp className="w-4 h-4" />
                Analytics
              </Button>
            </li>
            <li>
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-3 text-muted-foreground hover:bg-muted hover:text-foreground"
                data-testid="nav-settings"
              >
                <Settings className="w-4 h-4" />
                Settings
              </Button>
            </li>
          </ul>
        </nav>
        
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
              <User className="text-secondary-foreground text-xs" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Admin User</p>
              <p className="text-xs text-muted-foreground">admin@company.com</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="button-logout">
              <LogOut className="text-muted-foreground text-sm" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold" data-testid="page-title">Device Control Center</h2>
            <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-full">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className="text-sm text-muted-foreground">
                {isConnected ? 'System Online' : 'System Offline'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Button className="gap-2" data-testid="button-generate-apk">
              <Plus className="w-4 h-4" />
              Generate APK
            </Button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Server className="w-4 h-4" />
              <span data-testid="server-status">tcp://localhost:8080</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card data-testid="stat-connected-devices">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Connected Devices</p>
                    <p className="text-2xl font-bold">{stats?.connectedDevices || 0}</p>
                  </div>
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Smartphone className="text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card data-testid="stat-active-sessions">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Sessions</p>
                    <p className="text-2xl font-bold">{stats?.activeSessions || 0}</p>
                  </div>
                  <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                    <Eye className="text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card data-testid="stat-apks-generated">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">APKs Generated</p>
                    <p className="text-2xl font-bold">{stats?.apksGenerated || 0}</p>
                  </div>
                  <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                    <Download className="text-accent" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card data-testid="stat-uptime">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Uptime</p>
                    <p className="text-2xl font-bold">
                      {stats?.uptime ? formatUptime(stats.uptime) : '0h 0m'}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                    <Clock className="text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Device Control Panel */}
            <div className="xl:col-span-2">
              <DeviceControlPanel />
            </div>
            
            {/* Right Sidebar */}
            <div className="space-y-6">
              <ConnectedDevicesList />
              <APKGenerator />
              <ActivityLog />
            </div>
          </div>
          
          {/* Advanced Controls Section */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SystemControls />
            <ServerManagement />
          </div>
          
          {/* API Status Table */}
          <div className="mt-8">
            <APIStatusTable />
          </div>
        </div>
      </main>
    </div>
  );
}
