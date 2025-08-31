package com.smartcontrol.client;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import okhttp3.*;
import org.json.JSONException;
import org.json.JSONObject;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

public class WebSocketClient extends WebSocketListener {
    private static final String TAG = "WebSocketClient";
    private static final int RECONNECT_INTERVAL_MS = 5000;
    private static final int MAX_RECONNECT_ATTEMPTS = 10;
    
    private WebSocket webSocket;
    private OkHttpClient httpClient;
    private AtomicBoolean isConnected = new AtomicBoolean(false);
    private AtomicBoolean shouldReconnect = new AtomicBoolean(true);
    private Handler mainHandler;
    private Context context;
    private WebSocketClientListener listener;
    private String serverUrl;
    private int reconnectAttempts = 0;

    public interface WebSocketClientListener {
        void onConnected();
        void onDisconnected();
        void onMessage(JSONObject message);
        void onError(String error);
    }

    public WebSocketClient(Context context) {
        this.context = context;
        this.mainHandler = new Handler(Looper.getMainLooper());
        
        this.httpClient = new OkHttpClient.Builder()
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(0, TimeUnit.MILLISECONDS) // Keep connection alive
            .writeTimeout(10, TimeUnit.SECONDS)
            .retryOnConnectionFailure(true)
            .pingInterval(30, TimeUnit.SECONDS) // Send ping every 30 seconds
            .build();
    }

    public void setListener(WebSocketClientListener listener) {
        this.listener = listener;
    }

    public void connect(String host, int port) {
        if (isConnected.get()) {
            Log.d(TAG, "Already connected to WebSocket");
            return;
        }

        this.serverUrl = String.format("wss://%s:%d/ws", host, port);
        Log.d(TAG, "Connecting to WebSocket: " + serverUrl);

        Request request = new Request.Builder()
            .url(serverUrl)
            .addHeader("User-Agent", "SmartControl-Android-Client")
            .build();

        webSocket = httpClient.newWebSocket(request, this);
    }

    public void disconnect() {
        shouldReconnect.set(false);
        if (webSocket != null) {
            webSocket.close(1000, "Client disconnect");
        }
        isConnected.set(false);
    }

    public void sendMessage(JSONObject message) {
        if (webSocket != null && isConnected.get()) {
            try {
                String messageString = message.toString();
                Log.d(TAG, "Sending WebSocket message: " + messageString);
                webSocket.send(messageString);
            } catch (Exception e) {
                Log.e(TAG, "Error sending WebSocket message", e);
            }
        } else {
            Log.w(TAG, "WebSocket not connected, cannot send message");
        }
    }

    @Override
    public void onOpen(WebSocket webSocket, Response response) {
        super.onOpen(webSocket, response);
        Log.d(TAG, "WebSocket connected successfully");
        isConnected.set(true);
        reconnectAttempts = 0;
        
        mainHandler.post(() -> {
            if (listener != null) listener.onConnected();
        });
        
        // Send initial connection message
        sendInitialMessage();
    }

    @Override
    public void onMessage(WebSocket webSocket, String text) {
        super.onMessage(webSocket, text);
        Log.d(TAG, "WebSocket message received: " + text);
        
        try {
            JSONObject message = new JSONObject(text);
            mainHandler.post(() -> {
                if (listener != null) listener.onMessage(message);
            });
        } catch (JSONException e) {
            Log.e(TAG, "Error parsing WebSocket message", e);
        }
    }

    @Override
    public void onClosing(WebSocket webSocket, int code, String reason) {
        super.onClosing(webSocket, code, reason);
        Log.d(TAG, "WebSocket closing: " + code + " " + reason);
    }

    @Override
    public void onClosed(WebSocket webSocket, int code, String reason) {
        super.onClosed(webSocket, code, reason);
        Log.d(TAG, "WebSocket closed: " + code + " " + reason);
        isConnected.set(false);
        
        mainHandler.post(() -> {
            if (listener != null) listener.onDisconnected();
        });
        
        // Attempt reconnection if needed
        if (shouldReconnect.get() && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            scheduleReconnect();
        }
    }

    @Override
    public void onFailure(WebSocket webSocket, Throwable t, Response response) {
        super.onFailure(webSocket, t, response);
        Log.e(TAG, "WebSocket connection failed", t);
        isConnected.set(false);
        
        String errorMessage = "WebSocket connection failed: " + t.getMessage();
        if (response != null) {
            errorMessage += " (HTTP " + response.code() + ")";
        }
        
        final String finalErrorMessage = errorMessage;
        mainHandler.post(() -> {
            if (listener != null) listener.onError(finalErrorMessage);
        });
        
        // Attempt reconnection if needed
        if (shouldReconnect.get() && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            scheduleReconnect();
        }
    }

    private void scheduleReconnect() {
        reconnectAttempts++;
        Log.d(TAG, "Scheduling WebSocket reconnect attempt " + reconnectAttempts + "/" + MAX_RECONNECT_ATTEMPTS);
        
        mainHandler.postDelayed(() -> {
            if (shouldReconnect.get() && !isConnected.get()) {
                String[] urlParts = serverUrl.replace("wss://", "").replace("/ws", "").split(":");
                if (urlParts.length == 2) {
                    try {
                        connect(urlParts[0], Integer.parseInt(urlParts[1]));
                    } catch (NumberFormatException e) {
                        Log.e(TAG, "Invalid port in server URL", e);
                    }
                }
            }
        }, RECONNECT_INTERVAL_MS);
    }

    private void sendInitialMessage() {
        try {
            JSONObject message = new JSONObject();
            message.put("type", "device_info");
            message.put("deviceId", getDeviceId());
            message.put("model", android.os.Build.MODEL);
            message.put("manufacturer", android.os.Build.MANUFACTURER);
            message.put("androidVersion", android.os.Build.VERSION.RELEASE);
            message.put("timestamp", System.currentTimeMillis());
            
            sendMessage(message);
        } catch (JSONException e) {
            Log.e(TAG, "Error creating initial WebSocket message", e);
        }
    }

    private String getDeviceId() {
        return android.provider.Settings.Secure.getString(
            context.getContentResolver(),
            android.provider.Settings.Secure.ANDROID_ID
        );
    }

    public boolean isConnected() {
        return isConnected.get();
    }
}