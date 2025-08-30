import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { TCPServer } from "./services/tcp-server";
import { DeviceManager } from "./services/device-manager";
import { apkBuilder, type BuildProgress } from "./services/apk-builder";
import { insertApkConfigurationSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import { join } from "path";

const upload = multer({ dest: "uploads/" });

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Initialize TCP server
  const tcpServer = new TCPServer(8080);
  await tcpServer.start();

  // Initialize device manager
  const deviceManager = new DeviceManager(tcpServer);

  // Initialize WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // WebSocket connection handling
  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');

    // Send initial data
    ws.send(JSON.stringify({
      type: 'connection',
      data: { status: 'connected', timestamp: Date.now() }
    }));

    // Add WebSocket client to device manager
    deviceManager.addWebSocketClient(ws);

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      deviceManager.removeWebSocketClient(ws);
    });
  });

  // API Routes

  // Get all devices
  app.get("/api/devices", async (req, res) => {
    try {
      const devices = await storage.getDevices();
      res.json(devices);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch devices" });
    }
  });

  // Get device by ID
  app.get("/api/devices/:id", async (req, res) => {
    try {
      const device = await storage.getDevice(req.params.id);
      if (!device) {
        return res.status(404).json({ error: "Device not found" });
      }
      res.json(device);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch device" });
    }
  });

  // Update device
  app.patch("/api/devices/:id", async (req, res) => {
    try {
      const device = await storage.updateDevice(req.params.id, req.body);
      if (!device) {
        return res.status(404).json({ error: "Device not found" });
      }
      res.json(device);
    } catch (error) {
      res.status(500).json({ error: "Failed to update device" });
    }
  });

  // Delete device
  app.delete("/api/devices/:id", async (req, res) => {
    try {
      const success = await storage.deleteDevice(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Device not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete device" });
    }
  });

  // Send control command to device
  app.post("/api/control/:deviceId", async (req, res) => {
    try {
      const { deviceId } = req.params;
      const { type, data } = req.body;

      let success = false;

      switch (type) {
        case "touch":
          success = await deviceManager.sendTouchEvent(deviceId, data.x, data.y);
          break;
        case "key":
          success = await deviceManager.sendKeyEvent(deviceId, data.keyCode);
          break;
        case "text":
          success = await deviceManager.sendTextInput(deviceId, data.text);
          break;
        case "quick_action":
          success = await deviceManager.sendQuickAction(deviceId, data.action);
          break;
        case "screenshot":
          success = await deviceManager.takeScreenshot(deviceId);
          break;
        case "swipe":
          success = await deviceManager.sendSwipeGesture(
            deviceId, 
            data.startX, 
            data.startY, 
            data.endX, 
            data.endY
          );
          break;
        case "long_press":
          success = await deviceManager.sendLongPress(
            deviceId, 
            data.x, 
            data.y, 
            data.duration || 1000
          );
          break;
        case "drag":
          success = await deviceManager.sendDragGesture(deviceId, data.points);
          break;
        default:
          return res.status(400).json({ error: "Invalid command type" });
      }

      if (!success) {
        return res.status(404).json({ error: "Device not found or not connected" });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to send command" });
    }
  });

  // Get all sessions
  app.get("/api/sessions", async (req, res) => {
    try {
      const sessions = await storage.getActiveSessions();
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  });

  // Get sessions by device
  app.get("/api/sessions/device/:deviceId", async (req, res) => {
    try {
      const sessions = await storage.getSessionsByDevice(req.params.deviceId);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  });

  // End session
  app.patch("/api/sessions/:id/end", async (req, res) => {
    try {
      const success = await storage.endSession(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to end session" });
    }
  });

  // Get APK configurations
  app.get("/api/apk-configs", async (req, res) => {
    try {
      const configs = await storage.getApkConfigurations();
      res.json(configs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch APK configurations" });
    }
  });

  // Create APK configuration
  app.post("/api/apk-configs", async (req, res) => {
    try {
      const validatedData = insertApkConfigurationSchema.parse(req.body);
      const config = await storage.createApkConfiguration(validatedData);
      res.status(201).json(config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create APK configuration" });
    }
  });

  // Build APK
  app.post("/api/build-apk/:configId", async (req, res) => {
    try {
      const config = await storage.getApkConfiguration(req.params.configId);
      if (!config) {
        return res.status(404).json({ error: "APK configuration not found" });
      }

      // Start APK build process asynchronously
      apkBuilder.buildAPK(config, (progress: BuildProgress) => {
        // Send progress updates via WebSocket
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'build_progress',
              data: progress
            }));
          }
        });
      }).catch(error => {
        console.error("APK build failed:", error);
      });

      res.json({ message: "APK build started", configId: config.id });
    } catch (error) {
      res.status(500).json({ error: "Failed to start APK build" });
    }
  });

  // Download APK
  app.get("/api/download-apk/:configId", async (req, res) => {
    try {
      const config = await storage.getApkConfiguration(req.params.configId);
      if (!config || !config.apkPath) {
        return res.status(404).json({ error: "APK not found" });
      }

      // Check if file exists
      const fs = require('fs').promises;
      try {
        await fs.access(config.apkPath);
      } catch (error) {
        return res.status(404).json({ error: "APK file not found on disk" });
      }

      // Set proper headers for APK download
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      res.setHeader('Content-Disposition', `attachment; filename="${config.appName}-release.apk"`);

      res.download(config.apkPath, `${config.appName}-release.apk`, (err) => {
        if (err) {
          console.error("Download error:", err);
          if (!res.headersSent) {
            res.status(500).json({ error: "Failed to download APK" });
          }
        }
      });
    } catch (error) {
      console.error("Download APK error:", error);
      res.status(500).json({ error: "Failed to download APK" });
    }
  });

  // Get current server configuration for APK generation
  app.get("/api/server-config", (req, res) => {
    const host = req.get('host') || 'localhost:5000';
    const [hostname] = host.split(':');

    res.json({
      hostname: hostname,
      tcpPort: 8080,
      webPort: 5000,
      fullUrl: `${req.protocol}://${host}`,
      isReplit: hostname.includes('replit.dev')
    });
  });

  // Get activity logs
  app.get("/api/activity-logs", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const logs = await storage.getActivityLogs(limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch activity logs" });
    }
  });

  // Get activity logs by device
  app.get("/api/activity-logs/device/:deviceId", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const logs = await storage.getActivityLogsByDevice(req.params.deviceId, limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch activity logs" });
    }
  });

  // File upload endpoint
  app.post("/api/upload-file/:deviceId", upload.single("file"), async (req: any, res) => {
    try {
      const { deviceId } = req.params;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Here you would implement file transfer to the device
      // For now, just log the activity
      await storage.createActivityLog({
        deviceId,
        type: "file_transfer",
        message: `File uploaded: ${file.originalname}`,
        metadata: { 
          filename: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
          path: file.path 
        },
      });

      res.json({ 
        success: true, 
        filename: file.originalname,
        size: file.size 
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  // System stats endpoint
  app.get("/api/stats", async (req, res) => {
    try {
      const devices = await storage.getDevices();
      const connectedDevices = devices.filter(d => d.isConnected);
      const activeSessions = await storage.getActiveSessions();
      const apkConfigs = await storage.getApkConfigurations();
      const completedBuilds = apkConfigs.filter(c => c.buildStatus === "completed");

      const stats = {
        connectedDevices: connectedDevices.length,
        totalDevices: devices.length,
        activeSessions: activeSessions.length,
        apksGenerated: completedBuilds.length,
        uptime: process.uptime(),
        tcpConnections: deviceManager.getConnectedDevices().length,
        websocketClients: wss.clients.size,
      };

      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  return httpServer;
}