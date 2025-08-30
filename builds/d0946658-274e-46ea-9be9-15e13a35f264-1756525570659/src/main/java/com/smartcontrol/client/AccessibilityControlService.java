package com.smartcontrol.client;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.GestureDescription;
import android.graphics.Path;
import android.os.Build;
import android.util.Log;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;

public class AccessibilityControlService extends AccessibilityService {
    
    private static final String TAG = "AccessibilityControl";
    private static AccessibilityControlService instance;

    @Override
    public void onServiceConnected() {
        super.onServiceConnected();
        instance = this;
        Log.d(TAG, "Accessibility service connected");
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        // Handle accessibility events if needed
    }

    @Override
    public void onInterrupt() {
        Log.d(TAG, "Accessibility service interrupted");
    }

    public static AccessibilityControlService getInstance() {
        return instance;
    }

    public void performTouch(float x, float y) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            Path path = new Path();
            path.moveTo(x, y);
            
            GestureDescription.StrokeDescription stroke = 
                new GestureDescription.StrokeDescription(path, 0, 100);
            
            GestureDescription.Builder builder = new GestureDescription.Builder();
            builder.addStroke(stroke);
            
            GestureDescription gesture = builder.build();
            
            boolean result = dispatchGesture(gesture, new GestureResultCallback() {
                @Override
                public void onCompleted(GestureDescription gestureDescription) {
                    super.onCompleted(gestureDescription);
                    Log.d(TAG, "Touch gesture completed at (" + x + ", " + y + ")");
                }
                
                @Override
                public void onCancelled(GestureDescription gestureDescription) {
                    super.onCancelled(gestureDescription);
                    Log.w(TAG, "Touch gesture cancelled");
                }
            }, null);
            
            if (!result) {
                Log.e(TAG, "Failed to dispatch touch gesture");
            }
        } else {
            Log.w(TAG, "Touch gestures require Android N or higher");
        }
    }

    public void performSwipe(float startX, float startY, float endX, float endY, int duration) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            Path path = new Path();
            path.moveTo(startX, startY);
            path.lineTo(endX, endY);
            
            GestureDescription.StrokeDescription stroke = 
                new GestureDescription.StrokeDescription(path, 0, duration);
            
            GestureDescription.Builder builder = new GestureDescription.Builder();
            builder.addStroke(stroke);
            
            GestureDescription gesture = builder.build();
            
            dispatchGesture(gesture, new GestureResultCallback() {
                @Override
                public void onCompleted(GestureDescription gestureDescription) {
                    super.onCompleted(gestureDescription);
                    Log.d(TAG, "Swipe gesture completed");
                }
            }, null);
        }
    }

    public void performGlobalAction(int action) {
        boolean result = performGlobalAction(action);
        Log.d(TAG, "Global action " + action + " result: " + result);
    }

    public void performHome() {
        performGlobalAction(GLOBAL_ACTION_HOME);
    }

    public void performBack() {
        performGlobalAction(GLOBAL_ACTION_BACK);
    }

    public void performRecents() {
        performGlobalAction(GLOBAL_ACTION_RECENTS);
    }

    public void performPowerDialog() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            performGlobalAction(GLOBAL_ACTION_POWER_DIALOG);
        }
    }

    public void inputText(String text) {
        AccessibilityNodeInfo nodeInfo = getRootInActiveWindow();
        if (nodeInfo != null) {
            AccessibilityNodeInfo editText = findEditTextNode(nodeInfo);
            if (editText != null && editText.isEditable()) {
                android.os.Bundle arguments = new android.os.Bundle();
                arguments.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, text);
                editText.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, arguments);
                Log.d(TAG, "Text input: " + text);
            } else {
                Log.w(TAG, "No editable text field found");
            }
        }
    }

    private AccessibilityNodeInfo findEditTextNode(AccessibilityNodeInfo root) {
        if (root == null) return null;
        
        if (root.isEditable() && root.isFocused()) {
            return root;
        }
        
        for (int i = 0; i < root.getChildCount(); i++) {
            AccessibilityNodeInfo child = root.getChild(i);
            if (child != null) {
                AccessibilityNodeInfo result = findEditTextNode(child);
                if (result != null) {
                    return result;
                }
            }
        }
        
        return null;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        instance = null;
        Log.d(TAG, "Accessibility service destroyed");
    }
}
