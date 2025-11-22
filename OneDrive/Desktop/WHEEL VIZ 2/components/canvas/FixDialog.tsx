'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { X, RefreshCw, AlertCircle, Eraser, Scissors, Palette, Image as ImageIcon } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface FixDialogProps {
  onClose: () => void;
  onFix: (instructions: string) => void;
}

const PRESET_ISSUES = [
  { id: 'distortion', label: 'Wheel is distorted/warped', icon: AlertCircle },
  { id: 'cut-off', label: 'Details got cut out', icon: Scissors },
  { id: 'color', label: 'Wrong color/finish', icon: Palette },
  { id: 'background', label: 'Background changed', icon: ImageIcon },
  { id: 'artifacts', label: 'Weird artifacts/smudging', icon: Eraser },
];

export const FixDialog = ({ onClose, onFix }: FixDialogProps) => {
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [customIssue, setCustomIssue] = useState('');

  const toggleIssue = (id: string) => {
    setSelectedIssues(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleFix = () => {
    const instructions = [
      ...selectedIssues.map(id => PRESET_ISSUES.find(p => p.id === id)?.label),
      customIssue
    ].filter(Boolean).join('. ');
    
    onFix(instructions);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md p-6 bg-card border-primary/20 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-white">
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-primary" />
          Fix Generation
        </h3>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            What went wrong? Select all that apply or describe the issue.
          </p>

          <div className="grid grid-cols-1 gap-2">
            {PRESET_ISSUES.map((issue) => {
              const Icon = issue.icon;
              const isSelected = selectedIssues.includes(issue.id);
              return (
                <button
                  key={issue.id}
                  onClick={() => toggleIssue(issue.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                    isSelected 
                      ? 'bg-primary/10 border-primary text-white' 
                      : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-primary' : ''}`} />
                  <span className="text-sm font-medium">{issue.label}</span>
                </button>
              );
            })}
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Other Issues / Details</Label>
            <Textarea
              value={customIssue}
              onChange={(e) => setCustomIssue(e.target.value)}
              placeholder="E.g. The brake caliper is missing..."
              className="bg-white/5 border-white/10 min-h-[80px] text-sm"
            />
          </div>

          <button
            onClick={handleFix}
            disabled={selectedIssues.length === 0 && !customIssue}
            className="w-full py-3 px-4 bg-primary text-black font-bold rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            Regenerate with Fixes
          </button>
        </div>
      </Card>
    </div>
  );
};

