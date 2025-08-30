import { EventEmitter } from "events";
import { TCPServer, type TCPMessage } from "./tcp-server";
import { storage } from "../storage";
import { WebSocket } from 'ws';
import { Device } from '../../shared/schema';
import net from 'net';

export interface TouchEvent {
  x: number;
  y: number;
  action: "down" | "up" | "move";
}

export interface KeyEvent {
  keyCode: number;
  action: "down" | "up";
}

export class DeviceManager extends EventEmitter {
  private devices: Map<string, Device & { socket?: net.Socket }> = new Map();
  private webSocketClients: Set<WebSocket> = new Set();
  private tcpServer: TCPServer;

  constructor(tcpServer: TCPServer) {
    super();
    this.tcpServer = tcpServer;
    this.setupTCPListeners(tcpServer);
  }

  private setupTCPListeners(tcpServer: TCPServer): void {
    tcpServer.on("device_connected", (deviceId: string, deviceInfo: any) => {
      this.registerDevice(deviceId, deviceInfo);
    });

    tcpServer.on("device_disconnected", (deviceId: string) => {
      this.unregisterDevice(deviceId);
    });

    tcpServer.on("screen_data", (deviceId: string, data: any) => {
      this.updateDeviceScreen(deviceId, data);
    });

    tcpServer.on("command_response", (deviceId: string, response: any) => {
      this.emit("command_response", deviceId, response);
    });

    tcpServer.on("device_info", (deviceId: string, info: any) => {
      this.updateDeviceInfo(deviceId, info);
    });
  }

  registerDevice(deviceId: string, deviceData: Partial<Device>) {
    const device: Device = {
      id: deviceId,
      name: deviceData.name || `Device ${deviceId}`,
      androidVersion: deviceData.androidVersion || 'Unknown',
      deviceModel: deviceData.deviceModel || 'Unknown', 
      packageName: deviceData.packageName || 'unknown.package',
      batteryLevel: deviceData.batteryLevel || 0,
      isConnected: true,
      lastSeen: new Date(),
      tcpAddress: deviceData.tcpAddress || null,
      tcpPort: deviceData.tcpPort || null,
      screenWidth: deviceData.screenWidth || 1080,
      screenHeight: deviceData.screenHeight || 1920,
      metadata: deviceData.metadata || {},
      createdAt: new Date()
    };

    this.devices.set(device.id, { ...device }); // Removed socket association here as it's handled by TCPServer

    // Broadcast to WebSocket clients
    this.broadcastToWebClients({
      type: 'device_connected',
      deviceId: device.id,
      device: device
    });

    // Send devices list update
    this.broadcastDevicesList();

    console.log(`Device registered: ${device.id} (${device.name})`);
  }

  unregisterDevice(deviceId: string) {
    const device = this.devices.get(deviceId);
    if (device) {
      device.isConnected = false;
      device.lastSeen = new Date();

      this.broadcastToWebClients({
        type: 'device_disconnected',
        deviceId: deviceId
      });

      // Send updated devices list
      this.broadcastDevicesList();

      // Remove after a delay
      setTimeout(() => {
        this.devices.delete(deviceId);
        this.broadcastDevicesList();
      }, 60000); // Remove after 1 minute

      console.log(`Device unregistered: ${deviceId}`);
    }
  }

  updateDeviceScreen(deviceId: string, screenData: any) {
    const device = this.devices.get(deviceId);
    if (device && screenData) {
      // Broadcast screen update to WebSocket clients
      this.broadcastToWebClients({
        type: 'screen_update',
        deviceId: deviceId,
        data: screenData
      });
    }
  }

  updateDeviceHeartbeat(deviceId: string) {
    const device = this.devices.get(deviceId);
    if (device) {
      device.lastSeen = new Date();
      device.isConnected = true;
    }
  }

  updateDeviceInfo(deviceId: string, info: any) {
    const device = this.devices.get(deviceId);
    if (device && info) {
      if (info.batteryLevel !== undefined) device.batteryLevel = info.batteryLevel;
      if (info.screenWidth !== undefined) device.screenWidth = info.screenWidth;
      if (info.screenHeight !== undefined) device.screenHeight = info.screenHeight;
      if (info.deviceModel !== undefined) device.deviceModel = info.deviceModel;
      if (info.androidVersion !== undefined) device.androidVersion = info.androidVersion;

      this.broadcastDevicesList();
    }
  }

  sendCommand(deviceId: string, commandType: string, commandData: any): boolean {
    const device = this.devices.get(deviceId);
    if (device && device.isConnected) {
      try {
        const command = {
          type: commandType,
          data: commandData,
          timestamp: Date.now()
        };

        // Use TCPServer to send command to device
        const success = this.tcpServer.sendCommandToDevice(deviceId, command);
        console.log(`Command sent to ${deviceId}:`, commandType, commandData, success ? 'SUCCESS' : 'FAILED');
        return success;

      } catch (error) {
        console.error('Error sending command to device:', error);
        return false;
      }
    }
    console.warn(`Cannot send command to device ${deviceId}: device not found or not connected`);
    return false;
  }

  getAllDevices(): Device[] {
    return Array.from(this.devices.values()).map(device => {
      const { socket, ...deviceData } = device;
      return deviceData;
    });
  }

