"use client";

import Image from "next/image";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Item } from "@/types";

interface SortableItemProps {
  item: Item;
  index: number;
}

function SortableItem({ item, index }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 bg-gray-800 rounded-xl p-3 border ${
        isDragging
          ? "border-yellow-400 shadow-lg shadow-yellow-400/20 opacity-80"
          : "border-gray-700"
      }`}
    >
      {/* Número de posición */}
      <span className="text-gray-400 text-sm font-bold w-6 text-center flex-shrink-0">
        {index + 1}
      </span>

      {/* Imagen */}
      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0 flex items-center justify-center">
        {item.image_url ? (
          <Image
            src={item.image_url}
            alt={item.name}
            width={48}
            height={48}
            className="object-cover w-full h-full"
          />
        ) : (
          <span className="text-xl">🎯</span>
        )}
      </div>

      {/* Nombre */}
      <span className="flex-1 text-white font-medium text-sm">{item.name}</span>

      {/* Handle */}
      <button
        {...attributes}
        {...listeners}
        className="touch-none flex-shrink-0 p-2 text-gray-400 cursor-grab active:cursor-grabbing"
        aria-label="Arrastrar para reordenar"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
        </svg>
      </button>
    </div>
  );
}

interface Props {
  items: Item[];
  onChange: (orderedItems: Item[]) => void;
}

export function PositionSorter({ items, onChange }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      onChange(arrayMove(items, oldIndex, newIndex));
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-2">
          <p className="text-gray-400 text-sm text-center mb-2">
            Arrastrá los elementos del mejor (arriba) al peor (abajo)
          </p>
          {items.map((item, idx) => (
            <SortableItem key={item.id} item={item} index={idx} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
