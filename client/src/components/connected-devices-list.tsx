import { useQuery } from "@tanstack/react-query";
import type { Device } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Smartphone, ExternalLink } from "lucide-react";

export function ConnectedDevicesList() {
  const { data: devices = [] } = useQuery<Device[]>({
    queryKey: ["/api/devices"],
    refetchInterval: 3000,
  });

  const connectedDevices = devices.filter((d: Device) => d.isConnected);

  const getStatusColor = (isConnected: boolean) => {
    return isConnected ? 'bg-green-500' : 'bg-yellow-500';
  };

  const getStatusText = (isConnected: boolean) => {
    return isConnected ? 'Connected' : 'Disconnected';
  };

  return (
    <Card data-testid="connected-devices-list">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Connected Devices
        </CardTitle>
      </CardHeader>
      <CardContent>
        {connectedDevices.length > 0 ? (
          <div className="space-y-3">
            {connectedDevices.map((device) => (
              <div
                key={device.id}
                className="flex items-center gap-3 p-3 bg-muted rounded-lg"
                data-testid={`device-item-${device.id}`}
              >
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Smartphone className="text-primary h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm" data-testid={`device-name-${device.id}`}>
                    {device.name}
                  </p>
                  <p className="text-xs text-muted-foreground" data-testid={`device-info-${device.id}`}>
                    Android {device.androidVersion} • {device.deviceModel}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {device.packageName}
                    </Badge>
                    {device.batteryLevel !== null && (
                      <span className="text-xs text-muted-foreground">
                        Battery: {device.batteryLevel}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(device.isConnected)}`}></div>
                    <span className="text-xs text-muted-foreground">
                      {getStatusText(device.isConnected)}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    data-testid={`button-select-device-${device.id}`}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <Smartphone className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No devices connected</p>
            <p className="text-xs text-muted-foreground mt-1">
              Install and run the APK on your Android device to connect
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
