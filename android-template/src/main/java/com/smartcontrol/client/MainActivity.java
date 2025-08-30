package com.smartcontrol.client;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.projection.MediaProjectionManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.util.Log;
import android.widget.Button;
import android.widget.TextView;
import android.widget.EditText;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import org.json.JSONObject;

public class MainActivity extends AppCompatActivity {

    private static final String TAG = "MainActivity";
    private static final int REQUEST_CODE_SCREEN_CAPTURE = 1000;
    private static final int REQUEST_CODE_ACCESSIBILITY = 1001;

    private static MainActivity instance;
    private TCPClient tcpClient;
    private TextView statusText;
    private Button connectButton;
    private ScreenCaptureService screenCaptureService;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        instance = this;
        statusText = findViewById(R.id.status_text);
        connectButton = findViewById(R.id.connect_button);

        setupTCPClient();
        checkPermissions();
        setupServerConfiguration();
    }

    private void initViews() {
        statusText = findViewById(R.id.statusText);
        startButton = findViewById(R.id.startButton);
        stopButton = findViewById(R.id.stopButton);
        serverHostInput = findViewById(R.id.serverHostInput);
        serverPortInput = findViewById(R.id.serverPortInput);

        // Set default server info
        serverHostInput.setText("YOUR_REPLIT_URL.replit.dev");
        serverPortInput.setText("8080");

        startButton.setOnClickListener(v -> startServices());
        stopButton.setOnClickListener(v -> stopServices());

        updateUI();
    }

    private void setupTCPClient() {
        tcpClient = new TCPClient(this);
        tcpClient.setListener(new TCPClient.TCPClientListener() {
            @Override
            public void onConnected() {
                runOnUiThread(() -> {
                    statusText.setText("Conectado ao servidor");
                    isServiceRunning = true;
                    updateUI();
                });
            }

            @Override
            public void onDisconnected() {
                runOnUiThread(() -> {
                    statusText.setText("Desconectado do servidor");
                    updateUI();
                });
            }

            @Override
            public void onCommand(JSONObject command) {
                // Handle commands from server
                handleRemoteCommand(command);
            }

            @Override
            public void onError(String error) {
                runOnUiThread(() -> {
                    statusText.setText("Erro: " + error);
                    updateUI();
                });
            }
        });
    }

    private void handleRemoteCommand(JSONObject command) {
        try {
            String type = command.getString("type");

            switch (type) {
                case "touch":
                    if (command.has("data")) {
                        JSONObject data = command.getJSONObject("data");
                        int x = data.getInt("x");
                        int y = data.getInt("y");
                        // Implement touch simulation using AccessibilityService
                        simulateTouch(x, y);
                    }
                    break;

                case "key":
                    if (command.has("data")) {
                        JSONObject data = command.getJSONObject("data");
                        int keyCode = data.getInt("keyCode");
                        // Implement key press simulation
                        simulateKeyPress(keyCode);
                    }
                    break;

                case "text":
                    if (command.has("data")) {
                        JSONObject data = command.getJSONObject("data");
                        String text = data.getString("text");
                        // Implement text input
                        simulateTextInput(text);
                    }
                    break;

                case "home":
                    simulateKeyPress(3); // HOME key
                    break;

                case "back":
                    simulateKeyPress(4); // BACK key
                    break;

                case "recent":
                    simulateKeyPress(187); // RECENT_APPS key
                    break;

                case "power":
                    simulateKeyPress(26); // POWER key
                    break;

                case "volume_up":
                    simulateKeyPress(24); // VOLUME_UP key
                    break;

                case "volume_down":
                    simulateKeyPress(25); // VOLUME_DOWN key
                    break;

                case "screenshot":
                    takeScreenshot();
                    break;
                default:
                    Log.w(TAG, "Unknown command type: " + type);
            }
        } catch (org.json.JSONException e) {
            Log.e(TAG, "Error parsing command", e);
        }
    }

    private void simulateTouch(int x, int y) {
        // This requires AccessibilityService to be implemented
        Intent intent = new Intent(this, AccessibilityControlService.class);
        intent.putExtra("action", "touch");
        intent.putExtra("x", x);
        intent.putExtra("y", y);
        startService(intent);
    }

    private void simulateKeyPress(int keyCode) {
        // This requires AccessibilityService to be implemented
        Intent intent = new Intent(this, AccessibilityControlService.class);
        intent.putExtra("action", "key");
        intent.putExtra("keyCode", keyCode);
        startService(intent);
    }

    private void simulateTextInput(String text) {
        // This requires AccessibilityService to be implemented
        Intent intent = new Intent(this, AccessibilityControlService.class);
        intent.putExtra("action", "text");
        intent.putExtra("text", text);
        startService(intent);
    }

    private void takeScreenshot() {
        // This will be handled by ScreenCaptureService
        Intent intent = new Intent(this, ScreenCaptureService.class);
        intent.putExtra("action", "screenshot");
        startService(intent);
    }

    private void checkPermissions() {
        // Check and request necessary permissions
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!Settings.canDrawOverlays(this)) {
                requestOverlayPermission();
                return;
            }
        }

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.WRITE_EXTERNAL_STORAGE)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this,
                    new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE,
                            Manifest.permission.READ_EXTERNAL_STORAGE,
                            Manifest.permission.RECORD_AUDIO},
                    REQUEST_STORAGE_PERMISSION);
        }
    }

    private void requestOverlayPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + getPackageName()));
            startActivityForResult(intent, REQUEST_OVERLAY_PERMISSION);
        }
    }

    private void startServices() {
        // Update server info
        String host = serverHostInput.getText().toString().trim();
        String portStr = serverPortInput.getText().toString().trim();

        if (host.isEmpty()) {
            Toast.makeText(this, "Digite o endereço do servidor", Toast.LENGTH_SHORT).show();
            return;
        }

        try {
            int port = Integer.parseInt(portStr);
            tcpClient.setServerInfo(host, port);
        } catch (NumberFormatException e) {
            Toast.makeText(this, "Porta inválida", Toast.LENGTH_SHORT).show();
            return;
        }

        // Request MediaProjection permission
        MediaProjectionManager mediaProjectionManager =
                (MediaProjectionManager) getSystemService(MEDIA_PROJECTION_SERVICE);
        Intent intent = mediaProjectionManager.createScreenCaptureIntent();
        startActivityForResult(intent, REQUEST_MEDIA_PROJECTION);
    }

    private void stopServices() {
        // Stop screen capture service
        Intent screenCaptureIntent = new Intent(this, ScreenCaptureService.class);
        stopService(screenCaptureIntent);

        // Disconnect TCP client
        if (tcpClient != null) {
            tcpClient.disconnect();
        }

        isServiceRunning = false;
        updateUI();
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode == REQUEST_MEDIA_PROJECTION) {
            if (resultCode == RESULT_OK) {
                // Start screen capture service
                Intent serviceIntent = new Intent(this, ScreenCaptureService.class);
                serviceIntent.putExtra("data", data);
                serviceIntent.putExtra("result_code", resultCode);
                startService(serviceIntent);

                // Connect TCP client
                tcpClient.connect();

                statusText.setText("Conectando...");
                updateUI();
            } else {
                Toast.makeText(this, "Permissão de captura de tela negada", Toast.LENGTH_SHORT).show();
            }
        }
    }

    private void updateUI() {
        startButton.setEnabled(!isServiceRunning);
        stopButton.setEnabled(isServiceRunning);
        serverHostInput.setEnabled(!isServiceRunning);
        serverPortInput.setEnabled(!isServiceRunning);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions,
                                         @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

        if (requestCode == REQUEST_STORAGE_PERMISSION) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                Toast.makeText(this, "Permissões concedidas", Toast.LENGTH_SHORT).show();
            } else {
                Toast.makeText(this, "Permissões necessárias para funcionamento", Toast.LENGTH_SHORT).show();
            }
        }
    }

    private void handleQuickAction(AccessibilityService accessibilityService, String action) {
        switch (action) {
            case "home":
                accessibilityService.performHome();
                break;
            case "back":
                accessibilityService.performBack();
                break;
            case "recent":
                accessibilityService.performRecents();
                break;
            case "power":
                accessibilityService.performPowerDialog();
                break;
            case "volume_up":
                // Simulate volume up key
                simulateKeyEvent(android.view.KeyEvent.KEYCODE_VOLUME_UP);
                break;
            case "volume_down":
                // Simulate volume down key
                simulateKeyEvent(android.view.KeyEvent.KEYCODE_VOLUME_DOWN);
                break;
            default:
                Log.w(TAG, "Unknown quick action: " + action);
        }
    }

    private void simulateKeyEvent(int keyCode) {
        try {
            Runtime.getRuntime().exec("input keyevent " + keyCode);
        } catch (Exception e) {
            Log.e(TAG, "Error simulating key event", e);
        }
    }

    private void takeScreenshot() {
        if (screenCaptureService != null) {
            screenCaptureService.requestScreenshot();
        } else {
            startScreenCaptureService();
        }
    }

    private void requestScreenCapture() {
        if (screenCaptureService != null) {
            // Screen capture is already running, just notify
            Log.d(TAG, "Screen capture already active");
        } else {
            startScreenCaptureService();
        }
    }

    private void startScreenCaptureService() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            MediaProjectionManager projectionManager =
                    (MediaProjectionManager) getSystemService(Context.MEDIA_PROJECTION_SERVICE);

            Intent captureIntent = projectionManager.createScreenCaptureIntent();
            startActivityForResult(captureIntent, REQUEST_CODE_SCREEN_CAPTURE);
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode == REQUEST_CODE_SCREEN_CAPTURE) {
            if (resultCode == RESULT_OK) {
                Intent serviceIntent = new Intent(this, ScreenCaptureService.class);
                serviceIntent.putExtra("resultCode", resultCode);
                serviceIntent.putExtra("data", data);

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    startForegroundService(serviceIntent);
                } else {
                    startService(serviceIntent);
                }
            } else {
                Toast.makeText(this, "Screen capture permission denied", Toast.LENGTH_SHORT).show();
            }
        }
    }

    public static TCPClient getTcpClient() {
        return instance != null ? instance.tcpClient : null;
    }

    private void setupServerConfiguration() {
        // Server configuration inputs
        EditText serverIpInput = findViewById(R.id.server_ip);
        EditText serverPortInput = findViewById(R.id.server_port);

        // Load saved server configuration
        String savedIp = getSharedPreferences("config", MODE_PRIVATE)
                .getString("server_ip", getString(R.string.server_ip));
        int savedPort = getSharedPreferences("config", MODE_PRIVATE)
                .getInt("server_port", Integer.parseInt(getString(R.string.server_port)));

        serverIpInput.setText(savedIp);
        serverPortInput.setText(String.valueOf(savedPort));

        connectButton.setOnClickListener(v -> {
            if (tcpClient.isConnected()) {
                tcpClient.disconnect();
            } else {
                // Update server configuration
                String ip = serverIpInput.getText().toString().trim();
                String portStr = serverPortInput.getText().toString().trim();

                if (!ip.isEmpty() && !portStr.isEmpty()) {
                    try {
                        int port = Integer.parseInt(portStr);

                        // Save configuration
                        getSharedPreferences("config", MODE_PRIVATE)
                                .edit()
                                .putString("server_ip", ip)
                                .putInt("server_port", port)
                                .apply();

                        // Update TCP client configuration
                        tcpClient.setServerConfig(ip, port);
                        tcpClient.connect();
                    } catch (NumberFormatException e) {
                        Toast.makeText(this, "Invalid port number", Toast.LENGTH_SHORT).show();
                    }
                } else {
                    Toast.makeText(this, "Please enter server IP and port", Toast.LENGTH_SHORT).show();
                }
            }
        });
    }
}