  getDevice(deviceId: string): Device | null {
    const device = this.devices.get(deviceId);
    if (device) {
      const { socket, ...deviceData } = device;
      return deviceData;
    }
    return null;
  }

  addWebSocketClient(ws: WebSocket) {
    this.webSocketClients.add(ws);
    console.log(`WebSocket client added. Total clients: ${this.webSocketClients.size}`);
  }

  removeWebSocketClient(ws: WebSocket) {
    this.webSocketClients.delete(ws);
    console.log(`WebSocket client removed. Total clients: ${this.webSocketClients.size}`);
  }

  private broadcastToWebClients(message: any) {
    const messageStr = JSON.stringify(message);
    this.webSocketClients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(messageStr);
        } catch (error) {
          console.error('Error sending message to WebSocket client:', error);
          this.webSocketClients.delete(ws);
        }
      }
    });
  }

  private broadcastDevicesList() {
    const devices = this.getAllDevices();
    this.broadcastToWebClients({
      type: 'devices_update',
      data: { devices }
    });
  }

  // Health check method
  performHealthCheck() {
    const now = new Date();
    this.devices.forEach((device, deviceId) => {
      if (device.lastSeen) {
        const timeSinceLastSeen = now.getTime() - device.lastSeen.getTime();
        if (timeSinceLastSeen > 60000 && device.isConnected) { // 1 minute timeout
          console.log(`Device ${deviceId} appears to be disconnected (no heartbeat)`);
          device.isConnected = false;
          this.broadcastToWebClients({
            type: 'device_disconnected',
            deviceId: deviceId
          });
        }
      }
    });
  }

  // Existing methods from original DeviceManager class, adapted to use the new structure
  public async sendTouchEvent(deviceId: string, x: number, y: number): Promise<boolean> {
    const success = this.sendCommand(deviceId, "touch", { x, y, action: "tap" });
    if (success) {
      await storage.createActivityLog({
        deviceId,
        type: "touch",
        message: `Touch event at (${x}, ${y})`,
        metadata: { x, y }
      });
    }
    return success;
  }

  public async sendKeyEvent(deviceId: string, keyCode: number): Promise<boolean> {
    const success = this.sendCommand(deviceId, "key", { keyCode, action: "press" });
    if (success) {
      await storage.createActivityLog({
        deviceId,
        type: "key",
        message: `Key event: ${keyCode}`,
        metadata: { keyCode }
      });
    }
    return success;
  }

  public async sendTextInput(deviceId: string, text: string): Promise<boolean> {
    const success = this.sendCommand(deviceId, "text", { text });
    if (success) {
      await storage.createActivityLog({
        deviceId,
        type: "text",
        message: `Text input: ${text}`,
        metadata: { text }
      });
    }
    return success;
  }

  public async sendQuickAction(deviceId: string, action: string): Promise<boolean> {
    const success = this.sendCommand(deviceId, "quick_action", { action });
    if (success) {
      await storage.createActivityLog({
        deviceId,
        type: "action",
        message: `Quick action: ${action}`,
        metadata: { action }
      });
    }
    return success;
  }

  public async takeScreenshot(deviceId: string): Promise<boolean> {
    const success = this.sendCommand(deviceId, "screenshot", {});
    if (success) {
      await storage.createActivityLog({
        deviceId,
        type: "screenshot",
        message: "Screenshot taken",
      });
    }
    return success;
  }

  public async sendSwipeGesture(deviceId: string, startX: number, startY: number, endX: number, endY: number): Promise<boolean> {
    const success = this.sendCommand(deviceId, "swipe", { startX, startY, endX, endY });
    if (success) {
      await storage.createActivityLog({
        deviceId,
        type: "swipe",
        message: `Swipe from (${startX}, ${startY}) to (${endX}, ${endY})`,
        metadata: { startX, startY, endX, endY }
      });
    }
    return success;
  }

  public async sendLongPress(deviceId: string, x: number, y: number, duration: number = 1000): Promise<boolean> {
    const success = this.sendCommand(deviceId, "long_press", { x, y, duration });
    if (success) {
      await storage.createActivityLog({
        deviceId,
        type: "long_press",
        message: `Long press at (${x}, ${y}) for ${duration}ms`,
        metadata: { x, y, duration }
      });
    }
    return success;
  }

  public async sendDragGesture(deviceId: string, points: { x: number; y: number }[]): Promise<boolean> {
    const success = this.sendCommand(deviceId, "drag", { points });
    if (success) {
      await storage.createActivityLog({
        deviceId,
        type: "drag",
        message: `Drag gesture with ${points.length} points`,
        metadata: { points }
      });
    }
    return success;
  }

  // Method to get connected devices from the TCPServer
  public getConnectedDevices(): string[] {
    // This should ideally query the TCPServer instance
    // For now, returning keys from our internal devices map
    return Array.from(this.devices.keys());
  }
}

// Note: The 'deviceManager' export from the original code is removed
// as the DeviceManager class is now instantiated within the constructor
// of another class or managed globally if needed.
// If you need a global instance, you would create it here:
// export const deviceManager = new DeviceManager(tcpServerInstance); // Assuming tcpServerInstance is available

// Create device manager instance - will need proper tcpServer instance
// export const deviceManager = new DeviceManager(tcpServer);