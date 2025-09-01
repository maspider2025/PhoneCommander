
package com.smartcontrol.client;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;
import android.util.Log;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Switch;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import org.json.JSONObject;

public class MainActivity extends AppCompatActivity implements TCPClient.TCPClientListener {
    private static final String TAG = "MainActivity";
    private static final String PREFS_NAME = "SmartControlPrefs";
    private static final int REQUEST_ACCESSIBILITY = 1;
    private static final int REQUEST_OVERLAY = 2;
    private static final int REQUEST_SCREEN_CAPTURE = 3;

    private static final String DEFAULT_SERVER_HOST = "39a08aae-8692-447d-a7bc-40719fced504-00-llb8zdmsupxy.picard.replit.dev";
    private static final int DEFAULT_SERVER_PORT = 8081;

    private static TCPClient tcpClient;
    private AccessibilityControlService accessibilityService;
    private ScreenCaptureService screenCaptureService;

    private EditText etServerHost;
    private EditText etServerPort;
    private Button btnConnect;
    private Button btnDisconnect;
    private Switch swAutoConnect;
    private TextView tvStatus;
    private TextView tvDeviceInfo;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        
        initViews();
        setupTcpClient();
        loadSettings();
        
        // Check and request permissions
        checkPermissions();
        
        // Auto-connect if enabled
        if (swAutoConnect.isChecked()) {
            connectToServer();
        }
    }

    private void initViews() {
        etServerHost = findViewById(R.id.et_server_host);
        etServerPort = findViewById(R.id.et_server_port);
        btnConnect = findViewById(R.id.btn_connect);
        btnDisconnect = findViewById(R.id.btn_disconnect);
        swAutoConnect = findViewById(R.id.sw_auto_connect);
        tvStatus = findViewById(R.id.tv_status);
        tvDeviceInfo = findViewById(R.id.tv_device_info);

        btnConnect.setOnClickListener(v -> connectToServer());
        btnDisconnect.setOnClickListener(v -> disconnectFromServer());
        
        updateDeviceInfo();
        updateConnectionStatus();
    }

    private void setupTcpClient() {
        if (tcpClient == null) {
            tcpClient = new TCPClient(this);
            tcpClient.setListener(this);
        }
    }

    private void loadSettings() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        
        String serverHost = getResources().getString(R.string.server_ip);
        int serverPort = Integer.parseInt(getResources().getString(R.string.server_port));
        boolean autoStart = Boolean.parseBoolean(getResources().getString(R.string.auto_start));
        
        etServerHost.setText(serverHost.isEmpty() ? DEFAULT_SERVER_HOST : serverHost);
        etServerPort.setText(String.valueOf(serverPort == 0 ? DEFAULT_SERVER_PORT : serverPort));
        swAutoConnect.setChecked(autoStart);
    }

    private void saveSettings() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        
        editor.putString("server_host", etServerHost.getText().toString());
        editor.putInt("server_port", Integer.parseInt(etServerPort.getText().toString()));
        editor.putBoolean("auto_connect", swAutoConnect.isChecked());
        editor.apply();
    }

    private void checkPermissions() {
        // Check accessibility permission
        if (!isAccessibilityServiceEnabled()) {
            requestAccessibilityPermission();
        }
        
        // Check overlay permission
        if (!Settings.canDrawOverlays(this)) {
            requestOverlayPermission();
        }
    }

    private boolean isAccessibilityServiceEnabled() {
        String service = getPackageName() + "/" + AccessibilityControlService.class.getCanonicalName();
        String enabledServices = Settings.Secure.getString(getContentResolver(),
                Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES);
        
        if (enabledServices == null) return false;
        
        return enabledServices.contains(service);
    }

    private void requestAccessibilityPermission() {
        Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
        startActivityForResult(intent, REQUEST_ACCESSIBILITY);
        
        Toast.makeText(this, "Enable SmartControl Client in Accessibility Settings", 
                Toast.LENGTH_LONG).show();
    }

    private void requestOverlayPermission() {
        Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:" + getPackageName()));
        startActivityForResult(intent, REQUEST_OVERLAY);
    }

    private void connectToServer() {
        String host = etServerHost.getText().toString().trim();
        String portStr = etServerPort.getText().toString().trim();
        
        if (host.isEmpty() || portStr.isEmpty()) {
            Toast.makeText(this, "Please enter server host and port", Toast.LENGTH_SHORT).show();
            return;
        }
        
        try {
            int port = Integer.parseInt(portStr);
            tcpClient.setServerConfig(host, port);
            tcpClient.connect();
            
            saveSettings();
            
        } catch (NumberFormatException e) {
            Toast.makeText(this, "Invalid port number", Toast.LENGTH_SHORT).show();
        }
    }

    private void disconnectFromServer() {
        if (tcpClient != null) {
            tcpClient.disconnect();
        }
    }

    private void updateConnectionStatus() {
        if (tcpClient != null && tcpClient.isConnected()) {
            tvStatus.setText("Connected");
            tvStatus.setTextColor(getResources().getColor(android.R.color.holo_green_dark));
            btnConnect.setEnabled(false);
            btnDisconnect.setEnabled(true);
        } else {
            tvStatus.setText("Disconnected");
            tvStatus.setTextColor(getResources().getColor(android.R.color.holo_red_dark));
            btnConnect.setEnabled(true);
            btnDisconnect.setEnabled(false);
        }
    }

    private void updateDeviceInfo() {
        String deviceInfo = String.format(
            "Model: %s\nAndroid: %s\nAPI: %d",
            android.os.Build.MODEL,
            android.os.Build.VERSION.RELEASE,
            android.os.Build.VERSION.SDK_INT
        );
        tvDeviceInfo.setText(deviceInfo);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        
        if (requestCode == REQUEST_ACCESSIBILITY) {
            if (isAccessibilityServiceEnabled()) {
                Toast.makeText(this, "Accessibility service enabled", Toast.LENGTH_SHORT).show();
            }
        } else if (requestCode == REQUEST_OVERLAY) {
            if (Settings.canDrawOverlays(this)) {
                Toast.makeText(this, "Overlay permission granted", Toast.LENGTH_SHORT).show();
            }
        }
    }

    // TCPClient.TCPClientListener implementation
    @Override
    public void onConnected() {
        runOnUiThread(() -> {
            updateConnectionStatus();
            Toast.makeText(this, "Connected to server", Toast.LENGTH_SHORT).show();
        });
    }

    @Override
    public void onDisconnected() {
        runOnUiThread(() -> {
            updateConnectionStatus();
            Toast.makeText(this, "Disconnected from server", Toast.LENGTH_SHORT).show();
        });
    }

    @Override
    public void onCommand(JSONObject command) {
        Log.d(TAG, "Received command: " + command.toString());
    }

    @Override
    public void onError(String error) {
        runOnUiThread(() -> {
            updateConnectionStatus();
            Toast.makeText(this, "Error: " + error, Toast.LENGTH_LONG).show();
        });
    }

    public static TCPClient getTcpClient() {
        return tcpClient;
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (tcpClient != null) {
            tcpClient.disconnect();
        }
    }
}
