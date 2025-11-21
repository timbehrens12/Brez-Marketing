
'use client';

import React, { useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { GripVertical } from 'lucide-react';

interface ReferenceImage {
  id: string;
  url: string;
}

const SortableItem = ({ id, url }: { id: string; url: string }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group touch-none">
      <Card className="overflow-hidden aspect-square border-neutral-800 bg-neutral-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="Reference" className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity" />
        <div {...attributes} {...listeners} className="absolute top-2 right-2 p-1 bg-black/50 rounded cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="w-4 h-4 text-white" />
        </div>
      </Card>
    </div>
  );
};

export const ReferenceGrid = () => {
  const [items, setItems] = useState<ReferenceImage[]>([
    // Mock items
    { id: '1', url: 'https://placehold.co/100x100/111/fff?text=Primary' },
    { id: '2', url: 'https://placehold.co/100x100/222/fff?text=Ref+1' },
    { id: '3', url: 'https://placehold.co/100x100/333/fff?text=Ref+2' },
    { id: '4', url: 'https://placehold.co/100x100/444/fff?text=Ref+3' },
  ]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map(i => i.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-3 gap-3">
          {items.map((item) => (
            <SortableItem key={item.id} id={item.id} url={item.url} />
          ))}
          <div className="aspect-square border border-dashed border-neutral-800 rounded-lg flex items-center justify-center text-neutral-600 hover:text-neutral-400 hover:border-neutral-700 cursor-pointer transition-colors">
            <span className="text-xs">+ Add Ref</span>
          </div>
        </div>
      </SortableContext>
    </DndContext>
  );
};

