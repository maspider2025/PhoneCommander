import { useState } from "react";
import type { ApkConfiguration } from "@shared/schema";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/use-websocket";
import { insertApkConfigurationSchema } from "@shared/schema";
import { Download, Settings, CheckCircle, AlertCircle } from "lucide-react";
import { useEffect } from "react";

export function APKGenerator() {
  const [config, setConfig] = useState({
    appName: "SmartControl Client",
    packageName: "com.smartcontrol.client",
    serverIP: window.location.hostname, // Default to current Replit domain
    serverPort: 8080, // Default port
    autoStart: true,
    hideIcon: false,
    enableLogging: true,
  });

  const [buildProgress, setBuildProgress] = useState<{
    stage: string;
    progress: number;
    message: string;
  } | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { lastMessage } = useWebSocket();

  const { data: apkConfigs = [] } = useQuery<ApkConfiguration[]>({
    queryKey: ["/api/apk-configs"],
    refetchInterval: 5000,
  });

  const createConfigMutation = useMutation({
    mutationFn: async (configData: any) => {
      const response = await apiRequest("POST", "/api/apk-configs", configData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/apk-configs"] });
    },
  });

  const buildApkMutation = useMutation({
    mutationFn: async (configId: string) => {
      const response = await apiRequest("POST", `/api/build-apk/${configId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "APK Build Started",
        description: "Building APK with your configuration...",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Build Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Listen for build progress updates
  useEffect(() => {
    if (lastMessage?.type === 'build_progress') {
      setBuildProgress(lastMessage.data);

      if (lastMessage.data.stage === 'completed') {
        toast({
          title: "APK Build Complete",
          description: "Your APK has been generated successfully!",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/apk-configs"] });
      }
    }
  }, [lastMessage, toast, queryClient]);

  const handleBuildAPK = async () => {
    try {
      // First create the configuration
      const newConfig = await createConfigMutation.mutateAsync(config);

      // Then start the build
      await buildApkMutation.mutateAsync(newConfig.id);
    } catch (error) {
      console.error("Build failed:", error);
    }
  };

  const downloadAPK = async (configId: string) => {
    try {
      const response = await fetch(`/api/download-apk/${configId}`);
      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${config.appName.replace(/\s+/g, '-')}-release.apk`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Download Started",
        description: "APK download has begun.",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download APK file.",
        variant: "destructive",
      });
    }
  };

  const latestConfig = apkConfigs.length > 0 ? apkConfigs[0] : null;
  const isBuilding = buildProgress?.stage !== 'completed' && buildProgress?.stage !== 'failed';

  return (
    <Card data-testid="apk-generator">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          APK Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="appName">App Name</Label>
              <Input
                id="appName"
                value={config.appName}
                onChange={(e) => setConfig({ ...config, appName: e.target.value })}
                placeholder="SmartControl Client"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="packageName">Package Name</Label>
              <Input
                id="packageName"
                value={config.packageName}
                onChange={(e) => setConfig({ ...config, packageName: e.target.value })}
                placeholder="com.smartcontrol.client"
              />
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-3">Server Configuration</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="serverIP" className="text-blue-800">Server IP/Domain</Label>
                <Input
                  id="serverIP"
                  value={config.serverIP}
                  onChange={(e) => setConfig({ ...config, serverIP: e.target.value })}
                  placeholder={window.location.hostname}
                  className="border-blue-300"
                />
                <p className="text-xs text-blue-600">
                  Use your Replit domain or VPS IP
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="serverPort" className="text-blue-800">TCP Port</Label>
                <Input
                  id="serverPort"
                  type="number"
                  value={config.serverPort}
                  onChange={(e) => setConfig({ ...config, serverPort: parseInt(e.target.value) || 8080 })}
                  placeholder="8080"
                  className="border-blue-300"
                />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setConfig({
                  ...config,
                  serverIP: window.location.hostname,
                  serverPort: 8080
                })}
                className="text-blue-700 border-blue-300"
              >
                Use Current Replit URL
              </Button>
              <div className="text-xs text-blue-600">
                Current: {window.location.hostname}:8080
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="autoStart"
              checked={config.autoStart}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, autoStart: !!checked }))}
              data-testid="checkbox-auto-start"
            />
            <Label htmlFor="autoStart" className="text-sm">Auto-start on boot</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="hideIcon"
              checked={config.hideIcon}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, hideIcon: !!checked }))}
              data-testid="checkbox-hide-icon"
            />
            <Label htmlFor="hideIcon" className="text-sm">Hide app icon</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="enableLogging"
              checked={config.enableLogging}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enableLogging: !!checked }))}
              data-testid="checkbox-enable-logging"
            />
            <Label htmlFor="enableLogging" className="text-sm">Enable logging</Label>
          </div>
        </div>

        <Button
          className="w-full"
          onClick={handleBuildAPK}
          disabled={isBuilding || createConfigMutation.isPending || buildApkMutation.isPending}
          data-testid="button-build-apk"
        >
          <Settings className="mr-2 h-4 w-4" />
          {isBuilding ? "Building APK..." : "Build APK"}
        </Button>

        {/* Build Status */}
        {buildProgress && (
          <div className="p-3 bg-muted rounded-md space-y-2">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                buildProgress.stage === 'completed' ? 'bg-green-500' :
                buildProgress.stage === 'failed' ? 'bg-red-500' :
                'bg-yellow-500 animate-pulse'
              }`}></div>
              <span className="text-sm font-medium">{buildProgress.message}</span>
            </div>
            <Progress value={buildProgress.progress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              Stage: {buildProgress.stage} ({buildProgress.progress}%)
            </p>
          </div>
        )}

        {/* Download Section */}
        {latestConfig?.buildStatus === 'completed' && latestConfig.apkPath && (
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-md">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium text-green-500">APK Ready</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              {latestConfig.appName} v1.0.0 ({(latestConfig.fileSize || 0 / 1024 / 1024).toFixed(1)} MB)
            </p>
            <Button
              size="sm"
              className="w-full"
              onClick={() => downloadAPK(latestConfig.id)}
              data-testid="button-download-apk"
            >
              <Download className="mr-2 h-4 w-4" />
              Download APK
            </Button>
          </div>
        )}

        {/* Error State */}
        {latestConfig?.buildStatus === 'failed' && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium text-red-500">Build Failed</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Please check your configuration and try again.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}