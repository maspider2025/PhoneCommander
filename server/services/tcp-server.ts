import { createServer, Socket } from "net";
import { EventEmitter } from "events";
import { storage } from "../storage";

export interface TCPMessage {
  type: "device_info" | "screen_data" | "command_response" | "heartbeat" | "error" | "request_screen";
  deviceId?: string;
  data?: any;
  timestamp: number;
}

export interface DeviceConnection {
  socket: Socket;
  deviceId: string;
  isAuthenticated: boolean;
  lastHeartbeat: number;
}

export class TCPServer extends EventEmitter {
  private server: any;
  private port: number;
  private connections = new Map<string, DeviceConnection>();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private screenUpdateInterval = new Map<string, NodeJS.Timeout>(); // To manage screen capture intervals

  constructor(port: number = 8080) {
    super();
    this.port = port;
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = createServer((socket) => {
        this.handleConnection(socket);
      });

      this.server.listen(this.port, "0.0.0.0", () => {
        console.log(`TCP Server listening on port ${this.port}`);
        this.startHeartbeatCheck();
        resolve();
      });

      this.server.on("error", (err: Error) => {
        console.error("TCP Server error:", err);
        reject(err);
      });
    });
  }

  private startHeartbeatCheck(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const timeout = 30000; // 30 seconds timeout

      this.connections.forEach((connection, deviceId) => {
        if (now - connection.lastHeartbeat > timeout) {
          console.log(`Device ${deviceId} heartbeat timeout, disconnecting`);
          connection.socket.destroy();
          this.handleDisconnection(connection);
        }
      });
    }, 10000); // Check every 10 seconds
  }

  private handleConnection(socket: Socket): void {
    console.log(`New TCP connection from ${socket.remoteAddress}:${socket.remotePort}`);

    let deviceConnection: DeviceConnection | null = null;
    let buffer = '';

    socket.on("data", async (data) => {
      try {
        const dataStr = data.toString();

        // Check if this is an HTTP request (reject it)
        if (dataStr.startsWith('GET ') || dataStr.startsWith('POST ') || dataStr.startsWith('HTTP/')) {
          console.log(`Rejecting HTTP request from ${socket.remoteAddress}`);
          socket.end('HTTP/1.1 400 Bad Request\r\n\r\nThis is a TCP socket for Android devices only');
          return;
        }

        buffer += dataStr;

        // Process complete JSON messages (separated by newlines)
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.trim()) {
            const message: TCPMessage = JSON.parse(line.trim());

            if (message.type === "device_info" && !deviceConnection?.isAuthenticated) {
              // Initial device registration
              deviceConnection = await this.authenticateDevice(socket, message);
              if (deviceConnection) {
                this.connections.set(deviceConnection.deviceId, deviceConnection);
                this.emit("device_connected", deviceConnection.deviceId);
                // Start screen capture after successful authentication
                this.startScreenCapture(deviceConnection.deviceId);
              }
            } else if (deviceConnection?.isAuthenticated) {
              await this.handleMessage(deviceConnection, message);
            }
          }
        }
      } catch (error) {
        console.error("Error parsing TCP message:", error);
        this.sendMessage(socket, { type: "error", data: "Invalid message format", timestamp: Date.now() });
      }
    });

    socket.on("close", () => {
      if (deviceConnection) {
        this.handleDisconnection(deviceConnection);
      }
    });

    socket.on("error", (err) => {
      console.error("Socket error:", err);
      if (deviceConnection) {
        this.handleDisconnection(deviceConnection);
      }
    });
  }

  private async authenticateDevice(socket: Socket, message: TCPMessage): Promise<DeviceConnection | null> {
    try {
      const deviceInfo = message.data;

      // Create or update device in database
      const existingDevice = await storage.getDevices();
      let device = existingDevice.find(d => d.packageName === deviceInfo.packageName);

      if (!device) {
        device = await storage.createDevice({
          name: deviceInfo.deviceName || "Unknown Device",
          androidVersion: deviceInfo.androidVersion || "Unknown",
          deviceModel: deviceInfo.deviceModel || "Unknown",
          packageName: deviceInfo.packageName,
          batteryLevel: deviceInfo.batteryLevel || 0,
          isConnected: true,
          tcpAddress: socket.remoteAddress || "",
          tcpPort: socket.remotePort || 0,
          screenWidth: deviceInfo.screenWidth || 1080,
          screenHeight: deviceInfo.screenHeight || 1920,
          metadata: deviceInfo.metadata || {},
        });
      } else {
        await storage.updateDevice(device.id, {
          isConnected: true,
          batteryLevel: deviceInfo.batteryLevel || device.batteryLevel,
          tcpAddress: socket.remoteAddress || "",
          tcpPort: socket.remotePort || 0,
        });
      }

      // Create session
      await storage.createSession({
        deviceId: device.id,
        isActive: true,
      });

      // Log connection
      await storage.createActivityLog({
        deviceId: device.id,
        type: "connection",
        message: `Device ${device.name} connected successfully`,
        metadata: { address: socket.remoteAddress, port: socket.remotePort },
      });

      this.sendMessage(socket, {
        type: "command_response",
        data: { status: "authenticated", deviceId: device.id },
        timestamp: Date.now(),
      });

      return {
        socket,
        deviceId: device.id,
        isAuthenticated: true,
        lastHeartbeat: Date.now(),
      };
    } catch (error) {
      console.error("Device authentication failed:", error);
      this.sendMessage(socket, {
        type: "error",
        data: "Authentication failed",
        timestamp: Date.now(),
      });
      return null;
    }
  }

  private async handleMessage(connection: DeviceConnection, message: TCPMessage): Promise<void> {
    connection.lastHeartbeat = Date.now();

    switch (message.type) {
      case "screen_data":
        this.emit("screen_data", connection.deviceId, message.data);
        break;

      case "command_response":
        this.emit("command_response", connection.deviceId, message.data);
        break;

      case "heartbeat":
        // Device is alive, no need to send heartbeat back, server will check it
        break;

      default:
        console.log(`Unknown message type: ${message.type}`);
    }
  }

  private async handleDisconnection(connection: DeviceConnection): Promise<void> {
    this.connections.delete(connection.deviceId);
    if (this.screenUpdateInterval.has(connection.deviceId)) {
      clearInterval(this.screenUpdateInterval.get(connection.deviceId)!);
      this.screenUpdateInterval.delete(connection.deviceId);
    }

    // Update device status
    await storage.updateDevice(connection.deviceId, {
      isConnected: false,
    });

    // End active sessions
    const activeSessions = await storage.getSessionsByDevice(connection.deviceId);
    for (const session of activeSessions) {
      if (session.isActive) {
        await storage.endSession(session.id);
      }
    }

    // Log disconnection
    await storage.createActivityLog({
      deviceId: connection.deviceId,
      type: "connection",
      message: "Device disconnected",
    });

    this.emit("device_disconnected", connection.deviceId);
    console.log(`Device ${connection.deviceId} disconnected`);
  }

  public sendCommandToDevice(deviceId: string, command: any): boolean {
    const connection = this.connections.get(deviceId);
    if (!connection || !connection.isAuthenticated) {
      console.error(`Device ${deviceId} not connected or authenticated.`);
      return false;
    }

    // Ensure command is in the expected TCPMessage format if it's a direct command
    let message: TCPMessage;
    if (typeof command === 'object' && command !== null && 'type' in command) {
      message = command as TCPMessage;
    } else {
      // Assume it's data for a generic command_response if not a TCPMessage
      message = {
        type: "command_response",
        data: command,
        timestamp: Date.now(),
      };
    }

    this.sendMessage(connection.socket, message);
    return true;
  }

  private sendMessage(socket: Socket, message: TCPMessage): void {
    try {
      socket.write(JSON.stringify(message) + "\n");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }

  private startScreenCapture(deviceId: string): void {
    // Request screen updates every 50ms for ultra-smooth real-time control
    const interval = setInterval(() => {
      const connection = this.connections.get(deviceId);
      if (connection && connection.isAuthenticated) {
        this.sendMessage(connection.socket, {
          type: "request_screen",
          data: { 
            type: "request_screen", 
            quality: "high", 
            format: "JPEG",
            compression: 80,
            scale: 1.0
          },
          timestamp: Date.now(),
        });
      }
    }, 50); // Ultra-fast refresh for real-time control

    this.screenUpdateInterval.set(deviceId, interval);
  }

  public getConnectedDevices(): string[] {
    return Array.from(this.connections.keys());
  }


  public stop(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.screenUpdateInterval.forEach((interval) => {
      clearInterval(interval);
    });
    this.screenUpdateInterval.clear();

    if (this.server) {
      this.server.close();
    }
    this.connections.clear();
  }
}