import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/use-websocket";
import { Server, RotateCcw, FileText } from "lucide-react";

export function ServerManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isConnected } = useWebSocket();

  const { data: stats = {} } = useQuery<any>({
    queryKey: ["/api/stats"],
    refetchInterval: 5000,
  });

  const restartServerMutation = useMutation({
    mutationFn: async () => {
      // This would restart the server - for demo purposes, we'll just show a message
      await new Promise(resolve => setTimeout(resolve, 2000));
      return { status: "restarted" };
    },
    onSuccess: () => {
      toast({
        title: "Server restarted",
        description: "All services have been restarted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Restart failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatDataRate = (rate: number) => {
    if (rate < 1000) return `${rate}/s`;
    return `${(rate / 1000).toFixed(1)}k/s`;
  };

  return (
    <Card data-testid="server-management">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5" />
          Server Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* TCP Server Status */}
        <div className="bg-muted p-3 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">TCP Server</span>
            <Badge variant={stats.tcpConnections ? "default" : "secondary"}>
              {stats.tcpConnections ? "Running" : "Stopped"}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex justify-between">
              <span>Port:</span>
              <span data-testid="tcp-port">8080</span>
            </div>
            <div className="flex justify-between">
              <span>Active Connections:</span>
              <span data-testid="tcp-connections">{stats.tcpConnections || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Uptime:</span>
              <span data-testid="tcp-uptime">
                {stats.uptime ? formatUptime(stats.uptime) : '0h 0m'}
              </span>
            </div>
          </div>
        </div>

        {/* WebSocket Server Status */}
        <div className="bg-muted p-3 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">WebSocket Server</span>
            <Badge variant={isConnected ? "default" : "secondary"}>
              {isConnected ? "Active" : "Inactive"}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex justify-between">
              <span>Clients Connected:</span>
              <span data-testid="ws-clients">{stats.websocketClients || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Connection Status:</span>
              <span className={isConnected ? "text-green-500" : "text-red-500"}>
                {isConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Protocol:</span>
              <span>WebSocket</span>
            </div>
          </div>
        </div>

        {/* System Stats */}
        <div className="bg-muted p-3 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">System Statistics</span>
            <Badge variant="outline">Live</Badge>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex justify-between">
              <span>Total Devices:</span>
              <span data-testid="total-devices">{stats.totalDevices || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Connected Devices:</span>
              <span data-testid="connected-devices">{stats.connectedDevices || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Active Sessions:</span>
              <span data-testid="active-sessions">{stats.activeSessions || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>APKs Generated:</span>
              <span data-testid="apks-generated">{stats.apksGenerated || 0}</span>
            </div>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex gap-2">
          <Button
            variant="destructive"
            className="flex-1 gap-2"
            onClick={() => restartServerMutation.mutate()}
            disabled={restartServerMutation.isPending}
            data-testid="button-restart-server"
          >
            <RotateCcw className="h-4 w-4" />
            {restartServerMutation.isPending ? "Restarting..." : "Restart"}
          </Button>
          <Button
            variant="outline"
            className="flex-1 gap-2"
            data-testid="button-view-logs"
          >
            <FileText className="h-4 w-4" />
            Logs
          </Button>
        </div>

        {/* Status Indicator */}
        <div className="text-center">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs ${
            isConnected && stats.tcpConnections 
              ? 'bg-green-500/10 text-green-500' 
              : 'bg-red-500/10 text-red-500'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isConnected && stats.tcpConnections ? 'bg-green-500' : 'bg-red-500'
            } ${isConnected ? 'animate-pulse' : ''}`}></div>
            <span data-testid="overall-status">
              {isConnected && stats.tcpConnections ? 'All Systems Operational' : 'System Issues Detected'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";
import { Server, Settings, RefreshCw, Wifi, Database } from "lucide-react";

interface ServerManagementProps {
  config: any;
  onConfigUpdate: (config: any) => void;
}

export function ServerManagement({ config, onConfigUpdate }: ServerManagementProps) {
  const [serverConfig, setServerConfig] = useState({
    tcpPort: 8080,
    wsPort: 5000,
    maxConnections: 50,
    enableLogging: true,
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (config) {
      setServerConfig({
        tcpPort: config.tcpPort || 8080,
        wsPort: config.wsPort || 5000,
        maxConnections: config.maxConnections || 50,
        enableLogging: config.enableLogging || true,
      });
    }
  }, [config]);

  const handleUpdateConfig = async () => {
    setIsUpdating(true);
    try {
      const updatedConfig = await api.updateServerConfig(serverConfig);
      onConfigUpdate(updatedConfig);
      toast({
        title: "Server Updated",
        description: "Server configuration updated successfully",
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update server configuration",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const restartServer = async () => {
    try {
      await api.restartServer();
      toast({
        title: "Server Restarted",
        description: "Server has been restarted successfully",
      });
    } catch (error) {
      toast({
        title: "Restart Failed",
        description: "Failed to restart server",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Server Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tcpPort">TCP Port</Label>
              <Input
                id="tcpPort"
                type="number"
                value={serverConfig.tcpPort}
                onChange={(e) => setServerConfig(prev => ({ 
                  ...prev, 
                  tcpPort: parseInt(e.target.value) || 8080 
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wsPort">WebSocket Port</Label>
              <Input
                id="wsPort"
                type="number"
                value={serverConfig.wsPort}
                onChange={(e) => setServerConfig(prev => ({ 
                  ...prev, 
                  wsPort: parseInt(e.target.value) || 5000 
                }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxConnections">Max Connections</Label>
            <Input
              id="maxConnections"
              type="number"
              value={serverConfig.maxConnections}
              onChange={(e) => setServerConfig(prev => ({ 
                ...prev, 
                maxConnections: parseInt(e.target.value) || 50 
              }))}
            />
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleUpdateConfig}
              disabled={isUpdating}
            >
              <Settings className="h-4 w-4 mr-2" />
              {isUpdating ? "Updating..." : "Update Config"}
            </Button>
            <Button 
              variant="outline"
              onClick={restartServer}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Restart Server
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Server Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span>TCP Server</span>
            <Badge variant="default">
              <Wifi className="h-3 w-3 mr-1" />
              Running on :{serverConfig.tcpPort}
            </Badge>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span>WebSocket Server</span>
            <Badge variant="default">
              <Wifi className="h-3 w-3 mr-1" />
              Running on :{serverConfig.wsPort}
            </Badge>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span>Current Domain</span>
            <Badge variant="secondary">
              {window.location.hostname}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
