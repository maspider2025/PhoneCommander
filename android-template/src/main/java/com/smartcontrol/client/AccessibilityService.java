package com.smartcontrol.client;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.GestureDescription;
import android.graphics.Path;
import android.util.Log;
import android.view.accessibility.AccessibilityEvent;

public class AccessibilityService extends AccessibilityService {
    private static final String TAG = "AccessibilityService";
    private static AccessibilityService instance;

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        Log.d(TAG, "Accessibility service created");
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        // Handle accessibility events
    }

    @Override
    public void onInterrupt() {
        Log.d(TAG, "Accessibility service interrupted");
    }

    public static AccessibilityService getInstance() {
        return instance;
    }

    public boolean performClick(int x, int y) {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.N) {
            Path clickPath = new Path();
            clickPath.moveTo(x, y);

            GestureDescription.StrokeDescription clickStroke = 
                new GestureDescription.StrokeDescription(clickPath, 0, 100);

            GestureDescription.Builder gestureBuilder = new GestureDescription.Builder();
            gestureBuilder.addStroke(clickStroke);

            return dispatchGesture(gestureBuilder.build(), null, null);
        }
        return false;
    }

    public boolean performSwipe(int startX, int startY, int endX, int endY) {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.N) {
            Path swipePath = new Path();
            swipePath.moveTo(startX, startY);
            swipePath.lineTo(endX, endY);

            GestureDescription.StrokeDescription swipeStroke = 
                new GestureDescription.StrokeDescription(swipePath, 0, 500);

            GestureDescription.Builder gestureBuilder = new GestureDescription.Builder();
            gestureBuilder.addStroke(swipeStroke);

            return dispatchGesture(gestureBuilder.build(), null, null);
        }
        return false;
    }
}