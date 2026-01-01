import { useRef } from 'react';

export default function Toolbar({
  fontName,
  onFontNameChange,
  onNewFont,
  onLoadFont,
  onSaveFont,
  onExportAsm,
}) {
  const fileInputRef = useRef(null);

  const handleLoadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          onLoadFont(data);
        } catch (err) {
          alert('Failed to parse font file: ' + err.message);
        }
      };
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-gray-900 border-b border-gray-700">
      <h1 className="text-xl font-bold text-white">MicroBeast font editor</h1>

      <div className="flex items-center gap-2 ml-4">
        <label className="text-sm text-gray-400">Font Name:</label>
        <input
          type="text"
          value={fontName}
          onChange={(e) => onFontNameChange(e.target.value)}
          className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
          placeholder="Untitled Font"
        />
      </div>

      <div className="flex gap-2 ml-auto">
        <button
          onClick={onNewFont}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
        >
          New Font
        </button>
        <button
          onClick={handleLoadClick}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
        >
          Load Font
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          onClick={onSaveFont}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
        >
          Save JSON
        </button>
        <button
          onClick={onExportAsm}
          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm"
        >
          Export
        </button>
      </div>
    </div>
  );
}
