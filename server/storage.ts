import { devices, sessions, apkConfigurations, activityLogs, type Device, type InsertDevice, type Session, type InsertSession, type ApkConfiguration, type InsertApkConfiguration, type ActivityLog, type InsertActivityLog } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // Device operations
  getDevice(id: string): Promise<Device | undefined>;
  getDevices(): Promise<Device[]>;
  getConnectedDevices(): Promise<Device[]>;
  createDevice(device: InsertDevice): Promise<Device>;
  updateDevice(id: string, device: Partial<Device>): Promise<Device | undefined>;
  deleteDevice(id: string): Promise<boolean>;

  // Session operations
  getSession(id: string): Promise<Session | undefined>;
  getActiveSessions(): Promise<Session[]>;
  getSessionsByDevice(deviceId: string): Promise<Session[]>;
  createSession(session: InsertSession): Promise<Session>;
  updateSession(id: string, session: Partial<Session>): Promise<Session | undefined>;
  endSession(id: string): Promise<boolean>;

  // APK Configuration operations
  getApkConfiguration(id: string): Promise<ApkConfiguration | undefined>;
  getApkConfigurations(): Promise<ApkConfiguration[]>;
  createApkConfiguration(config: InsertApkConfiguration): Promise<ApkConfiguration>;
  updateApkConfiguration(id: string, config: Partial<ApkConfiguration>): Promise<ApkConfiguration | undefined>;
  deleteApkConfiguration(id: string): Promise<boolean>;

  // Activity Log operations
  getActivityLogs(limit?: number): Promise<ActivityLog[]>;
  getActivityLogsByDevice(deviceId: string, limit?: number): Promise<ActivityLog[]>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
}

export class DatabaseStorage implements IStorage {
  // Device operations
  async getDevice(id: string): Promise<Device | undefined> {
    const [device] = await db.select().from(devices).where(eq(devices.id, id));
    return device || undefined;
  }

  async getDevices(): Promise<Device[]> {
    return await db.select().from(devices).orderBy(desc(devices.lastSeen));
  }

  async getConnectedDevices(): Promise<Device[]> {
    return await db.select().from(devices).where(eq(devices.isConnected, true));
  }

  async createDevice(device: InsertDevice): Promise<Device> {
    const [newDevice] = await db.insert(devices).values(device).returning();
    return newDevice;
  }

  async updateDevice(id: string, device: Partial<Device>): Promise<Device | undefined> {
    const [updatedDevice] = await db
      .update(devices)
      .set({ ...device, lastSeen: new Date() })
      .where(eq(devices.id, id))
      .returning();
    return updatedDevice || undefined;
  }

  async deleteDevice(id: string): Promise<boolean> {
    const result = await db.delete(devices).where(eq(devices.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Session operations
  async getSession(id: string): Promise<Session | undefined> {
    const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
    return session || undefined;
  }

  async getActiveSessions(): Promise<Session[]> {
    return await db.select().from(sessions).where(eq(sessions.isActive, true));
  }

  async getSessionsByDevice(deviceId: string): Promise<Session[]> {
    return await db
      .select()
      .from(sessions)
      .where(eq(sessions.deviceId, deviceId))
      .orderBy(desc(sessions.startedAt));
  }

  async createSession(session: InsertSession): Promise<Session> {
    const [newSession] = await db.insert(sessions).values(session).returning();
    return newSession;
  }

  async updateSession(id: string, session: Partial<Session>): Promise<Session | undefined> {
    const [updatedSession] = await db
      .update(sessions)
      .set(session)
      .where(eq(sessions.id, id))
      .returning();
    return updatedSession || undefined;
  }

  async endSession(id: string): Promise<boolean> {
    const [session] = await db
      .update(sessions)
      .set({ isActive: false, endedAt: new Date() })
      .where(eq(sessions.id, id))
      .returning();
    return !!session;
  }

  // APK Configuration operations
  async getApkConfiguration(id: string): Promise<ApkConfiguration | undefined> {
    const [config] = await db.select().from(apkConfigurations).where(eq(apkConfigurations.id, id));
    return config || undefined;
  }

  async getApkConfigurations(): Promise<ApkConfiguration[]> {
    return await db.select().from(apkConfigurations).orderBy(desc(apkConfigurations.createdAt));
  }

  async createApkConfiguration(config: InsertApkConfiguration): Promise<ApkConfiguration> {
    const [newConfig] = await db.insert(apkConfigurations).values(config).returning();
    return newConfig;
  }

  async updateApkConfiguration(id: string, config: Partial<ApkConfiguration>): Promise<ApkConfiguration | undefined> {
    const [updatedConfig] = await db
      .update(apkConfigurations)
      .set(config)
      .where(eq(apkConfigurations.id, id))
      .returning();
    return updatedConfig || undefined;
  }

  async deleteApkConfiguration(id: string): Promise<boolean> {
    const result = await db.delete(apkConfigurations).where(eq(apkConfigurations.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Activity Log operations
  async getActivityLogs(limit: number = 50): Promise<ActivityLog[]> {
    return await db
      .select()
      .from(activityLogs)
      .orderBy(desc(activityLogs.timestamp))
      .limit(limit);
  }

  async getActivityLogsByDevice(deviceId: string, limit: number = 50): Promise<ActivityLog[]> {
    return await db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.deviceId, deviceId))
      .orderBy(desc(activityLogs.timestamp))
      .limit(limit);
  }

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const [newLog] = await db.insert(activityLogs).values(log).returning();
    return newLog;
  }
}

export const storage = new DatabaseStorage();
