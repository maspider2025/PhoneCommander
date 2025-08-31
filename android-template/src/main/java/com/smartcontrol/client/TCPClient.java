package com.smartcontrol.client;

import android.content.Context;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.util.Base64;
import android.util.Log;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityManager;
// Removed duplicate AccessibilityService import
import android.view.accessibility.GestureDescription;
import android.graphics.Path;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.net.Socket;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

public class TCPClient {
    private static final String TAG = "TCPClient";
    private static final String DEFAULT_SERVER_HOST = "YOUR_REPLIT_URL.replit.dev";
    private static final int DEFAULT_SERVER_PORT = 8081;

    private Socket socket;
    private BufferedWriter writer;
    private BufferedReader reader;
    private ExecutorService executor;
    private AtomicBoolean isConnected = new AtomicBoolean(false);
    private AtomicBoolean shouldReconnect = new AtomicBoolean(true);

    private String serverHost = DEFAULT_SERVER_HOST;
    private int serverPort = DEFAULT_SERVER_PORT;
    private String deviceId;
    private Context context;
    private Handler mainHandler;
    private TCPClientListener listener;
    private AccessibilityControlService accessibilityService;
    private ScreenCaptureService screenCaptureService;

    public interface TCPClientListener {
        void onConnected();
        void onDisconnected();
        void onCommand(JSONObject command);
        void onError(String error);
    }

    public TCPClient(Context context) {
        this.context = context;
        this.mainHandler = new Handler(Looper.getMainLooper());
        this.executor = Executors.newSingleThreadExecutor();
    }

    public void setAccessibilityService(AccessibilityControlService service) {
        this.accessibilityService = service;
    }

    public void setScreenCaptureService(ScreenCaptureService service) {
        this.screenCaptureService = service;
    }

    public void setListener(TCPClientListener listener) {
        this.listener = listener;
    }

    public void setServerConfig(String host, int port) {
        this.serverHost = host;
        this.serverPort = port;
    }

    public void connect() {
        if (isConnected.get()) {
            Log.d(TAG, "Already connected");
            return;
        }

        executor.execute(() -> {
            try {
                Log.d(TAG, "Connecting to " + serverHost + ":" + serverPort);
                socket = new Socket(serverHost, serverPort);
                socket.setKeepAlive(true);
                socket.setTcpNoDelay(true);

                writer = new BufferedWriter(new OutputStreamWriter(socket.getOutputStream()));
                reader = new BufferedReader(new InputStreamReader(socket.getInputStream()));

                isConnected.set(true);
                
                // Send device info for authentication
                sendDeviceInfo();
                
                // Start heartbeat
                startHeartbeat();
                
                // Start listening for commands
                startListening();

                mainHandler.post(() -> {
                    if (listener != null) listener.onConnected();
                });

                Log.d(TAG, "Connected successfully");

            } catch (Exception e) {
                Log.e(TAG, "Connection failed: " + e.getMessage());
                isConnected.set(false);
                mainHandler.post(() -> {
                    if (listener != null) listener.onError("Connection failed: " + e.getMessage());
                });
                
                // Auto-reconnect after delay
                if (shouldReconnect.get()) {
                    try {
                        Thread.sleep(5000);
                        connect();
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                    }
                }
            }
        });
    }

    private void sendDeviceInfo() {
        try {
            JSONObject deviceInfo = new JSONObject();
            deviceInfo.put("deviceName", Build.MODEL);
            deviceInfo.put("deviceModel", Build.DEVICE);
            deviceInfo.put("androidVersion", Build.VERSION.RELEASE);
            deviceInfo.put("packageName", context.getPackageName());
            deviceInfo.put("batteryLevel", getBatteryLevel());
            deviceInfo.put("screenWidth", getScreenWidth());
            deviceInfo.put("screenHeight", getScreenHeight());

            JSONObject message = new JSONObject();
            message.put("type", "device_info");
            message.put("data", deviceInfo);
            message.put("timestamp", System.currentTimeMillis());

            sendMessage(message);
        } catch (JSONException e) {
            Log.e(TAG, "Failed to send device info", e);
        }
    }

    private void startHeartbeat() {
        executor.execute(() -> {
            while (isConnected.get()) {
                try {
                    JSONObject heartbeat = new JSONObject();
                    heartbeat.put("type", "heartbeat");
                    heartbeat.put("timestamp", System.currentTimeMillis());
                    sendMessage(heartbeat);
                    
                    Thread.sleep(10000); // Send heartbeat every 10 seconds
                } catch (Exception e) {
                    Log.e(TAG, "Heartbeat failed", e);
                    break;
                }
            }
        });
    }

    private void startListening() {
        executor.execute(() -> {
            String line;
            try {
                while (isConnected.get() && (line = reader.readLine()) != null) {
                    try {
                        JSONObject command = new JSONObject(line);
                        handleCommand(command);
                    } catch (JSONException e) {
                        Log.e(TAG, "Invalid JSON received: " + line, e);
                    }
                }
            } catch (IOException e) {
                Log.e(TAG, "Reading failed", e);
            } finally {
                disconnect();
            }
        });
    }

