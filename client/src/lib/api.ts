export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

export interface DeviceInfo {
  id: string;
  name: string;
  status: 'connected' | 'disconnected';
  lastSeen: string;
  ipAddress: string;
  screenWidth: number;
  screenHeight: number;
}

export interface BuildConfig {
  serverHost: string;
  serverPort: number;
  appName: string;
  packageName: string;
}

export interface BuildProgress {
  status: 'building' | 'completed' | 'failed';
  progress: number;
  message: string;
  downloadUrl?: string;
}

const API_BASE = process.env.NODE_ENV === 'development' ? 'http://localhost:5000' : '';

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE;
  }

  async get(endpoint: string) {
    const response = await fetch(`${this.baseUrl}${endpoint}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  async post(endpoint: string, data: any) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  async sendTouch(deviceId: string, x: number, y: number, action: string) {
    return this.post(`/api/control/${deviceId}`, {
      type: 'touch',
      data: { x, y, action }
    });
  }

  async generateApk(config: any) {
    const response = await fetch(`${this.baseUrl}/api/generate-apk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  async downloadApk(filename: string) {
    const response = await fetch(`${this.baseUrl}/api/download/${filename}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.blob();
  }

  async getDevices() {
    return this.get('/api/devices');
  }

  async getServerConfig() {
    const response = await fetch("/api/server-config");
    return response.json();
  }

  async updateServerConfig(config: any) {
    const response = await fetch("/api/server-config", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(config),
    });
    return response.json();
  }

  async restartServer() {
    const response = await fetch("/api/server/restart", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.json();
  }

  // Enhanced control methods for ultra-fast remote Android control
  async sendSwipe(deviceId: string, startX: number, startY: number, endX: number, endY: number) {
    return this.post(`/api/control/${deviceId}`, {
      type: "swipe",
      data: { startX, startY, endX, endY }
    });
  }

  async sendKey(deviceId: string, keyCode: number) {
    return this.post(`/api/control/${deviceId}`, {
      type: "key",
      data: { keyCode }
    });
  }

  async sendText(deviceId: string, text: string) {
    return this.post(`/api/control/${deviceId}`, {
      type: "text",
      data: { text }
    });
  }

  async sendQuickAction(deviceId: string, action: string) {
    return this.post(`/api/control/${deviceId}`, {
      type: "quick_action",
      data: { action }
    });
  }

  async takeScreenshot(deviceId: string) {
    return this.post(`/api/control/${deviceId}`, {
      type: "screenshot",
      data: {}
    });
  }

  async sendLongPress(deviceId: string, x: number, y: number, duration: number = 1000) {
    return this.post(`/api/control/${deviceId}`, {
      type: "long_press",
      data: { x, y, duration }
    });
  }

  async sendDrag(deviceId: string, points: { x: number; y: number }[]) {
    return this.post(`/api/control/${deviceId}`, {
      type: "drag",
      data: { points }
    });
  }
}

export default new ApiClient();