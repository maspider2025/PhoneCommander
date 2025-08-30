
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DeviceScreen } from "@/components/device-screen";
import { ApkGenerator } from "@/components/apk-generator";
import { ConnectedDevicesList } from "@/components/connected-devices-list";
import { DeviceControlPanel } from "@/components/device-control-panel";
import { ServerManagement } from "@/components/server-management";
import { useWebSocket } from "@/hooks/use-websocket";
import api from "@/lib/api";
import type { Device } from "@shared/schema";
import { Smartphone, Server, Download, Settings } from "lucide-react";

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
      setDevices(response.devices || []);
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
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Android Remote Control Dashboard</h1>
        <p className="text-muted-foreground">
          Manage and control Android devices remotely in real-time
        </p>
      </div>

      {/* Status Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">WebSocket</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge variant={isConnected ? "default" : "destructive"}>
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connected Devices</CardTitle>
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{connectedDevices.length}</div>
            <p className="text-xs text-muted-foreground">
              {devices.length - connectedDevices.length} offline
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">TCP Server</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">:8080</div>
            <p className="text-xs text-muted-foreground">
              Port {serverConfig?.tcpPort || 8080}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selected Device</CardTitle>
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">
              {selectedDevice?.name || "None"}
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedDevice ? "Ready to control" : "Select a device"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="control" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="control">Device Control</TabsTrigger>
          <TabsTrigger value="devices">Devices</TabsTrigger>
          <TabsTrigger value="generator">APK Generator</TabsTrigger>
          <TabsTrigger value="server">Server</TabsTrigger>
        </TabsList>

        <TabsContent value="control" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              {selectedDevice ? (
                <DeviceScreen device={selectedDevice} />
              ) : (
                <Card className="p-8 text-center">
                  <Smartphone className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">No Device Selected</h3>
                  <p className="text-muted-foreground mb-4">
                    Choose a device from the devices list to start controlling it
                  </p>
                  <Badge variant="secondary">{connectedDevices.length} devices available</Badge>
                </Card>
              )}
            </div>
            
            <div className="space-y-4">
              <ConnectedDevicesList 
                devices={devices}
                selectedDevice={selectedDevice}
                onDeviceSelect={setSelectedDevice}
              />
              
              {selectedDevice && (
                <DeviceControlPanel device={selectedDevice} />
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="devices">
          <ConnectedDevicesList 
            devices={devices}
            selectedDevice={selectedDevice}
            onDeviceSelect={setSelectedDevice}
            showDetails={true}
          />
        </TabsContent>

        <TabsContent value="generator">
          <ApkGenerator />
        </TabsContent>

        <TabsContent value="server">
          <ServerManagement 
            config={serverConfig}
            onConfigUpdate={setServerConfig}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
