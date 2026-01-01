import React, { useState, useRef } from 'react';
import SegmentDisplay from './SegmentDisplay';

export default function FontGrid({
  font,
  selection,
  onSelect,
  onReorder,
  onCopy,
  onKeyDown,
}) {
  const [dragIndex, setDragIndex] = useState(null);
  const [dropIndex, setDropIndex] = useState(null);
  const [isCopying, setIsCopying] = useState(false);
  const gridRef = useRef(null);

  const handleDragStart = (e, index) => {
    if (font.characters[index] === null) {
      e.preventDefault();
      return;
    }
    // If dragging from outside the selection, treat as single-item drag
    if (!selection.selected.has(index)) {
      onSelect(index);
    }
    setDragIndex(index);
    setIsCopying(e.ctrlKey || e.metaKey);
    e.dataTransfer.effectAllowed = e.ctrlKey || e.metaKey ? 'copy' : 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (dragIndex !== null && index !== dragIndex) {
      setDropIndex(index);
      e.dataTransfer.dropEffect = isCopying ? 'copy' : 'move';
    }
  };

  const handleDragLeave = () => {
    setDropIndex(null);
  };

  const handleDrop = (e, index) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== index) {
      if (isCopying || e.ctrlKey || e.metaKey) {
        onCopy(dragIndex, index);
      } else {
        onReorder(dragIndex, index);
      }
    }
    setDragIndex(null);
    setDropIndex(null);
    setIsCopying(false);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDropIndex(null);
    setIsCopying(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Control' || e.key === 'Meta') {
      setIsCopying(true);
    }
    // Forward to parent handler for copy/paste/delete
    onKeyDown?.(e);
  };

  const handleKeyUp = (e) => {
    if (e.key === 'Control' || e.key === 'Meta') {
      setIsCopying(false);
    }
  };

  // Generate column headers (00-0F)
  const colHeaders = Array.from({ length: 16 }, (_, i) =>
    i.toString(16).toUpperCase().padStart(2, '0')
  );

  // Generate row headers (00, 10, 20, ..., F0)
  const rowHeaders = Array.from({ length: 16 }, (_, i) =>
    (i * 16).toString(16).toUpperCase().padStart(2, '0')
  );

  return (
    <div
      ref={gridRef}
      className="bg-gray-800 rounded-lg p-2"
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      tabIndex={0}
    >
      {/* Grid with headers */}
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: 'auto repeat(16, 1fr)' }}
      >
        {/* Top-left corner (empty) */}
        <div className="w-6" />

        {/* Column headers */}
        {colHeaders.map((label) => (
          <div
            key={`col-${label}`}
            className="text-center text-xs text-gray-500 font-mono pb-1"
          >
            {label}
          </div>
        ))}

        {/* Grid rows with row headers */}
        {Array.from({ length: 16 }, (_, row) => (
          <React.Fragment key={`row-${row}`}>
            {/* Row header */}
            <div
              className="flex items-center justify-center text-xs text-gray-500 font-mono pr-1 w-6"
            >
              {rowHeaders[row]}
            </div>

            {/* Character cells for this row */}
            {Array.from({ length: 16 }, (_, col) => {
              const index = row * 16 + col;
              const char = font.characters[index];
              const isDefined = char !== null;
              const isSelected = selection.selected.has(index);
              const isAnchor = index === selection.anchor;
              const isDragging = index === dragIndex;
              const isDropTarget = index === dropIndex;

              return (
                <div
                  key={index}
                  draggable={isDefined}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  onClick={(e) => onSelect(index, { shift: e.shiftKey, ctrl: e.ctrlKey || e.metaKey })}
                  className={`
                    relative cursor-pointer rounded transition-all
                    ${isAnchor ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-800' : ''}
                    ${isSelected && !isAnchor ? 'ring-2 ring-blue-400 ring-offset-1 ring-offset-gray-800' : ''}
                    ${isDragging ? 'opacity-50' : ''}
                    ${isDropTarget ? 'ring-2 ring-green-500' : ''}
                    ${!isDefined ? 'opacity-30' : ''}
                    hover:outline hover:outline-2 hover:outline-gray-400
                  `}
                  title={char?.name || `Index ${index} (0x${index.toString(16).toUpperCase().padStart(2, '0')})`}
                >
                  <div className="pointer-events-none">
                    <SegmentDisplay
                      value={char?.segments || 0}
                      size={32}
                      interactive={false}
                    />
                    {isDefined && char.name && (
                      <div className="absolute -bottom-1 left-0 right-0 text-center text-xs text-gray-400 truncate px-0.5">
                        {char.name}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
