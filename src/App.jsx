/*
 * Copyright (c) 2026, Ant Skelton
 * SPDX-License-Identifier: BSD-3-Clause
 */
import { useState, useCallback } from 'react';
import Toolbar from './components/Toolbar';
import FontGrid from './components/FontGrid';
import CharacterEditor from './components/CharacterEditor';
import ExportDialog from './components/ExportDialog';

// Create an empty font with 256 slots (16x16)
// Starts with a blank character at index 0 ready for editing
function createEmptyFont(name = 'Untitled Font') {
  const characters = Array(256).fill(null);
  characters[0] = { segments: 0, name: null };
  return { name, characters };
}

// Helper to create a range of indices as a Set
function createSelectionRange(anchor, focus) {
  const start = Math.min(anchor, focus);
  const end = Math.max(anchor, focus);
  const indices = new Set();
  for (let i = start; i <= end; i++) {
    indices.add(i);
  }
  return indices;
}

function App() {
  const [font, setFont] = useState(() => createEmptyFont());
  const [selection, setSelection] = useState({
    anchor: 0,
    selected: new Set([0]),
  });
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [clipboard, setClipboard] = useState(null); // { anchorOffset: number, characters: Array<{offset, char}> }

  const selectedCharacter = font.characters[selection.anchor];

  // Font name change
  const handleFontNameChange = useCallback((name) => {
    setFont((prev) => ({ ...prev, name }));
  }, []);

  // Create new font
  const handleNewFont = useCallback(() => {
    if (confirm('Create a new font? All unsaved changes will be lost.')) {
      setFont(createEmptyFont());
      setSelection({ anchor: 0, selected: new Set([0]) });
    }
  }, []);

  // Load font from JSON
  const handleLoadFont = useCallback((data) => {
    // Validate and normalize the loaded data
    const characters = Array(256).fill(null);
    if (data.characters) {
      data.characters.forEach((char, idx) => {
        if (idx < 256 && char !== null) {
          characters[idx] = {
            segments: char.segments || 0,
            name: char.name || null,
          };
        }
      });
    }
    // Ensure character 0 is always defined
    if (characters[0] === null) {
      characters[0] = { segments: 0, name: null };
    }
    setFont({
      name: data.name || 'Loaded Font',
      characters,
    });
    setSelection({ anchor: 0, selected: new Set([0]) });
  }, []);

  // Save font as JSON
  const handleSaveFont = useCallback(() => {
    const dataStr = JSON.stringify(font, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${font.name.replace(/[^a-z0-9]/gi, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [font]);

  // Show export dialog
  const handleExportAsm = useCallback(() => {
    setShowExportDialog(true);
  }, []);

  // Handle selection changes (regular click, shift+click, ctrl+click)
  const handleSelect = useCallback((index, { shift = false, ctrl = false } = {}) => {
    // Clean up empty characters when clicking away, and auto-create at new location
    setFont((prevFont) => {
      const newCharacters = [...prevFont.characters];
      let changed = false;

      // Revert empty characters (no segments, no name) in previous selection
      for (const prevIndex of selection.selected) {
        if (prevIndex !== index) {
          const char = newCharacters[prevIndex];
          if (char && char.segments === 0 && !char.name) {
            newCharacters[prevIndex] = null;
            changed = true;
          }
        }
      }

      // Auto-create character if clicking on empty cell (not shift-click)
      if (!shift && newCharacters[index] === null) {
        newCharacters[index] = { segments: 0, name: null };
        changed = true;
      }

      return changed ? { ...prevFont, characters: newCharacters } : prevFont;
    });

    setSelection((prev) => {
      if (shift) {
        // Shift+click: select range from anchor to clicked index
        return {
          anchor: prev.anchor,
          selected: createSelectionRange(prev.anchor, index),
        };
      } else if (ctrl) {
        // Ctrl+click: toggle individual selection
        const newSelected = new Set(prev.selected);
        if (newSelected.has(index)) {
          newSelected.delete(index);
          // If we removed the anchor, pick a new anchor from remaining selection
          if (index === prev.anchor) {
            const remaining = Array.from(newSelected);
            return {
              anchor: remaining.length > 0 ? remaining[0] : index,
              selected: remaining.length > 0 ? newSelected : new Set([index]),
            };
          }
        } else {
          newSelected.add(index);
        }
        return { anchor: index, selected: newSelected };
      } else {
        // Regular click: single selection
        return { anchor: index, selected: new Set([index]) };
      }
    });
  }, [selection.selected]);

  // Update character at anchor index
  const handleUpdateCharacter = useCallback((character) => {
    setFont((prev) => {
      const newCharacters = [...prev.characters];
      newCharacters[selection.anchor] = character;
      return { ...prev, characters: newCharacters };
    });
  }, [selection.anchor]);

  // Copy segments from another character
  const handleCopyFrom = useCallback((fromIndex) => {
    setFont((prev) => {
      const sourceChar = prev.characters[fromIndex];
      if (!sourceChar) return prev;

      const newCharacters = [...prev.characters];
      newCharacters[selection.anchor] = {
        ...newCharacters[selection.anchor],
        segments: sourceChar.segments,
      };
      return { ...prev, characters: newCharacters };
    });
  }, [selection.anchor]);

  // Move characters (drag and drop) - supports multi-selection
  // The dragged item lands at toIndex, other selected items maintain relative positions
  // Unselected characters stay in place (this is a move, not a reorder)
  const handleReorder = useCallback((fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    if (toIndex < 0 || toIndex >= 256) return;

    const selectedIndices = Array.from(selection.selected).sort((a, b) => a - b);

    // Calculate offset: how much each selected item moves
    // fromIndex is the dragged item, toIndex is where it lands
    const offset = toIndex - fromIndex;

    // Calculate new positions for all selected items
    const moves = selectedIndices.map((srcIdx) => ({
      src: srcIdx,
      dst: srcIdx + offset,
    }));

    // Check if all destinations are valid (0-255)
    if (moves.some((m) => m.dst < 0 || m.dst >= 256)) {
      return; // Reject move if any item would go out of bounds
    }

    // Update font
    setFont((prev) => {
      const newCharacters = [...prev.characters];

      // Collect all characters being moved
      const movedChars = moves.map((m) => ({
        dst: m.dst,
        char: prev.characters[m.src],
      }));

      // Clear source positions (only if they're not also destinations)
      const dstSet = new Set(moves.map((m) => m.dst));
      for (const m of moves) {
        if (!dstSet.has(m.src)) {
          newCharacters[m.src] = null;
        }
      }

      // Place characters at destinations
      for (const { dst, char } of movedChars) {
        newCharacters[dst] = char;
      }

      return { ...prev, characters: newCharacters };
    });

    // Update selection to new positions
    const newSelected = new Set(moves.map((m) => m.dst));
    const newAnchor = selection.anchor + offset;

    setSelection({
      anchor: Math.max(0, Math.min(255, newAnchor)),
      selected: newSelected,
    });
  }, [selection]);

  // Copy character (ctrl + drag and drop) - supports multi-selection
  // The dragged item's copy lands at toIndex, other copies maintain relative positions
  const handleCopyCharacter = useCallback((fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    if (toIndex < 0 || toIndex >= 256) return;

    const selectedIndices = Array.from(selection.selected).sort((a, b) => a - b);

    // Calculate offset based on dragged item
    const offset = toIndex - fromIndex;

    // Calculate destination positions
    const copies = selectedIndices.map((srcIdx) => ({
      src: srcIdx,
      dst: srcIdx + offset,
    }));

    // Check if all destinations are valid
    if (copies.some((c) => c.dst < 0 || c.dst >= 256)) {
      return;
    }

    // Update font
    setFont((prev) => {
      const newCharacters = [...prev.characters];

      // Place copies at destinations
      for (const { src, dst } of copies) {
        const sourceChar = prev.characters[src];
        if (sourceChar) {
          newCharacters[dst] = {
            segments: sourceChar.segments,
            name: sourceChar.name ? `${sourceChar.name}_copy` : null,
          };
        }
      }

      return { ...prev, characters: newCharacters };
    });

    // Update selection to the copied characters
    const newSelected = new Set(copies.map((c) => c.dst));
    const newAnchor = selection.anchor + offset;

    setSelection({
      anchor: Math.max(0, Math.min(255, newAnchor)),
      selected: newSelected,
    });
  }, [selection]);

  // Copy selected characters to clipboard
  const handleCopySelection = useCallback(() => {
    const selectedIndices = Array.from(selection.selected).sort((a, b) => a - b);
    const characters = selectedIndices
      .map((idx) => ({
        offset: idx - selection.anchor,
        char: font.characters[idx],
      }))
      .filter((item) => item.char !== null);

    if (characters.length > 0) {
      setClipboard({ characters });
    }
  }, [selection, font.characters]);

  // Paste clipboard at anchor position
  const handlePaste = useCallback(() => {
    if (!clipboard || clipboard.characters.length === 0) return;

    const pastes = clipboard.characters.map((item) => ({
      dst: selection.anchor + item.offset,
      char: item.char,
    }));

    // Check bounds
    if (pastes.some((p) => p.dst < 0 || p.dst >= 256)) return;

    setFont((prev) => {
      const newCharacters = [...prev.characters];
      for (const { dst, char } of pastes) {
        newCharacters[dst] = {
          segments: char.segments,
          name: char.name ? `${char.name}_copy` : null,
        };
      }
      return { ...prev, characters: newCharacters };
    });

    // Update selection to pasted characters
    const newSelected = new Set(pastes.map((p) => p.dst));
    setSelection({
      anchor: selection.anchor,
      selected: newSelected,
    });
  }, [clipboard, selection.anchor]);

  // Reset selected characters (clear segments to 0)
  const handleResetSelection = useCallback(() => {
    setFont((prev) => {
      const newCharacters = [...prev.characters];
      for (const idx of selection.selected) {
        if (newCharacters[idx]) {
          newCharacters[idx] = { ...newCharacters[idx], segments: 0 };
        }
      }
      return { ...prev, characters: newCharacters };
    });
  }, [selection.selected]);

  // Keyboard handler for grid
  const handleKeyDown = useCallback((e) => {
    // Copy: Ctrl+C / Cmd+C
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
      e.preventDefault();
      handleCopySelection();
    }
    // Paste: Ctrl+V / Cmd+V
    else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
      e.preventDefault();
      handlePaste();
    }
    // Reset: Delete or Backspace (clears segments)
    else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      handleResetSelection();
    }
    // Arrow key navigation
    else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      const current = selection.anchor;
      let next = current;

      switch (e.key) {
        case 'ArrowUp':
          next = current >= 16 ? current - 16 : current;
          break;
        case 'ArrowDown':
          next = current < 240 ? current + 16 : current;
          break;
        case 'ArrowLeft':
          next = current > 0 ? current - 1 : current;
          break;
        case 'ArrowRight':
          next = current < 255 ? current + 1 : current;
          break;
      }

      if (next !== current) {
        handleSelect(next, { shift: e.shiftKey });
      }
    }
  }, [handleCopySelection, handlePaste, handleResetSelection, selection.anchor, handleSelect]);

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <Toolbar
        fontName={font.name}
        onFontNameChange={handleFontNameChange}
        onNewFont={handleNewFont}
        onLoadFont={handleLoadFont}
        onSaveFont={handleSaveFont}
        onExportAsm={handleExportAsm}
      />

      <div className="flex flex-1 p-4 gap-4">
        <div className="flex-shrink-0 overflow-auto max-h-[calc(100vh-120px)]">
          <FontGrid
            font={font}
            selection={selection}
            onSelect={handleSelect}
            onReorder={handleReorder}
            onCopy={handleCopyCharacter}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div className="flex-1 min-w-[400px]">
          <CharacterEditor
            character={selectedCharacter}
            selection={selection}
            font={font}
            onUpdate={handleUpdateCharacter}
            onCopyFrom={handleCopyFrom}
          />
        </div>
      </div>

      {showExportDialog && (
        <ExportDialog
          font={font}
          onClose={() => setShowExportDialog(false)}
        />
      )}
    </div>
  );
}

export default App;
