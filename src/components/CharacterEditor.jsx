import { useState } from 'react';
import SegmentDisplay, { SEGMENTS } from './SegmentDisplay';

export default function CharacterEditor({
  character,
  selection,
  font,
  onUpdate,
  onCopyFrom,
}) {
  const characterIndex = selection.anchor;
  const selectionCount = selection.selected.size;
  const [copyFromIndex, setCopyFromIndex] = useState('');

  const handleSegmentClick = (segment) => {
    if (!character) return;
    const newSegments = character.segments ^ SEGMENTS[segment];
    onUpdate({ ...character, segments: newSegments });
  };

  const handleNameChange = (e) => {
    if (!character) return;
    onUpdate({ ...character, name: e.target.value || null });
  };

  const handleCopyFrom = () => {
    const index = parseInt(copyFromIndex, 10);
    if (!isNaN(index) && index >= 0 && index < 256 && font.characters[index]) {
      onCopyFrom(index);
      setCopyFromIndex('');
    }
  };

  const formatBinary = (value) => {
    return value.toString(2).padStart(15, '0');
  };

  const formatHex = (value) => {
    return '0x' + value.toString(16).toUpperCase().padStart(4, '0');
  };

  // Get list of defined characters for copy dropdown
  const definedCharacters = font.characters
    .map((char, idx) => ({ char, idx }))
    .filter(({ char, idx }) => char !== null && idx !== characterIndex);

  return (
    <div className="flex flex-col gap-4 p-4 bg-gray-800 rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Character {characterIndex}
            {character?.name && ` - "${character.name}"`}
          </h2>
          {selectionCount > 1 && (
            <p className="text-sm text-blue-400">{selectionCount} characters selected</p>
          )}
        </div>
        <button
          onClick={() => onUpdate({ ...character, segments: 0 })}
          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
        >
          Reset
        </button>
      </div>

      <div className="flex gap-6">
        <div className="flex-shrink-0">
          <SegmentDisplay
            value={character.segments}
            onSegmentClick={handleSegmentClick}
            size={200}
            interactive={true}
          />
        </div>

        <div className="flex flex-col gap-3 flex-1">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Name</label>
            <input
              type="text"
              value={character.name || ''}
              onChange={handleNameChange}
              placeholder={`Index ${characterIndex}`}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Control Word</label>
            <div className="font-mono text-lg text-green-400">
              {character.segments} ({formatHex(character.segments)})
            </div>
            <div className="font-mono text-sm text-gray-500 mt-1">
              %{formatBinary(character.segments)}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Active Segments</label>
            <div className="flex flex-wrap gap-1">
              {Object.entries(SEGMENTS).map(([name, bit]) => (
                <button
                  key={name}
                  onClick={() => handleSegmentClick(name)}
                  className={`px-2 py-1 text-xs rounded font-mono ${
                    character.segments & bit
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Copy from character</label>
            <div className="flex gap-2">
              <select
                value={copyFromIndex}
                onChange={(e) => setCopyFromIndex(e.target.value)}
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
              >
                <option value="">Select character...</option>
                {definedCharacters.map(({ char, idx }) => (
                  <option key={idx} value={idx}>
                    {idx}: {char.name || `(unnamed)`}
                  </option>
                ))}
              </select>
              <button
                onClick={handleCopyFrom}
                disabled={!copyFromIndex}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
