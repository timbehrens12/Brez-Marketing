'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export const TestAIButton = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testSuspension = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test-visualize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_image_url: 'https://placehold.co/800x600/333/fff?text=My+Truck',
          vehicle_string: '2020 Ford F-150 XLT',
          product: {
            name: 'BC Racing BR Coilovers',
            type: 'suspension',
            specs: {
              frontLowering: '2.0"',
              rearLowering: '2.0"',
              springRate: '10K/8K'
            }
          }
        })
      });

      const data = await response.json();
      setResult(data);
      console.log('✅ Suspension Test Result:', data);
      
      if (data.success) {
        console.log('📋 Mechanic Instructions:', data.debug.mechanic_instructions);
        console.log('🎨 Generation Metadata:', data.debug.generation_metadata);
      }
      
      alert('✅ Test complete! Check console for details.');
    } catch (error) {
      console.error('❌ Test failed:', error);
      alert('❌ Test failed - check console');
    } finally {
      setLoading(false);
    }
  };

  const testWheels = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test-visualize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_image_url: 'https://placehold.co/800x600/333/fff?text=My+Truck',
          vehicle_string: '2020 Ford F-150 XLT',
          product: {
            name: 'Anovia Kinetic',
            type: 'wheel',
            specs: {
              diameter: 20,
              width: 10,
              offset: 35,
              finish: 'Gloss Black',
              boltPattern: '5x114.3'
            },
            image_url: 'https://placehold.co/400x400/1a1a1a/8B5CF6?text=Wheel'
          }
        })
      });

      const data = await response.json();
      setResult(data);
      console.log('✅ Wheel Test Result:', data);
      
      if (data.success) {
        console.log('📋 Mechanic Instructions:', data.debug.mechanic_instructions);
        console.log('🎨 Generation Metadata:', data.debug.generation_metadata);
      }
      
      alert('✅ Test complete! Check console for details.');
    } catch (error) {
      console.error('❌ Test failed:', error);
      alert('❌ Test failed - check console');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 p-4 bg-white/5 rounded-lg border border-white/10">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">🧪 AI Testing</h3>
        <span className="text-xs text-white/40">No Database</span>
      </div>
      
      <div className="flex gap-2">
        <Button
          onClick={testSuspension}
          disabled={loading}
          className="flex-1 bg-[#9333ea] hover:bg-[#7e22ce] text-white border-none text-xs h-8"
          size="sm"
        >
          {loading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            '🔧'
          )}
          <span className="ml-1">Suspension</span>
        </Button>
        
        <Button
          onClick={testWheels}
          disabled={loading}
          className="flex-1 bg-[#ccff00] hover:bg-[#b3e600] text-black border-none text-xs h-8 font-bold"
          size="sm"
        >
          {loading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            '⭕'
          )}
          <span className="ml-1">Wheels</span>
        </Button>
      </div>
      
      {result && (
        <div className="text-xs space-y-1">
          <div className={result.success ? 'text-green-400' : 'text-red-400'}>
            {result.success ? '✅ Success' : '❌ Failed'}
          </div>
          {result.success && (
            <>
              <div className="text-white/60">
                Reference Image: {result.debug?.mechanic_instructions?.should_use_reference_image ? 'Yes' : 'No'}
              </div>
              <div className="text-white/60">
                Target: {result.debug?.mechanic_instructions?.mask_strategy?.target_area}
              </div>
            </>
          )}
          <div className="text-white/40 text-[10px]">
            Check console for full details
          </div>
        </div>
      )}
    </div>
  );
};

