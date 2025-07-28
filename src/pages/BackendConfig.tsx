import React from 'react';
import { BackendConfig as BackendConfigComponent } from '@/components/BackendConfig';

export function BackendConfig() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Backend Configuration</h1>
        <p className="text-muted-foreground">
          Configure your Python backend connection for enhanced statistical analysis.
        </p>
      </div>
      
      <BackendConfigComponent />
    </div>
  );
}