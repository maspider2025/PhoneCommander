# Overview

This is a Smart Device Control System built with React, Node.js/Express, and PostgreSQL. The application provides a web-based dashboard for remotely controlling Android devices via TCP connections, with features for real-time screen mirroring, device control, APK generation, and activity monitoring. The system uses a full-stack TypeScript architecture with modern tooling including Vite, Drizzle ORM, and shadcn/ui components.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for development/build tooling
- **UI Library**: shadcn/ui components built on Radix UI primitives with Tailwind CSS for styling
- **State Management**: TanStack Query (React Query) for server state management and data fetching
- **Routing**: Wouter for lightweight client-side routing
- **Real-time Communication**: WebSocket integration for live device screen updates and status changes

## Backend Architecture
- **Runtime**: Node.js with Express.js web server
- **Language**: TypeScript with ES modules
- **Build Process**: esbuild for production bundling, tsx for development
- **TCP Server**: Custom TCP server implementation for Android device communication
- **WebSocket Server**: Built-in WebSocket support for real-time browser communication
- **File Upload**: Multer middleware for handling file uploads to devices

## Database Layer
- **ORM**: Drizzle ORM with Neon serverless PostgreSQL
- **Schema**: Type-safe database schema with Zod validation
- **Connection**: Connection pooling via @neondatabase/serverless
- **Migrations**: Drizzle Kit for schema migrations and database management

## Key Services
- **Device Manager**: Handles device connections, screen streaming, and control commands
- **APK Builder**: Generates custom Android APKs with server configuration embedded
- **TCP Protocol Handler**: Manages bidirectional communication with Android devices
- **Activity Logger**: Tracks all system events and device interactions

## Authentication & Session Management
- **Session Storage**: PostgreSQL-based session management with connect-pg-simple
- **Device Authentication**: TCP-based device registration and heartbeat monitoring
- **Security**: Request logging and error handling middleware

## Real-time Features
- **Screen Mirroring**: Base64-encoded JPEG streaming from Android devices
- **Touch Control**: Coordinate translation and touch event forwarding
- **Status Updates**: Live device connection status and battery monitoring
- **Build Progress**: Real-time APK generation progress via WebSocket

# External Dependencies

## Database Services
- **Neon PostgreSQL**: Serverless PostgreSQL database with connection pooling
- **Drizzle ORM**: Type-safe database operations and schema management

## UI & Styling
- **shadcn/ui**: Complete component library built on Radix UI primitives
- **Tailwind CSS**: Utility-first CSS framework with custom design system
- **Radix UI**: Headless component primitives for accessibility and behavior
- **Lucide Icons**: Icon library for consistent iconography

## Development & Build Tools
- **Vite**: Frontend build tool with HMR and TypeScript support
- **esbuild**: Backend bundling for production builds
- **TypeScript**: Type safety across frontend, backend, and shared code
- **Replit Integration**: Cartographer plugin and runtime error overlay for Replit environment

## Communication Libraries
- **TanStack Query**: Server state management and caching
- **WebSocket (ws)**: Real-time bidirectional communication
- **Node.js net**: TCP server implementation for device connections

## File Processing
- **Multer**: File upload handling for device file transfers
- **Custom APK Builder**: Android application packaging and signing utilities

## Validation & Forms
- **Zod**: Runtime type validation and schema definition
- **React Hook Form**: Form state management with validation integration
- **Hookform Resolvers**: Integration between React Hook Form and Zod validation