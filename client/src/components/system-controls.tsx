import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Download, 
  Trash2, 
  Fan, 
  RotateCcw,
  Upload,
  Settings
} from "lucide-react";

export function SystemControls() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const uploadFileMutation = useMutation({
    mutationFn: async ({ deviceId, file }: { deviceId: string; file: File }) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`/api/upload-file/${deviceId}`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "File uploaded successfully",
        description: `${data.filename} (${(data.size / 1024).toFixed(1)} KB)`,
      });
      setSelectedFile(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const systemActionMutation = useMutation({
    mutationFn: async ({ action }: { action: string }) => {
      // These would be implemented as actual system commands
      // For now, just simulate the action
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { action };
    },
    onSuccess: (data) => {
      toast({
        title: "System action completed",
        description: `${data.action} executed successfully`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "System action failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    // For demo purposes, we'll use a placeholder device ID
    // In a real implementation, this would come from the selected device
    const deviceId = "placeholder-device-id";
    uploadFileMutation.mutate({ deviceId, file: selectedFile });
  };

  const handleSystemAction = (action: string) => {
    systemActionMutation.mutate({ action });
  };

  return (
    <Card data-testid="system-controls">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          System Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="flex items-center gap-2 h-auto py-3"
            onClick={() => handleSystemAction("Install APK")}
            disabled={systemActionMutation.isPending}
            data-testid="button-install-apk"
          >
            <Download className="h-4 w-4" />
            <span className="text-sm font-medium">Install APK</span>
          </Button>
          
          <Button
            variant="outline"
            className="flex items-center gap-2 h-auto py-3"
            onClick={() => handleSystemAction("Uninstall App")}
            disabled={systemActionMutation.isPending}
            data-testid="button-uninstall-app"
          >
            <Trash2 className="h-4 w-4" />
            <span className="text-sm font-medium">Uninstall App</span>
          </Button>
          
          <Button
            variant="outline"
            className="flex items-center gap-2 h-auto py-3"
            onClick={() => handleSystemAction("Clear Data")}
            disabled={systemActionMutation.isPending}
            data-testid="button-clear-data"
          >
            <Fan className="h-4 w-4" />
            <span className="text-sm font-medium">Clear Data</span>
          </Button>
          
          <Button
            variant="outline"
            className="flex items-center gap-2 h-auto py-3"
            onClick={() => handleSystemAction("Reboot Device")}
            disabled={systemActionMutation.isPending}
            data-testid="button-reboot"
          >
            <RotateCcw className="h-4 w-4" />
            <span className="text-sm font-medium">Reboot</span>
          </Button>
        </div>

        <div className="space-y-3">
          <div>
            <Label className="text-sm font-medium mb-2 block">File Transfer</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="cursor-pointer"
                  data-testid="input-file-upload"
                />
                {selectedFile && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>
              <Button
                onClick={handleFileUpload}
                disabled={!selectedFile || uploadFileMutation.isPending}
                data-testid="button-upload-file"
              >
                <Upload className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Status indicator */}
        {(systemActionMutation.isPending || uploadFileMutation.isPending) && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm">
                {uploadFileMutation.isPending ? "Uploading file..." : "Executing command..."}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
