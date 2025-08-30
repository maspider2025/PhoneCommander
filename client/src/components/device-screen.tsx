import { useRef, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { useWebSocket } from "@/hooks/use-websocket";
import type { Device } from "@shared/schema";
import { Smartphone, Camera, RotateCcw, ArrowLeft, Home, Grid3x3, VolumeX, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";

interface DeviceScreenProps {
  device: Device;
}

export function DeviceScreen({ device }: DeviceScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { lastMessage } = useWebSocket();
  const [isInteracting, setIsInteracting] = useState(false);
  const [screenData, setScreenData] = useState<{ width: number; height: number } | null>(null);

  // Extracted deviceId, deviceWidth, deviceHeight, and isMouseDown from the context or component props
  // For this example, let's assume they are available within the component scope.
  // If they are managed by a global state or context, you would access them here.
  const deviceId = device.id; // Assuming device.id is directly accessible
  const deviceWidth = device.screenWidth; // Assuming device.screenWidth is available
  const deviceHeight = device.screenHeight; // Assuming device.screenHeight is available
  const [isMouseDown, setIsMouseDown] = useState(false); // Assuming this state is needed for mouse interaction


  useEffect(() => {
    if (lastMessage?.type === 'screen_update' && lastMessage.deviceId === device.id) {
      const canvas = canvasRef.current;
      if (canvas && lastMessage.data?.imageData) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const img = new Image();
          img.onload = () => {
            // Store original screen dimensions
            setScreenData({ width: img.width, height: img.height });

            // Calculate display size maintaining aspect ratio
            const maxWidth = 300;
            const maxHeight = 600;
            const aspectRatio = img.width / img.height;

            let displayWidth = maxWidth;
            let displayHeight = maxWidth / aspectRatio;

            if (displayHeight > maxHeight) {
              displayHeight = maxHeight;
              displayWidth = maxHeight * aspectRatio;
            }

            canvas.width = displayWidth;
            canvas.height = displayHeight;
            canvas.style.width = `${displayWidth}px`;
            canvas.style.height = `${displayHeight}px`;

            ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
          };
          img.src = `data:image/jpeg;base64,${lastMessage.data.imageData}`;
        }
      }
    }
  }, [lastMessage, device.id]);

  const sendControlCommand = async (type: string, data: any) => {
    try {
      await api.post(`/api/control/${device.id}`, { type, data });
    } catch (error) {
      console.error("Failed to send control command:", error);
    }
  };

  const handleCanvasInteraction = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const rect = canvas?.getBoundingClientRect();

    if (!canvas || !rect || !screenData) return;

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Convert canvas coordinates to device coordinates
    const scaleX = screenData.width / canvas.width;
    const scaleY = screenData.height / canvas.height;

    const deviceX = Math.round(x * scaleX);
    const deviceY = Math.round(y * scaleY);

    if (event.type === 'mousedown') {
      setIsInteracting(true);
      sendControlCommand("touch", { x: deviceX, y: deviceY, action: "down" });
    } else if (event.type === 'mouseup') {
      setIsInteracting(false);
      sendControlCommand("touch", { x: deviceX, y: deviceY, action: "up" });
    } else if (event.type === 'mousemove' && isInteracting) {
      sendControlCommand("touch", { x: deviceX, y: deviceY, action: "move" });
    }
  };

  const handleQuickAction = (action: string) => {
    sendControlCommand("quick_action", { action });
  };

  const takeScreenshot = () => {
    sendControlCommand("screenshot", {});
  };

  const handleMouseDown = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!deviceId) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert to device coordinates
    const deviceX = Math.round(x * (deviceWidth / rect.width));
    const deviceY = Math.round(y * (deviceHeight / rect.height));

    setIsMouseDown(true);
    await api.sendTouch(deviceId, deviceX, deviceY, 'down');
  };

  const handleMouseMove = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!deviceId || !isMouseDown) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert to device coordinates
    const deviceX = Math.round(x * (deviceWidth / rect.width));
    const deviceY = Math.round(y * (deviceHeight / rect.height));

    await api.sendTouch(deviceId, deviceX, deviceY, 'move');
  };

  const handleMouseUp = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!deviceId) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert to device coordinates
    const deviceX = Math.round(x * (deviceWidth / rect.width));
    const deviceY = Math.round(y * (deviceHeight / rect.height));

    setIsMouseDown(false);
    await api.sendTouch(deviceId, deviceX, deviceY, 'up');
  };


  return (
    <Card className="p-4 bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          <span className="font-medium">{device.name}</span>
          <div className={`w-2 h-2 rounded-full ${device.isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={takeScreenshot}>
            <Camera className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleQuickAction("rotate")}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Phone Frame */}
      <div className="mx-auto" style={{ width: 'fit-content' }}>
        <div className="bg-gray-800 rounded-3xl p-6 shadow-2xl">
          {/* Screen */}
          <div
            ref={containerRef}
            className="bg-black rounded-2xl overflow-hidden border-2 border-gray-700 relative"
            style={{ width: '300px', height: '600px' }}
          >
            <canvas
              ref={canvasRef}
              className="cursor-pointer w-full h-full object-contain"
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setIsInteracting(false)}
              style={{ imageRendering: 'crisp-edges' }}
            />

            {/* Connection status overlay */}
            {!device.isConnected && (
              <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
                <div className="text-white text-center">
                  <Smartphone className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Device Disconnected</p>
                </div>
              </div>
            )}
          </div>

          {/* Physical Buttons */}
          <div className="flex justify-center gap-4 mt-4">
            <Button
              size="sm"
              variant="outline"
              className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
              onClick={() => handleQuickAction("back")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
              onClick={() => handleQuickAction("home")}
            >
              <Home className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
              onClick={() => handleQuickAction("recent")}
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
          </div>

          {/* Volume Controls */}
          <div className="flex justify-between mt-2">
            <Button
              size="sm"
              variant="ghost"
              className="text-white hover:bg-gray-700"
              onClick={() => handleQuickAction("volume_down")}
            >
              <VolumeX className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-white hover:bg-gray-700"
              onClick={() => handleQuickAction("volume_up")}
            >
              <Volume2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Device Info */}
        <div className="mt-4 text-center text-sm text-gray-600">
          <p>{device.deviceModel} • Android {device.androidVersion}</p>
          <p>Battery: {device.batteryLevel}% • {device.screenWidth}x{device.screenHeight}</p>
          {device.isConnected && (
            <p className="text-green-600 font-medium">🟢 Live Control Active</p>
          )}
        </div>
      </div>
    </Card>
  );
}