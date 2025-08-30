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
  const [isDragging, setIsDragging] = useState(false);
  const [screenData, setScreenData] = useState<{ width: number; height: number } | null>(null);
  const [lastTouchTime, setLastTouchTime] = useState(0);
  const [touchStartPos, setTouchStartPos] = useState<{ x: number; y: number } | null>(null);
  const [swipeStartPos, setSwipeStartPos] = useState<{ x: number; y: number } | null>(null);
  const [dragPath, setDragPath] = useState<{ x: number; y: number }[]>([]);
  const [gestureType, setGestureType] = useState<'touch' | 'swipe' | 'drag' | 'longpress' | null>(null);
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);

  const deviceId = device.id;
  const deviceWidth = device.screenWidth || 1080;
  const deviceHeight = device.screenHeight || 1920;
  const [isMouseDown, setIsMouseDown] = useState(false);


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
    const deviceX = Math.round(x * ((deviceWidth || 1080) / rect.width));
    const deviceY = Math.round(y * ((deviceHeight || 1920) / rect.height));

    setIsMouseDown(true);
    setSwipeStartPos({ x: deviceX, y: deviceY });
    setDragPath([{ x: deviceX, y: deviceY }]);
    setGestureType('touch');
    
    // Start long press timer
    const timer = setTimeout(async () => {
      if (gestureType === 'touch' && !swipeStartPos) return;
      setGestureType('longpress');
      await api.sendLongPress(deviceId, deviceX, deviceY, 800);
    }, 800); // Long press after 800ms
    setPressTimer(timer);
    
    await api.sendTouch(deviceId, deviceX, deviceY, 'down');
  };

  const handleMouseMove = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!deviceId || !isMouseDown) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert to device coordinates
    const deviceX = Math.round(x * ((deviceWidth || 1080) / rect.width));
    const deviceY = Math.round(y * ((deviceHeight || 1920) / rect.height));

    // Add to drag path for complex gestures
    setDragPath(prev => [...prev, { x: deviceX, y: deviceY }]);
    
    // Determine gesture type based on movement distance
    if (swipeStartPos && gestureType === 'touch') {
      const distance = Math.sqrt(
        Math.pow(deviceX - swipeStartPos.x, 2) + Math.pow(deviceY - swipeStartPos.y, 2)
      );
      if (distance > 50) {
        setGestureType('swipe');
      }
    }

    await api.sendTouch(deviceId, deviceX, deviceY, 'move');
  };

  const handleMouseUp = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!deviceId) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert to device coordinates
    const deviceX = Math.round(x * ((deviceWidth || 1080) / rect.width));
    const deviceY = Math.round(y * ((deviceHeight || 1920) / rect.height));

    setIsMouseDown(false);
    
    // Clear long press timer
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
    
    // Execute appropriate gesture based on movement (unless it was a long press)
    if (gestureType !== 'longpress') {
      if (gestureType === 'swipe' && swipeStartPos && dragPath.length > 1) {
        const endPos = dragPath[dragPath.length - 1];
        await api.sendSwipe(deviceId, swipeStartPos.x, swipeStartPos.y, endPos.x, endPos.y);
      } else if (dragPath.length > 5) {
        // Complex drag gesture with multiple points
        await api.sendDrag(deviceId, dragPath);
      } else {
        // Simple tap
        await api.sendTouch(deviceId, deviceX, deviceY, 'up');
      }
    }
    
    // Reset gesture tracking
    setSwipeStartPos(null);
    setDragPath([]);
    setGestureType(null);
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