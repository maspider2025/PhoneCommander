package com.smartcontrol.client;

import android.app.Service;
import android.content.Intent;
import android.os.IBinder;
import android.util.Log;
import org.json.JSONException;
import org.json.JSONObject;

public class RemoteControlService extends Service implements 
    TCPClient.TCPClientListener, 
    WebSocketClient.WebSocketClientListener {
    
    private static final String TAG = "RemoteControlService";
    
    private TCPClient tcpClient;
    private WebSocketClient webSocketClient;
    private AccessibilityControlService accessibilityService;
    private ScreenCaptureService screenCaptureService;

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "RemoteControlService created");
        
        // Initialize clients
        tcpClient = new TCPClient(this);
        tcpClient.setListener(this);
        
        webSocketClient = new WebSocketClient(this);
        webSocketClient.setListener(this);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "RemoteControlService started");
        
        if (intent != null) {
            String host = intent.getStringExtra("server_host");
            int port = intent.getIntExtra("server_port", 8081);
            
            if (host != null) {
                // Connect via TCP for primary communication
                tcpClient.setServerConfig(host, port);
                tcpClient.connect();
                
                // Connect via WebSocket for real-time updates
                webSocketClient.connect(host, 5000); // WebSocket port
            }
        }
        
        return START_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    // TCP Client Listener Methods
    @Override
    public void onConnected() {
        Log.d(TAG, "TCP connection established");
    }

    @Override
    public void onDisconnected() {
        Log.d(TAG, "TCP connection lost");
    }

    @Override
    public void onCommand(JSONObject command) {
        Log.d(TAG, "TCP command received: " + command.toString());
        handleCommand(command);
    }

    @Override
    public void onError(String error) {
        Log.e(TAG, "TCP error: " + error);
    }

    // WebSocket Client Listener Methods
    public void onWebSocketConnected() {
        Log.d(TAG, "WebSocket connection established");
    }

    public void onWebSocketDisconnected() {
        Log.d(TAG, "WebSocket connection lost");
    }

    public void onMessage(JSONObject message) {
        Log.d(TAG, "WebSocket message received: " + message.toString());
        handleCommand(message);
    }

    public void onWebSocketError(String error) {
        Log.e(TAG, "WebSocket error: " + error);
    }

    private void handleCommand(JSONObject command) {
        try {
            String type = command.getString("type");
            
            switch (type) {
                case "touch":
                    handleTouchCommand(command);
                    break;
                case "swipe":
                    handleSwipeCommand(command);
                    break;
                case "key_event":
                    handleKeyEventCommand(command);
                    break;
                case "text_input":
                    handleTextInputCommand(command);
                    break;
                case "screenshot":
                    handleScreenshotCommand(command);
                    break;
                case "start_screen_share":
                    handleStartScreenShare(command);
                    break;
                case "stop_screen_share":
                    handleStopScreenShare(command);
                    break;
                default:
                    Log.w(TAG, "Unknown command type: " + type);
            }
        } catch (JSONException e) {
            Log.e(TAG, "Error parsing command", e);
        }
    }

    private void handleTouchCommand(JSONObject command) throws JSONException {
        if (accessibilityService != null) {
            float x = (float) command.getDouble("x");
            float y = (float) command.getDouble("y");
            accessibilityService.performTouch(x, y);
        }
    }

    private void handleSwipeCommand(JSONObject command) throws JSONException {
        if (accessibilityService != null) {
            float startX = (float) command.getDouble("startX");
            float startY = (float) command.getDouble("startY");
            float endX = (float) command.getDouble("endX");
            float endY = (float) command.getDouble("endY");
            long duration = command.optLong("duration", 500);
            accessibilityService.performSwipe(startX, startY, endX, endY, duration);
        }
    }

    private void handleKeyEventCommand(JSONObject command) throws JSONException {
        if (accessibilityService != null) {
            String action = command.getString("action");
            accessibilityService.performQuickAction(action);
        }
    }

    private void handleTextInputCommand(JSONObject command) throws JSONException {
        if (accessibilityService != null) {
            String text = command.getString("text");
            accessibilityService.performTextInput(text);
        }
    }

    private void handleScreenshotCommand(JSONObject command) {
        // Implementation for taking screenshot
        Log.d(TAG, "Screenshot command received");
    }

    private void handleStartScreenShare(JSONObject command) {
        // Implementation for starting screen sharing
        Log.d(TAG, "Start screen share command received");
        if (screenCaptureService != null) {
            // Start screen capture service
        }
    }

    private void handleStopScreenShare(JSONObject command) {
        // Implementation for stopping screen sharing
        Log.d(TAG, "Stop screen share command received");
        if (screenCaptureService != null) {
            // Stop screen capture service
        }
    }

    public void setAccessibilityService(AccessibilityControlService service) {
        this.accessibilityService = service;
        if (tcpClient != null) {
            tcpClient.setAccessibilityService(service);
        }
    }

    public void setScreenCaptureService(ScreenCaptureService service) {
        this.screenCaptureService = service;
        if (tcpClient != null) {
            tcpClient.setScreenCaptureService(service);
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        Log.d(TAG, "RemoteControlService destroyed");
        
        if (tcpClient != null) {
            tcpClient.disconnect();
        }
        
        if (webSocketClient != null) {
            webSocketClient.disconnect();
        }
    }
}