CREATE TABLE "activity_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" varchar,
	"session_id" varchar,
	"type" text NOT NULL,
	"message" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "apk_configurations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"app_name" text NOT NULL,
	"package_name" text NOT NULL,
	"server_ip" text NOT NULL,
	"server_port" integer NOT NULL,
	"auto_start" boolean DEFAULT true,
	"hide_icon" boolean DEFAULT false,
	"enable_logging" boolean DEFAULT true,
	"build_status" text DEFAULT 'idle',
	"build_progress" integer DEFAULT 0,
	"build_error" text,
	"build_date" timestamp,
	"apk_path" text,
	"file_size" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"android_version" text NOT NULL,
	"device_model" text NOT NULL,
	"package_name" text NOT NULL,
	"battery_level" integer DEFAULT 0,
	"is_connected" boolean DEFAULT false,
	"last_seen" timestamp DEFAULT now(),
	"tcp_address" text,
	"tcp_port" integer,
	"screen_width" integer DEFAULT 1080,
	"screen_height" integer DEFAULT 1920,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" varchar NOT NULL,
	"is_active" boolean DEFAULT true,
	"started_at" timestamp DEFAULT now(),
	"ended_at" timestamp,
	"control_commands" integer DEFAULT 0,
	"screenshots_taken" integer DEFAULT 0,
	"recording_duration" integer DEFAULT 0
);
--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;