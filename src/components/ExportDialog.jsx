/*
 * Copyright (c) 2026, Ant Skelton
 * SPDX-License-Identifier: BSD-3-Clause
 */
import { useState, useMemo } from 'react';
import Handlebars from 'handlebars';
import presets from '../presets.json';

// Register Handlebars helpers
Handlebars.registerHelper('bin', (value) => {
  const num = value ?? 0;
  return num.toString(2).padStart(15, '0');
});

Handlebars.registerHelper('hex', (value) => {
  const num = value ?? 0;
  return num.toString(16).toUpperCase().padStart(4, '0');
});

export default function ExportDialog({ font, onClose }) {
  const [selectedPreset, setSelectedPreset] = useState(presets.presets[0].id);
  const [customTemplate, setCustomTemplate] = useState('');
  const [customExtension, setCustomExtension] = useState('txt');
  const [useCustom, setUseCustom] = useState(false);

  // Get the current template
  const template = useMemo(() => {
    if (useCustom) {
      return customTemplate;
    }
    const preset = presets.presets.find((p) => p.id === selectedPreset);
    return preset?.template || '';
  }, [useCustom, customTemplate, selectedPreset]);

  // Prepare context for Handlebars
  const context = useMemo(() => {
    const safeName = font.name.replace(/[^a-z0-9]/gi, '_');
    return {
      name: font.name,
      nameUpper: safeName.toUpperCase(),
      nameLower: safeName.toLowerCase(),
      characters: font.characters.map((char, index) => ({
        index,
        defined: char !== null,
        segments: char?.segments ?? 0,
        name: char?.name || `CHAR_${index.toString(16).toUpperCase().padStart(2, '0')}`,
      })),
    };
  }, [font]);

  // Compile and render template
  const { output, error } = useMemo(() => {
    try {
      const compiled = Handlebars.compile(template);
      return { output: compiled(context), error: null };
    } catch (e) {
      return { output: '', error: e.message };
    }
  }, [template, context]);

  const handleExport = () => {
    // Get file extension from preset or custom input
    const preset = presets.presets.find((p) => p.id === selectedPreset);
    const ext = useCustom ? customExtension : (preset?.extension || 'txt');
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${font.name.replace(/[^a-z0-9]/gi, '_')}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  const handlePresetChange = (e) => {
    const presetId = e.target.value;
    if (presetId === 'custom') {
      setUseCustom(true);
      // Initialize custom template with current preset template
      const currentPreset = presets.presets.find((p) => p.id === selectedPreset);
      setCustomTemplate(currentPreset?.template || '');
    } else {
      setUseCustom(false);
      setSelectedPreset(presetId);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-[800px] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Export</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Preset selector */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Template</label>
            <select
              value={useCustom ? 'custom' : selectedPreset}
              onChange={handlePresetChange}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
            >
              {presets.presets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name} - {preset.description}
                </option>
              ))}
              <option value="custom">Custom template...</option>
            </select>
          </div>

          {/* Template editor (shown for custom or for viewing) */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Template {useCustom ? '(editing)' : '(read-only)'}
            </label>
            <textarea
              value={template}
              onChange={(e) => useCustom && setCustomTemplate(e.target.value)}
              readOnly={!useCustom}
              className={`w-full h-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white font-mono text-sm ${
                !useCustom ? 'opacity-60' : ''
              }`}
              placeholder="Enter Handlebars template..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Available: {'{{name}}'}, {'{{nameUpper}}'}, {'{{nameLower}}'}, {'{{#each characters}}'}, {'{{bin segments}}'}, {'{{hex segments}}'}, {'{{index}}'}, {'{{defined}}'}, {'{{/each}}'}
            </p>
            {useCustom && (
              <div className="mt-2 flex items-center gap-2">
                <label className="text-sm text-gray-400">File extension:</label>
                <input
                  type="text"
                  value={customExtension}
                  onChange={(e) => setCustomExtension(e.target.value.replace(/^\./, ''))}
                  className="w-20 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                  placeholder="txt"
                />
              </div>
            )}
          </div>

          {/* Error display */}
          {error && (
            <div className="p-3 bg-red-900/50 border border-red-700 rounded text-red-300 text-sm">
              Template error: {error}
            </div>
          )}

          {/* Preview */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Preview</label>
            <pre className="w-full h-48 px-3 py-2 bg-gray-900 border border-gray-600 rounded text-green-400 font-mono text-sm overflow-auto whitespace-pre">
              {output || '(no output)'}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={!!error || !output}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded"
          >
            Export
          </button>
        </div>
      </div>
    </div>
  );
}
