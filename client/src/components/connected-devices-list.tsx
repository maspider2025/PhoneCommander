import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { Device } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Smartphone, Wifi, WifiOff, Monitor, Battery, Signal, ExternalLink } from "lucide-react";

interface ConnectedDevicesListProps {
  devices?: Device[];
  selectedDevice?: Device | null;
  onDeviceSelect?: (device: Device) => void;
  showDetails?: boolean;
}

export function ConnectedDevicesList({ 
  devices: propDevices, 
  selectedDevice, 
  onDeviceSelect, 
  showDetails = false 
}: ConnectedDevicesListProps = {}) {
  // If devices are passed as props, use them; otherwise fetch from API
  const { data: fetchedDevices = [] } = useQuery<Device[]>({
    queryKey: ["/api/devices"],
    refetchInterval: 3000,
    enabled: !propDevices, // Only fetch if no devices provided via props
  });

  const devices = propDevices || fetchedDevices;
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
          Connected Devices ({connectedDevices.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {devices.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Smartphone className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No devices found</p>
            <p className="text-sm">Generate and install an APK to connect devices</p>
          </div>
        ) : connectedDevices.length > 0 ? (
          <div className="space-y-3">
            {connectedDevices.map((device) => (
              <div
                key={device.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedDevice?.id === device.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                } ${onDeviceSelect ? 'cursor-pointer' : ''}`}
                onClick={() => onDeviceSelect?.(device)}
                data-testid={`device-item-${device.id}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    <span className="font-medium" data-testid={`device-name-${device.id}`}>
                      {device.name}
                    </span>
                  </div>
                  <Badge variant={device.isConnected ? "default" : "secondary"}>
                    {device.isConnected ? (
                      <><Wifi className="h-3 w-3 mr-1" />Online</>
                    ) : (
                      <><WifiOff className="h-3 w-3 mr-1" />Offline</>
                    )}
                  </Badge>
                </div>

                <div className="text-sm text-muted-foreground space-y-1">
                  <p data-testid={`device-info-${device.id}`}>
                    Android {device.androidVersion} • {device.deviceModel}
                  </p>
                  {device.packageName && (
                    <Badge variant="outline" className="text-xs">
                      {device.packageName}
                    </Badge>
                  )}
                </div>

                {showDetails && (
                  <>
                    <Separator className="my-3" />
                    <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Monitor className="h-3 w-3" />
                        {device.screenWidth}×{device.screenHeight}
                      </div>
                      <div className="flex items-center gap-2">
                        <Battery className="h-3 w-3" />
                        {device.batteryLevel || 0}%
                      </div>
                      <div className="flex items-center gap-2">
                        <Signal className="h-3 w-3" />
                        {device.androidVersion}
                      </div>
                      <div className="text-xs">
                        {device.deviceModel}
                      </div>
                    </div>
                    
                    {device.lastSeen && (
                      <div className="mt-3 pt-2 border-t text-xs text-muted-foreground">
                        Last seen: {new Date(device.lastSeen).toLocaleString()}
                      </div>
                    )}
                  </>
                )}

                {!showDetails && onDeviceSelect && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeviceSelect(device);
                    }}
                    data-testid={`button-select-device-${device.id}`}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Control Device
                  </Button>
                )}
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