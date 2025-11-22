'use client';

import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import type { CurrentSetup } from '@/lib/deltaCalculator';
import {
  getAvailableMakes,
  getModelsForMake,
  getTrimsForModel,
  getVehicleSpecs,
} from '@/lib/vehicleDatabase';

interface CurrentSetupFormProps {
  onSetupChange: (setup: CurrentSetup) => void;
  onComplete?: () => void;
  className?: string;
}

export const CurrentSetupForm: React.FC<CurrentSetupFormProps> = ({ onSetupChange, onComplete, className }) => {
  const [setup, setSetup] = useState<CurrentSetup>({
    rimDiameter: 18,
    rimWidth: 9,
    offset: 35,
    suspensionType: 'stock',
  });

  // Vehicle selection state
  const [selectedMake, setSelectedMake] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [selectedTrim, setSelectedTrim] = useState<string>('');
  const [isManualMode, setIsManualMode] = useState(false);

  const availableMakes = getAvailableMakes();
  const availableModels = selectedMake ? getModelsForMake(selectedMake) : [];
  const availableTrims = selectedMake && selectedModel ? getTrimsForModel(selectedMake, selectedModel) : [];

  // Auto-fill when vehicle is selected
  useEffect(() => {
    if (selectedMake && selectedModel && selectedTrim) {
      const vehicleSpec = getVehicleSpecs(selectedMake, selectedModel, selectedTrim);
      if (vehicleSpec) {
        const newSetup = { ...vehicleSpec.stockSpecs };
        setSetup(newSetup);
        onSetupChange(newSetup);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMake, selectedModel, selectedTrim]);

  const handleChange = (field: keyof CurrentSetup, value: any) => {
    const newSetup = { ...setup, [field]: value };
    setSetup(newSetup);
    onSetupChange(newSetup);
  };

  const handleVehicleSelect = () => {
    setIsManualMode(false);
    setSelectedMake('');
    setSelectedModel('');
    setSelectedTrim('');
  };

  const handleManualMode = () => {
    setIsManualMode(true);
    setSelectedMake('');
    setSelectedModel('');
    setSelectedTrim('');
  };

  return (
    <Card className={`p-4 bg-card/50 backdrop-blur-sm max-h-[70vh] overflow-y-auto ${className}`}>
      <h3 className="text-sm font-semibold mb-3 text-primary sticky top-0 bg-card/95 backdrop-blur-sm z-10 -mx-4 -mt-4 px-4 pt-4 pb-3 border-b border-border/50">Current Setup (in photo)</h3>
      
      {/* Mode Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={handleVehicleSelect}
          className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
            !isManualMode
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          Select Vehicle
        </button>
        <button
          onClick={handleManualMode}
          className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
            isManualMode
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          Manual Entry
        </button>
      </div>

      {/* Vehicle Selection Mode */}
      {!isManualMode && (
        <div className="space-y-3 mb-4 pb-4 border-b border-border">
          {/* Make Selection */}
          <div className="space-y-1">
            <Label htmlFor="make" className="text-xs">
              Make
            </Label>
            <select
              id="make"
              value={selectedMake}
              onChange={(e) => {
                setSelectedMake(e.target.value);
                setSelectedModel('');
                setSelectedTrim('');
              }}
              className="w-full h-8 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="">Select Make...</option>
              {availableMakes.map((make) => (
                <option key={make} value={make}>
                  {make}
                </option>
              ))}
            </select>
          </div>

          {/* Model Selection */}
          {selectedMake && (
            <div className="space-y-1">
              <Label htmlFor="model" className="text-xs">
                Model
              </Label>
              <select
                id="model"
                value={selectedModel}
                onChange={(e) => {
                  setSelectedModel(e.target.value);
                  setSelectedTrim('');
                }}
                className="w-full h-8 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="">Select Model...</option>
                {availableModels.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Trim Selection */}
          {selectedModel && (
            <div className="space-y-1">
              <Label htmlFor="trim" className="text-xs">
                Trim
              </Label>
              <select
                id="trim"
                value={selectedTrim}
                onChange={(e) => setSelectedTrim(e.target.value)}
                className="w-full h-8 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="">Select Trim...</option>
                {availableTrims.map((vehicle) => (
                  <option key={vehicle.trim} value={vehicle.trim}>
                    {vehicle.trim} {vehicle.year && `(${vehicle.year})`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedTrim && (
            <div className="mt-3 p-2 bg-primary/10 rounded-md">
              <p className="text-xs text-primary font-medium">
                ✓ Stock specs loaded for {selectedMake} {selectedModel} {selectedTrim}
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* Manual/Auto-filled Specs */}
      <div className="space-y-3">
        {/* Rim Diameter */}
        <div className="space-y-1">
          <Label htmlFor="rimDiameter" className="text-xs flex items-center gap-2">
            Current Rim Diameter
            {!isManualMode && selectedTrim && (
              <span className="text-[10px] text-primary font-normal">(auto-filled)</span>
            )}
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="rimDiameter"
              type="number"
              min="13"
              max="30"
              step="0.5"
              value={setup.rimDiameter}
              onChange={(e) => handleChange('rimDiameter', parseFloat(e.target.value))}
              className={`h-8 text-sm ${!isManualMode && selectedTrim ? 'border-primary/50 bg-primary/5' : ''}`}
            />
            <span className="text-xs text-muted-foreground">inches</span>
          </div>
        </div>

        {/* Rim Width (Optional) */}
        <div className="space-y-1">
          <Label htmlFor="rimWidth" className="text-xs flex items-center gap-2">
            Current Rim Width <span className="text-muted-foreground">(optional)</span>
            {!isManualMode && selectedTrim && (
              <span className="text-[10px] text-primary font-normal">(auto-filled)</span>
            )}
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="rimWidth"
              type="number"
              min="6"
              max="14"
              step="0.5"
              value={setup.rimWidth || ''}
              onChange={(e) => handleChange('rimWidth', e.target.value ? parseFloat(e.target.value) : undefined)}
              className={`h-8 text-sm ${!isManualMode && selectedTrim ? 'border-primary/50 bg-primary/5' : ''}`}
              placeholder="Auto"
            />
            <span className="text-xs text-muted-foreground">inches</span>
          </div>
        </div>

        {/* Offset (Optional) */}
        <div className="space-y-1">
          <Label htmlFor="offset" className="text-xs flex items-center gap-2">
            Current Offset <span className="text-muted-foreground">(optional)</span>
            {!isManualMode && selectedTrim && (
              <span className="text-[10px] text-primary font-normal">(auto-filled)</span>
            )}
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="offset"
              type="number"
              min="-50"
              max="70"
              step="1"
              value={setup.offset || ''}
              onChange={(e) => handleChange('offset', e.target.value ? parseInt(e.target.value) : undefined)}
              className={`h-8 text-sm ${!isManualMode && selectedTrim ? 'border-primary/50 bg-primary/5' : ''}`}
              placeholder="35"
            />
            <span className="text-xs text-muted-foreground">mm</span>
          </div>
        </div>

        {/* Suspension Type */}
        <div className="space-y-1">
          <Label htmlFor="suspensionType" className="text-xs">
            Suspension Type
          </Label>
          <select
            id="suspensionType"
            value={setup.suspensionType}
            onChange={(e) => handleChange('suspensionType', e.target.value as 'stock' | 'lifted' | 'lowered')}
            className="w-full h-8 px-3 rounded-md border border-input bg-background text-sm"
          >
            <option value="stock">Stock</option>
            <option value="lifted">Lifted</option>
            <option value="lowered">Lowered</option>
          </select>
        </div>

        {/* Lift/Drop Height */}
        {setup.suspensionType === 'lifted' && (
          <div className="space-y-1">
            <Label htmlFor="liftHeight" className="text-xs">
              Lift Height
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="liftHeight"
                type="number"
                min="0.5"
                max="12"
                step="0.5"
                value={setup.liftHeight || 2}
                onChange={(e) => handleChange('liftHeight', parseFloat(e.target.value))}
                className="h-8 text-sm"
              />
              <span className="text-xs text-muted-foreground">inches</span>
            </div>
          </div>
        )}

        {setup.suspensionType === 'lowered' && (
          <div className="space-y-1">
            <Label htmlFor="dropHeight" className="text-xs">
              Drop Height
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="dropHeight"
                type="number"
                min="0.5"
                max="6"
                step="0.5"
                value={setup.dropHeight || 2}
                onChange={(e) => handleChange('dropHeight', parseFloat(e.target.value))}
                className="h-8 text-sm"
              />
              <span className="text-xs text-muted-foreground">inches</span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-border space-y-2">
        <p className="text-[10px] text-muted-foreground">
          This info helps generate accurate size comparisons
        </p>
        {onComplete && (
          <button
            onClick={onComplete}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-semibold text-sm"
          >
            Confirm Setup
          </button>
        )}
      </div>
    </Card>
  );
};

