import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { configureBackend, backendConfig } from '@/lib/apiWrappers';
import { useToast } from '@/hooks/use-toast';
import { Settings, Server, CheckCircle, XCircle } from 'lucide-react';

export function BackendConfig() {
  const { toast } = useToast();
  const [useBackend, setUseBackend] = useState(backendConfig.useBackend);
  const [apiUrl, setApiUrl] = useState(backendConfig.apiBaseUrl);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const testConnection = async () => {
    setIsTestingConnection(true);
    setConnectionStatus('idle');

    try {
      const response = await fetch(`${apiUrl}/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setConnectionStatus('success');
        toast({
          title: "Success",
          description: "Backend connection successful",
        });
      } else {
        throw new Error('Connection failed');
      }
    } catch (error) {
      setConnectionStatus('error');
      toast({
        title: "Error",
        description: "Failed to connect to backend",
        variant: "destructive",
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const saveConfiguration = () => {
    configureBackend(useBackend, apiUrl);
    
    toast({
      title: "Configuration Saved",
      description: `Backend usage ${useBackend ? 'enabled' : 'disabled'}`,
    });
  };

  const resetToDefaults = () => {
    setUseBackend(false);
    setApiUrl('http://localhost:8000');
    setConnectionStatus('idle');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Settings className="mr-2 h-4 w-4" />
          Backend Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center space-x-2">
          <Switch
            id="use-backend"
            checked={useBackend}
            onCheckedChange={setUseBackend}
          />
          <Label htmlFor="use-backend">Use Python Backend for Statistical Analysis</Label>
        </div>

        {useBackend && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="api-url">Backend API URL</Label>
              <Input
                id="api-url"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="http://localhost:8000"
              />
              <p className="text-xs text-muted-foreground mt-1">
                URL where your Python backend is running
              </p>
            </div>

            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={testConnection}
                disabled={isTestingConnection}
                className="flex items-center"
              >
                <Server className="mr-2 h-4 w-4" />
                {isTestingConnection ? 'Testing...' : 'Test Connection'}
              </Button>

              {connectionStatus === 'success' && (
                <div className="flex items-center text-success">
                  <CheckCircle className="mr-1 h-4 w-4" />
                  Connected
                </div>
              )}

              {connectionStatus === 'error' && (
                <div className="flex items-center text-destructive">
                  <XCircle className="mr-1 h-4 w-4" />
                  Connection Failed
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-between">
          <Button variant="outline" onClick={resetToDefaults}>
            Reset to Defaults
          </Button>
          <Button onClick={saveConfiguration}>
            Save Configuration
          </Button>
        </div>

        <div className="p-4 bg-muted rounded-lg">
          <h4 className="font-semibold mb-2">Backend Integration Status</h4>
          <div className="text-sm space-y-1">
            <p><span className="font-medium">Mode:</span> {useBackend ? 'Python Backend' : 'TypeScript Local'}</p>
            <p><span className="font-medium">API URL:</span> {apiUrl}</p>
            <p><span className="font-medium">Status:</span> 
              <span className={`ml-1 ${
                connectionStatus === 'success' ? 'text-success' : 
                connectionStatus === 'error' ? 'text-destructive' : 
                'text-muted-foreground'
              }`}>
                {connectionStatus === 'success' ? 'Connected' : 
                 connectionStatus === 'error' ? 'Disconnected' : 
                 'Not tested'}
              </span>
            </p>
          </div>
        </div>

        <div className="p-4 bg-primary/10 rounded-lg">
          <h4 className="font-semibold mb-2">Python Backend Setup</h4>
          <p className="text-sm text-muted-foreground mb-2">
            To use the Python backend, you need to:
          </p>
          <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
            <li>Set up a Python backend (Flask/FastAPI) with the statistical functions</li>
            <li>Implement API endpoints that match the function signatures</li>
            <li>Start your backend server</li>
            <li>Configure the API URL above and test the connection</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}