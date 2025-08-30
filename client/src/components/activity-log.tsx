import { useQuery } from "@tanstack/react-query";
import type { ActivityLog } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";

export function ActivityLog() {
  const { data: logs = [] } = useQuery<ActivityLog[]>({
    queryKey: ["/api/activity-logs"],
    refetchInterval: 5000,
  });

  const getLogTypeColor = (type: string) => {
    switch (type) {
      case 'connection':
        return 'bg-green-500';
      case 'command':
        return 'bg-blue-500';
      case 'screenshot':
        return 'bg-purple-500';
      case 'apk_generation':
        return 'bg-orange-500';
      case 'error':
        return 'bg-red-500';
      case 'file_transfer':
        return 'bg-cyan-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getLogTypeLabel = (type: string) => {
    switch (type) {
      case 'connection':
        return 'Connection';
      case 'command':
        return 'Command';
      case 'screenshot':
        return 'Screenshot';
      case 'apk_generation':
        return 'APK Build';
      case 'error':
        return 'Error';
      case 'file_transfer':
        return 'File Transfer';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const logTime = new Date(timestamp);
    const diffMs = now.getTime() - logTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <Card data-testid="activity-log">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64">
          {logs.length > 0 ? (
            <div className="space-y-3">
              {logs.map((log: ActivityLog) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3"
                  data-testid={`activity-log-${log.id}`}
                >
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${getLogTypeColor(log.type)}`}></div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium" data-testid={`log-message-${log.id}`}>
                        {log.message}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {getLogTypeLabel(log.type)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground" data-testid={`log-time-${log.id}`}>
                      {formatTimeAgo(log.timestamp)}
                    </p>
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <div className="mt-1">
                        <details className="text-xs">
                          <summary className="text-muted-foreground cursor-pointer hover:text-foreground">
                            View details
                          </summary>
                          <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Activity className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No activity logs</p>
              <p className="text-xs text-muted-foreground mt-1">
                Device interactions will appear here
              </p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
