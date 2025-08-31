package com.smartcontrol.client;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.PixelFormat;
import android.hardware.display.DisplayManager;
import android.hardware.display.VirtualDisplay;
import android.media.Image;
import android.media.ImageReader;
import android.media.projection.MediaProjection;
import android.media.projection.MediaProjectionManager;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.util.Base64;
import android.util.DisplayMetrics;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;
import java.util.concurrent.atomic.AtomicBoolean;
import org.json.JSONObject;

public class ScreenCaptureService extends Service {

    private static final String TAG = "ScreenCaptureService";
    private static final String CHANNEL_ID = "ScreenCaptureChannel";
    private static final int NOTIFICATION_ID = 1;

    private MediaProjection mediaProjection;
    private VirtualDisplay virtualDisplay;
    private ImageReader imageReader;
    private Handler backgroundHandler;
    private AtomicBoolean isCapturing = new AtomicBoolean(false);

    private int screenWidth;
    private int screenHeight;
    private int screenDensity;

    private TCPClient tcpClient;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        initializeScreenMetrics();
        // Get a handler for the background thread
        Handler handler = new Handler();
        backgroundHandler = handler;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && intent.hasExtra("data") && intent.hasExtra("resultCode")) {
            int resultCode = intent.getIntExtra("resultCode", -1);
            Intent data = intent.getParcelableExtra("data");

            startForeground(NOTIFICATION_ID, createNotification());
            startScreenCapture(resultCode, data);
        } else {
            Log.e(TAG, "Invalid intent extras received.");
            stopSelf();
        }

        return START_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Screen Capture Service",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("SmartControl screen capture service");

            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private Notification createNotification() {
        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("SmartControl Active")
                .setContentText("Screen sharing is active")
                .setSmallIcon(R.drawable.ic_notification) // Make sure you have this drawable
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setOngoing(true)
                .build();
    }

    private void initializeScreenMetrics() {
        DisplayMetrics metrics = getResources().getDisplayMetrics();
        screenWidth = metrics.widthPixels;
        screenHeight = metrics.heightPixels;
        screenDensity = metrics.densityDpi;

        Log.d(TAG, "Screen metrics: " + screenWidth + "x" + screenHeight + " density: " + screenDensity);
    }

    private void startScreenCapture(int resultCode, Intent data) {
        MediaProjectionManager projectionManager =
            (MediaProjectionManager) getSystemService(Context.MEDIA_PROJECTION_SERVICE);

        mediaProjection = projectionManager.getMediaProjection(resultCode, data);

        if (mediaProjection != null) {
            setupImageReader();
            setupVirtualDisplay();
            isCapturing.set(true);
            Log.d(TAG, "Screen capture started");
        } else {
            Log.e(TAG, "Failed to create MediaProjection");
            stopSelf();
        }
    }

    private void setupImageReader() {
        imageReader = ImageReader.newInstance(screenWidth, screenHeight, PixelFormat.RGBA_8888, 2);

        imageReader.setOnImageAvailableListener(new ImageReader.OnImageAvailableListener() {
            @Override
            public void onImageAvailable(ImageReader reader) {
                if (!isCapturing.get()) return;

                Image image = null;
                try {
                    image = reader.acquireLatestImage();
                    if (image != null) {
                        processScreenshot(image);
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Error processing screenshot", e);
                } finally {
                    if (image != null) {
                        image.close();
                    }
                }
            }
        }, backgroundHandler);
    }

    private void setupVirtualDisplay() {
        virtualDisplay = mediaProjection.createVirtualDisplay(
            "SmartControlCapture",
            screenWidth,
            screenHeight,
            screenDensity,
            DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
            imageReader.getSurface(),
            null,
            backgroundHandler
        );
    }

    private void processScreenshot(Image image) {
        try {
            Image.Plane[] planes = image.getPlanes();
            ByteBuffer buffer = planes[0].getBuffer();
            int pixelStride = planes[0].getPixelStride();
            int rowStride = planes[0].getRowStride();
            int rowPadding = rowStride - pixelStride * screenWidth;

            Bitmap bitmap = Bitmap.createBitmap(
                screenWidth + rowPadding / pixelStride,
                screenHeight,
                Bitmap.Config.ARGB_8888
            );
            bitmap.copyPixelsFromBuffer(buffer);

            // Crop bitmap if there's padding
            if (rowPadding != 0) {
                bitmap = Bitmap.createBitmap(bitmap, 0, 0, screenWidth, screenHeight);
            }

            // Compress and send to server
            sendScreenData(bitmap);

        } catch (Exception e) {
            Log.e(TAG, "Error processing image", e);
        }
    }

    private void sendScreenData(Bitmap bitmap) {
        if (tcpClient == null) return;

        try {
            // Compress bitmap to JPEG
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            bitmap.compress(Bitmap.CompressFormat.JPEG, 70, baos); // 70% quality for better performance
            byte[] imageBytes = baos.toByteArray();
            String base64Image = Base64.encodeToString(imageBytes, Base64.NO_WRAP);

            // Create screen data message
            JSONObject screenData = new JSONObject();
            screenData.put("imageData", base64Image);
            screenData.put("width", screenWidth);
            screenData.put("height", screenHeight);
            screenData.put("format", "JPEG");
            screenData.put("timestamp", System.currentTimeMillis());

            JSONObject message = new JSONObject();
            message.put("type", "screen_data");
            message.put("data", screenData);
            message.put("timestamp", System.currentTimeMillis());

            // Send via TCP client (needs proper method)
            // tcpClient.sendMessage(message);
            Log.d(TAG, "Screen data ready to send");

        } catch (Exception e) {
            Log.e(TAG, "Error sending screen data", e);
        }
    }

    public void setTCPClient(TCPClient tcpClient) {
        this.tcpClient = tcpClient;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        stopScreenCapture();
    }

    private void stopScreenCapture() {
        isCapturing.set(false);

        if (virtualDisplay != null) {
            virtualDisplay.release();
            virtualDisplay = null;
        }

        if (imageReader != null) {
            imageReader.close();
            imageReader = null;
        }

        if (mediaProjection != null) {
            mediaProjection.stop();
            mediaProjection = null;
        }

        Log.d(TAG, "Screen capture stopped");
    }
}