    private void handleCommand(JSONObject command) {
        try {
            String type = command.getString("type");
            
            if ("command_response".equals(type)) {
                JSONObject data = command.getJSONObject("data");
                String commandType = data.getString("type");
                
                switch (commandType) {
                    case "request_screen":
                        if (screenCaptureService != null) {
                            screenCaptureService.captureScreen((bitmap) -> {
                                sendScreenData(bitmap);
                            });
                        }
                        break;
                    case "touch":
                        performTouch(data);
                        break;
                    case "key":
                        performKeyEvent(data);
                        break;
                    case "text":
                        performTextInput(data);
                        break;
                    case "swipe":
                        performSwipe(data);
                        break;
                    case "long_press":
                        performLongPress(data);
                        break;
                    case "drag":
                        performDrag(data);
                        break;
                }
            }

            mainHandler.post(() -> {
                if (listener != null) listener.onCommand(command);
            });

        } catch (JSONException e) {
            Log.e(TAG, "Failed to handle command", e);
        }
    }

    private void performTouch(JSONObject data) throws JSONException {
        int x = data.getInt("x");
        int y = data.getInt("y");
        
        if (accessibilityService != null) {
            accessibilityService.performTouch(x, y);
        }
    }

    private void performKeyEvent(JSONObject data) throws JSONException {
        int keyCode = data.getInt("keyCode");
        
        if (accessibilityService != null) {
            // Key events need to be implemented in AccessibilityControlService
            Log.d(TAG, "Key event: " + keyCode);
        }
    }

    private void performTextInput(JSONObject data) throws JSONException {
        String text = data.getString("text");
        
        if (accessibilityService != null) {
            // Text input needs to be implemented in AccessibilityControlService
            Log.d(TAG, "Text input: " + text);
        }
    }

    private void performSwipe(JSONObject data) throws JSONException {
        int startX = data.getInt("startX");
        int startY = data.getInt("startY");
        int endX = data.getInt("endX");
        int endY = data.getInt("endY");
        
        if (accessibilityService != null) {
            accessibilityService.performSwipe(startX, startY, endX, endY, 500);
        }
    }

    private void performLongPress(JSONObject data) throws JSONException {
        int x = data.getInt("x");
        int y = data.getInt("y");
        int duration = data.optInt("duration", 1000);
        
        if (accessibilityService != null) {
            // Long press needs to be implemented in AccessibilityControlService
            Log.d(TAG, "Long press: (" + x + ", " + y + ") duration: " + duration);
        }
    }

    private void performDrag(JSONObject data) throws JSONException {
        JSONArray pointsArray = data.getJSONArray("points");
        
        if (accessibilityService != null) {
            // Drag needs to be implemented in AccessibilityControlService
            Log.d(TAG, "Drag gesture with " + pointsArray.length() + " points");
        }
    }

    private void sendScreenData(android.graphics.Bitmap bitmap) {
        if (bitmap == null) return;
        
        try {
            java.io.ByteArrayOutputStream stream = new java.io.ByteArrayOutputStream();
            bitmap.compress(android.graphics.Bitmap.CompressFormat.JPEG, 80, stream);
            byte[] byteArray = stream.toByteArray();
            String base64Image = Base64.encodeToString(byteArray, Base64.NO_WRAP);
            
            JSONObject screenData = new JSONObject();
            screenData.put("imageData", base64Image);
            screenData.put("width", bitmap.getWidth());
            screenData.put("height", bitmap.getHeight());
            screenData.put("format", "JPEG");
            screenData.put("timestamp", System.currentTimeMillis());
            
            JSONObject message = new JSONObject();
            message.put("type", "screen_data");
            message.put("data", screenData);
            message.put("timestamp", System.currentTimeMillis());
            
            sendMessage(message);
            
        } catch (Exception e) {
            Log.e(TAG, "Failed to send screen data", e);
        }
    }

    private void sendMessage(JSONObject message) {
        if (!isConnected.get() || writer == null) return;
        
        try {
            String messageStr = message.toString() + "\n";
            writer.write(messageStr);
            writer.flush();
        } catch (IOException e) {
            Log.e(TAG, "Failed to send message", e);
            disconnect();
        }
    }

    public void disconnect() {
        shouldReconnect.set(false);
        isConnected.set(false);
        
        try {
            if (writer != null) writer.close();
            if (reader != null) reader.close();
            if (socket != null) socket.close();
        } catch (IOException e) {
            Log.e(TAG, "Error closing connections", e);
        }
        
        mainHandler.post(() -> {
            if (listener != null) listener.onDisconnected();
        });
    }

    private int getBatteryLevel() {
        android.content.IntentFilter ifilter = new android.content.IntentFilter(android.content.Intent.ACTION_BATTERY_CHANGED);
        android.content.Intent batteryStatus = context.registerReceiver(null, ifilter);
        int level = batteryStatus.getIntExtra(android.os.BatteryManager.EXTRA_LEVEL, -1);
        int scale = batteryStatus.getIntExtra(android.os.BatteryManager.EXTRA_SCALE, -1);
        return Math.round((level / (float) scale) * 100);
    }

    private int getScreenWidth() {
        android.view.WindowManager wm = (android.view.WindowManager) context.getSystemService(Context.WINDOW_SERVICE);
        android.view.Display display = wm.getDefaultDisplay();
        android.graphics.Point size = new android.graphics.Point();
        display.getSize(size);
        return size.x;
    }

    private int getScreenHeight() {
        android.view.WindowManager wm = (android.view.WindowManager) context.getSystemService(Context.WINDOW_SERVICE);
        android.view.Display display = wm.getDefaultDisplay();
        android.graphics.Point size = new android.graphics.Point();
        display.getSize(size);
        return size.y;
    }

    public boolean isConnected() {
        return isConnected.get();
    }

    public static TCPClient getInstance() {
        return MainActivity.getTcpClient();
    }

    public void setDeviceId(String deviceId) {
        this.deviceId = deviceId;
    }
}
