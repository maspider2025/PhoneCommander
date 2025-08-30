export interface TCPMessage {
  type: "device_info" | "screen_data" | "command_response" | "heartbeat" | "error";
  deviceId?: string;
  data?: any;
  timestamp: number;
}

export interface DeviceInfo {
  deviceName: string;
  deviceModel: string;
  androidVersion: string;
  packageName: string;
  batteryLevel: number;
  screenWidth: number;
  screenHeight: number;
  metadata?: Record<string, any>;
}

export interface ScreenData {
  imageData: string; // Base64 encoded image
  width: number;
  height: number;
  format: "JPEG" | "PNG";
  timestamp: number;
}

export interface ControlCommand {
  type: "touch" | "key" | "text" | "home" | "back" | "recent" | "power" | "volume_up" | "volume_down" | "screenshot";
  data?: any;
}

export interface TouchCommand {
  x: number;
  y: number;
  action: "down" | "up" | "move";
}

export interface KeyCommand {
  keyCode: number;
  action: "down" | "up";
}

export interface TextCommand {
  text: string;
}

export class TCPProtocol {
  static createDeviceInfoMessage(deviceInfo: DeviceInfo): TCPMessage {
    return {
      type: "device_info",
      data: deviceInfo,
      timestamp: Date.now(),
    };
  }

  static createScreenDataMessage(deviceId: string, screenData: ScreenData): TCPMessage {
    return {
      type: "screen_data",
      deviceId,
      data: screenData,
      timestamp: Date.now(),
    };
  }

  static createCommandResponseMessage(deviceId: string, command: ControlCommand): TCPMessage {
    return {
      type: "command_response",
      deviceId,
      data: command,
      timestamp: Date.now(),
    };
  }

  static createHeartbeatMessage(deviceId?: string): TCPMessage {
    return {
      type: "heartbeat",
      deviceId,
      timestamp: Date.now(),
    };
  }

  static createErrorMessage(deviceId: string, error: string): TCPMessage {
    return {
      type: "error",
      deviceId,
      data: { error },
      timestamp: Date.now(),
    };
  }

  static parseMessage(data: string): TCPMessage {
    try {
      const message = JSON.parse(data);
      
      // Validate message structure
      if (!message.type || !message.timestamp) {
        throw new Error("Invalid message format");
      }
      
      return message;
    } catch (error) {
      throw new Error(`Failed to parse TCP message: ${error}`);
    }
  }

  static serializeMessage(message: TCPMessage): string {
    return JSON.stringify(message);
  }

  // Android key codes constants
  static readonly KEY_CODES = {
    HOME: 3,
    BACK: 4,
    MENU: 82,
    POWER: 26,
    VOLUME_UP: 24,
    VOLUME_DOWN: 25,
    CAMERA: 27,
    SEARCH: 84,
    RECENT_APPS: 187,
  };

  // Touch actions
  static readonly TOUCH_ACTIONS = {
    DOWN: "down",
    UP: "up",
    MOVE: "move",
  } as const;

  // Screen formats
  static readonly SCREEN_FORMATS = {
    JPEG: "JPEG",
    PNG: "PNG",
  } as const;
}

export default TCPProtocol;
