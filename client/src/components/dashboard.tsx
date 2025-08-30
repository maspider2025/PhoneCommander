
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeviceScreen } from "@/components/device-screen";
import { APKGenerator } from "@/components/apk-generator";
import { ConnectedDevicesList } from "@/components/connected-devices-list";
import { DeviceControlPanel } from "@/components/device-control-panel";
import { ServerManagement } from "@/components/server-management";
import { useWebSocket } from "@/hooks/use-websocket";
import api from "@/lib/api";
import type { Device } from "@shared/schema";
import { 
  Smartphone, 
  Server, 
  Download, 
  Settings, 
  Monitor,
  Wifi,
  WifiOff,
  Activity,
  Zap,
  Users,
  Shield,
  RefreshCw
} from "lucide-react";

export default function Dashboard() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [serverConfig, setServerConfig] = useState<any>(null);
  const { lastMessage, isConnected } = useWebSocket();

  useEffect(() => {
    // Load initial data
    loadDevices();
    loadServerConfig();
  }, []);

  useEffect(() => {
    // Handle WebSocket messages
    if (lastMessage?.type === 'devices_update') {
      setDevices(lastMessage.data.devices || []);
    } else if (lastMessage?.type === 'device_connected') {
      loadDevices(); // Refresh devices list
    } else if (lastMessage?.type === 'device_disconnected') {
      loadDevices(); // Refresh devices list
      // Clear selected device if it's the one that disconnected
      if (selectedDevice?.id === lastMessage.deviceId) {
        setSelectedDevice(null);
      }
    }
  }, [lastMessage, selectedDevice]);

  const loadDevices = async () => {
    try {
      const response = await api.getDevices();
      setDevices(response || []);
    } catch (error) {
      console.error("Failed to load devices:", error);
    }
  };

  const loadServerConfig = async () => {
    try {
      const config = await api.getServerConfig();
      setServerConfig(config);
    } catch (error) {
      console.error("Failed to load server config:", error);
    }
  };

  const connectedDevices = devices.filter(d => d.isConnected);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Professional Header */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200/50 dark:border-slate-700/50 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Smartphone className="text-white w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                  SmartControl Pro
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Enterprise Android Remote Management
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={isConnected ? "default" : "destructive"} className="px-3 py-1">
                <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-400' : 'bg-red-400'} ${isConnected ? 'animate-pulse' : ''}`} />
                {isConnected ? "Sistema Online" : "Desconectado"}
              </Badge>
              <Button variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-7xl">

        {/* Professional Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">Conexão WebSocket</CardTitle>
              <div className={`p-2 rounded-lg ${isConnected ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                {isConnected ? <Wifi className="h-4 w-4 text-green-600 dark:text-green-400" /> : <WifiOff className="h-4 w-4 text-red-600 dark:text-red-400" />}
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${isConnected ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {isConnected ? "Online" : "Offline"}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {isConnected ? "Tempo real ativo" : "Reconectando..."}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">Devices Conectados</CardTitle>
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{connectedDevices.length}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {devices.length - connectedDevices.length} offline • {devices.length} total
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">Servidor TCP</CardTitle>
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Server className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">:{serverConfig?.tcpPort || 8080}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Conexão reversa ativa
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">Device Selecionado</CardTitle>
              <div className={`p-2 rounded-lg ${selectedDevice ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-slate-100 dark:bg-slate-700/30'}`}>
                <Monitor className={`h-4 w-4 ${selectedDevice ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-lg font-bold truncate ${selectedDevice ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                {selectedDevice?.name || "Nenhum"}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {selectedDevice ? "Pronto para controlar" : "Selecione um device"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Professional Content Tabs */}
        <Tabs defaultValue="control" className="space-y-8">
          <TabsList className="grid w-full grid-cols-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm p-1 h-12 rounded-xl shadow-lg border-slate-200/50 dark:border-slate-700/50">
            <TabsTrigger value="control" className="rounded-lg font-medium data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white transition-all duration-200">
              <Monitor className="w-4 h-4 mr-2" />
              Controle Remoto
            </TabsTrigger>
            <TabsTrigger value="devices" className="rounded-lg font-medium data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white transition-all duration-200">
              <Users className="w-4 h-4 mr-2" />
              Devices
            </TabsTrigger>
            <TabsTrigger value="generator" className="rounded-lg font-medium data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-600 data-[state=active]:text-white transition-all duration-200">
              <Download className="w-4 h-4 mr-2" />
              APK Builder
            </TabsTrigger>
            <TabsTrigger value="server" className="rounded-lg font-medium data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:text-white transition-all duration-200">
              <Server className="w-4 h-4 mr-2" />
              Servidor
            </TabsTrigger>
          </TabsList>

          <TabsContent value="control" className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              <div className="xl:col-span-2">
                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-700/50 p-6">
                  {selectedDevice ? (
                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-semibold flex items-center gap-3">
                          <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                            <Smartphone className="w-5 h-5 text-white" />
                          </div>
                          Tela do Android
                        </h3>
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            <Activity className="w-3 h-3 mr-1 animate-pulse" />
                            Ao Vivo
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {selectedDevice.name}
                          </Badge>
                        </div>
                      </div>
                      <DeviceScreen device={selectedDevice} />
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <div className="mx-auto w-32 h-32 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 rounded-3xl flex items-center justify-center mb-8">
                        <Smartphone className="w-16 h-16 text-slate-400" />
                      </div>
                      <h3 className="text-2xl font-bold text-slate-700 dark:text-slate-300 mb-3">Nenhum Device Selecionado</h3>
                      <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
                        Escolha um device conectado para iniciar o controle remoto em tempo real com streaming de tela.
                      </p>
                      <Badge variant="secondary" className="text-lg px-4 py-2">
                        {connectedDevices.length} devices disponíveis
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-700/50 p-6">
                  <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                    <Users className="w-5 h-5 text-blue-600" />
                    Devices Online
                  </h3>
                  <ConnectedDevicesList 
                    devices={devices}
                    selectedDevice={selectedDevice}
                    onDeviceSelect={setSelectedDevice}
                  />
                </div>
                
                {selectedDevice && (
                  <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-700/50 p-6">
                    <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                      <Zap className="w-5 h-5 text-purple-600" />
                      Controles Avançados
                    </h3>
                    <DeviceControlPanel />
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="devices" className="space-y-6">
            <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-700/50 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  Gerenciamento de Devices
                </h2>
                <Badge variant="outline" className="text-lg px-4 py-2">
                  {devices.length} devices registrados
                </Badge>
              </div>
              <ConnectedDevicesList 
                devices={devices}
                selectedDevice={selectedDevice}
                onDeviceSelect={setSelectedDevice}
                showDetails={true}
              />
            </div>
          </TabsContent>

          <TabsContent value="generator" className="space-y-6">
            <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-700/50 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg">
                    <Download className="w-6 h-6 text-white" />
                  </div>
                  Gerador de APK
                </h2>
                <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                  Build em Tempo Real
                </Badge>
              </div>
              <APKGenerator />
            </div>
          </TabsContent>

          <TabsContent value="server" className="space-y-6">
            <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-700/50 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
                    <Server className="w-6 h-6 text-white" />
                  </div>
                  Configurações do Servidor
                </h2>
                <Badge variant="secondary" className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400">
                  TCP + WebSocket
                </Badge>
              </div>
              <ServerManagement 
                config={serverConfig}
                onConfigUpdate={setServerConfig}
              />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
