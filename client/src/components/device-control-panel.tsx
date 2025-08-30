import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Device } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { DeviceScreen } from "./device-screen";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  RefreshCw, 
  Home, 
  ArrowLeft, 
  Grid3x3, 
  Power, 
  VolumeX, 
  Volume2,
  Send,
  Video,
  Camera,
  Smartphone
} from "lucide-react";

export function DeviceControlPanel() {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [textInput, setTextInput] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: devices = [] } = useQuery<Device[]>({
    queryKey: ["/api/devices"],
    refetchInterval: 3000,
  });

  const { data: selectedDevice } = useQuery<Device>({
    queryKey: ["/api/devices", selectedDeviceId],
    enabled: !!selectedDeviceId,
    refetchInterval: 5000,
  });

  const connectedDevices = devices.filter((d: Device) => d.isConnected);

  const sendCommandMutation = useMutation({
    mutationFn: async ({ type, data }: { type: string; data?: any }) => {
      if (!selectedDeviceId) throw new Error("No device selected");
      
      const response = await apiRequest("POST", `/api/control/${selectedDeviceId}`, {
        type,
        data
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Command failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleQuickAction = (action: string) => {
    sendCommandMutation.mutate({
      type: "quick_action",
      data: { action }
    });
  };

  const handleTextSend = () => {
    if (!textInput.trim()) return;
    
    sendCommandMutation.mutate({
      type: "text",
      data: { text: textInput }
    });
    
    setTextInput("");
  };

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragPoints, setDragPoints] = useState<{ x: number; y: number }[]>([]);

  const handleTouchEvent = (x: number, y: number) => {
    sendCommandMutation.mutate({
      type: "touch",
      data: { x, y }
    });
  };

  const handleMouseDown = (x: number, y: number) => {
    setIsDragging(true);
    setDragStart({ x, y });
    setDragPoints([{ x, y }]);
  };

  const handleMouseMove = (x: number, y: number) => {
    if (isDragging && dragStart) {
      setDragPoints(prev => [...prev, { x, y }]);
    }
  };

  const handleMouseUp = (x: number, y: number) => {
    if (isDragging && dragStart) {
      const distance = Math.sqrt(
        Math.pow(x - dragStart.x, 2) + Math.pow(y - dragStart.y, 2)
      );

      if (distance > 10 && dragPoints.length > 2) {
        // Send drag gesture
        sendCommandMutation.mutate({
          type: "drag",
          data: { points: dragPoints }
        });
      } else if (distance < 10) {
        // Simple tap
        handleTouchEvent(x, y);
      } else {
        // Swipe gesture
        sendCommandMutation.mutate({
          type: "swipe",
          data: {
            startX: dragStart.x,
            startY: dragStart.y,
            endX: x,
            endY: y
          }
        });
      }
    }

    setIsDragging(false);
    setDragStart(null);
    setDragPoints([]);
  };

  const handleLongPress = (x: number, y: number) => {
    sendCommandMutation.mutate({
      type: "long_press",
      data: { x, y, duration: 1000 }
    });
  };

  const handleScreenshot = () => {
    sendCommandMutation.mutate({
      type: "screenshot"
    });
  };

  const refreshDevice = () => {
    if (selectedDeviceId) {
      queryClient.invalidateQueries({ queryKey: ["/api/devices", selectedDeviceId] });
    }
  };

  return (
    <Card data-testid="device-control-panel">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Device Control</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={selectedDeviceId} onValueChange={setSelectedDeviceId}>
              <SelectTrigger className="w-64" data-testid="select-device">
                <SelectValue placeholder="Select a device" />
              </SelectTrigger>
              <SelectContent>
                {connectedDevices.map((device) => (
                  <SelectItem key={device.id} value={device.id}>
                    {device.name} - {device.deviceModel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={refreshDevice} data-testid="button-refresh-device">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {selectedDevice ? (
          <div className="flex gap-6">
            {/* Device Screen */}
            <div className="flex-shrink-0">
              <DeviceScreen device={selectedDevice} />
              
              {/* Device Info */}
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  <span className={`font-medium ${selectedDevice.isConnected ? 'text-green-500' : 'text-red-500'}`}>
                    {selectedDevice.isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Battery:</span>
                  <span data-testid="device-battery">{selectedDevice.batteryLevel}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Android:</span>
                  <span data-testid="device-android-version">{selectedDevice.androidVersion}</span>
                </div>
              </div>
            </div>
            
            {/* Control Panel */}
            <div className="flex-1 space-y-4">
              {/* Quick Actions */}
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-3">Quick Actions</h4>
                <div className="grid grid-cols-3 gap-2">
                  <Button 
                    variant="outline" 
                    className="flex flex-col items-center gap-1 h-auto py-3"
                    onClick={() => handleQuickAction("home")}
                    data-testid="button-home"
                  >
                    <Home className="h-4 w-4" />
                    <span className="text-xs">Home</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex flex-col items-center gap-1 h-auto py-3"
                    onClick={() => handleQuickAction("back")}
                    data-testid="button-back"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="text-xs">Back</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex flex-col items-center gap-1 h-auto py-3"
                    onClick={() => handleQuickAction("recent")}
                    data-testid="button-recent"
                  >
                    <Grid3x3 className="h-4 w-4" />
                    <span className="text-xs">Recent</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex flex-col items-center gap-1 h-auto py-3"
                    onClick={() => handleQuickAction("power")}
                    data-testid="button-power"
                  >
                    <Power className="h-4 w-4" />
                    <span className="text-xs">Power</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex flex-col items-center gap-1 h-auto py-3"
                    onClick={() => handleQuickAction("volume_up")}
                    data-testid="button-volume-up"
                  >
                    <Volume2 className="h-4 w-4" />
                    <span className="text-xs">Vol+</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex flex-col items-center gap-1 h-auto py-3"
                    onClick={() => handleQuickAction("volume_down")}
                    data-testid="button-volume-down"
                  >
                    <VolumeX className="h-4 w-4" />
                    <span className="text-xs">Vol-</span>
                  </Button>
                </div>
              </div>
              
              {/* Text Input */}
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-3">Text Input</h4>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Type text to send..."
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleTextSend()}
                    data-testid="input-text"
                  />
                  <Button onClick={handleTextSend} data-testid="button-send-text">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Screen Recording */}
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-3">Screen Recording</h4>
                <div className="flex items-center gap-3">
                  <Button variant="destructive" className="gap-2" data-testid="button-start-recording">
                    <Video className="h-4 w-4" />
                    Start Recording
                  </Button>
                  <Button variant="outline" className="gap-2" onClick={handleScreenshot} data-testid="button-screenshot">
                    <Camera className="h-4 w-4" />
                    Screenshot
                  </Button>
                </div>
              </div>
              
              {/* Connection Status */}
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-3">Connection Status</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">TCP Connection:</span>
                    <span className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${selectedDevice.isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className={selectedDevice.isConnected ? 'text-green-500' : 'text-red-500'}>
                        {selectedDevice.isConnected ? 'Active' : 'Inactive'}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Address:</span>
                    <span data-testid="device-address">
                      {selectedDevice.tcpAddress}:{selectedDevice.tcpPort}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Last Seen:</span>
                    <span data-testid="device-last-seen">
                      {selectedDevice.lastSeen ? new Date(selectedDevice.lastSeen).toLocaleTimeString() : 'Never'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <Smartphone className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Device Selected</h3>
            <p className="text-muted-foreground">
              Select a connected device from the dropdown above to start controlling it.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
