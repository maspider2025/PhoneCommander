
package com.smartcontrol.client;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.util.Log;

public class BootReceiver extends BroadcastReceiver {
    
    private static final String TAG = "BootReceiver";
    
    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        
        if (Intent.ACTION_BOOT_COMPLETED.equals(action) || 
            Intent.ACTION_MY_PACKAGE_REPLACED.equals(action) ||
            Intent.ACTION_PACKAGE_REPLACED.equals(action)) {
            
            Log.d(TAG, "Boot completed or package replaced");
            
            // Check if auto-start is enabled
            SharedPreferences prefs = context.getSharedPreferences("config", Context.MODE_PRIVATE);
            boolean autoStart = prefs.getBoolean("auto_start", true);
            
            if (autoStart) {
                Log.d(TAG, "Auto-starting SmartControl service");
                
                // Start the main activity
                Intent startIntent = new Intent(context, MainActivity.class);
                startIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(startIntent);
            }
        }
    }
}
