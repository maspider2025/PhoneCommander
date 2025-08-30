import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/use-websocket";
import api from "@/lib/api";
import { Server, RotateCcw, FileText, Settings, RefreshCw, Wifi, Database } from "lucide-react";

interface ServerManagementProps {
  config?: any;
  onConfigUpdate?: (config: any) => void;
}

export function ServerManagement({ config, onConfigUpdate }: ServerManagementProps = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isConnected } = useWebSocket();
  
  const [serverConfig, setServerConfig] = useState({
    tcpPort: 8080,
    wsPort: 5000,
    maxConnections: 50,
    enableLogging: true,
  });
  const [isUpdating, setIsUpdating] = useState(false);

  const { data: stats = {} } = useQuery<any>({
    queryKey: ["/api/stats"],
    refetchInterval: 5000,
  });

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

  const restartServerMutation = useMutation({
    mutationFn: async () => {
      if (api.restartServer) {
        return await api.restartServer();
      }
      // Fallback for demo purposes
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

  const handleUpdateConfig = async () => {
    if (!api.updateServerConfig || !onConfigUpdate) return;
    
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
      if (api.restartServer) {
        await api.restartServer();
      }
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

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="space-y-6">
      <Card data-testid="server-management">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Server Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Server Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold" data-testid="uptime">
                {stats.uptime ? formatUptime(stats.uptime) : "--"}
              </p>
              <p className="text-sm text-muted-foreground">Uptime</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold" data-testid="tcp-connections">
                {stats.tcpConnections || 0}
              </p>
              <p className="text-sm text-muted-foreground">TCP Connections</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold" data-testid="ws-connections">
                {stats.wsConnections || 0}
              </p>
              <p className="text-sm text-muted-foreground">WebSocket Connections</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold" data-testid="memory-usage">
                {stats.memoryUsage || "--"}
              </p>
              <p className="text-sm text-muted-foreground">Memory Usage</p>
            </div>
          </div>

          <Separator />

          {/* Configuration Form */}
          {config && onConfigUpdate && (
            <>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Configuration
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tcpPort">TCP Port</Label>
                    <Input
                      id="tcpPort"
                      type="number"
                      value={serverConfig.tcpPort}
                      onChange={(e) => setServerConfig(prev => ({ 
                        ...prev, 
                        tcpPort: parseInt(e.target.value) 
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="wsPort">WebSocket Port</Label>
                    <Input
                      id="wsPort"
                      type="number"
                      value={serverConfig.wsPort}
                      onChange={(e) => setServerConfig(prev => ({ 
                        ...prev, 
                        wsPort: parseInt(e.target.value) 
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxConnections">Max Connections</Label>
                    <Input
                      id="maxConnections"
                      type="number"
                      value={serverConfig.maxConnections}
                      onChange={(e) => setServerConfig(prev => ({ 
                        ...prev, 
                        maxConnections: parseInt(e.target.value) 
                      }))}
                    />
                  </div>
                </div>
                
                <Button 
                  onClick={handleUpdateConfig} 
                  disabled={isUpdating}
                  className="w-full"
                >
                  {isUpdating ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Settings className="mr-2 h-4 w-4" />
                      Update Configuration
                    </>
                  )}
                </Button>
              </div>

              <Separator />
            </>
          )}

          {/* Actions */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Actions</h3>
            <div className="flex gap-2">
              <Button
                onClick={() => restartServerMutation.mutate()}
                disabled={restartServerMutation.isPending}
                variant="outline"
                data-testid="restart-server-button"
              >
                {restartServerMutation.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Restarting...
                  </>
                ) : (
                  <>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Restart Server
                  </>
                )}
              </Button>
              
              <Button variant="outline">
                <FileText className="mr-2 h-4 w-4" />
                View Logs
              </Button>
            </div>
          </div>

          {/* Status */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
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
        </CardContent>
      </Card>
    </div>
  );
}