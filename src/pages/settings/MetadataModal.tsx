import React, { useState, useEffect } from "react";
import { X, Save } from "lucide-react";

export type MetadataType = "category" | "brand" | "unit";

export interface MetadataItem {
  id?: string;
  name_en: string;
  name_si?: string;
  abbreviation?: string; // only for unit
}

interface MetadataModalProps {
  isOpen: boolean;
  type: MetadataType;
  item?: MetadataItem | null;
  onClose: () => void;
  onSave: (data: MetadataItem) => Promise<void>;
}

export function MetadataModal({ isOpen, type, item, onClose, onSave }: MetadataModalProps) {
  const [nameEn, setNameEn] = useState("");
  const [nameSi, setNameSi] = useState("");
  const [abbreviation, setAbbreviation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (item) {
        setNameEn(item.name_en || "");
        setNameSi(item.name_si || "");
        setAbbreviation(item.abbreviation || "");
      } else {
        setNameEn("");
        setNameSi("");
        setAbbreviation("");
      }
      setError(null);
    }
  }, [isOpen, item]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await onSave({
        id: item?.id,
        name_en: nameEn,
        name_si: nameSi,
        abbreviation: type === "unit" ? abbreviation : undefined,
      });
      onClose();
    } catch (err: any) {
      setError(typeof err === "string" ? err : err.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    const action = item ? "Edit" : "Create";
    const entity = type.charAt(0).toUpperCase() + type.slice(1);
    return `${action} ${entity}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800">{getTitle()}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <form id="metadata-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name (English) *</label>
              <input
                type="text"
                required
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder={`Enter ${type} name in English`}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name (Sinhala)</label>
              <input
                type="text"
                value={nameSi}
                onChange={(e) => setNameSi(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder={`Enter ${type} name in Sinhala`}
              />
            </div>

            {type === "unit" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Abbreviation</label>
                <input
                  type="text"
                  value={abbreviation}
                  onChange={(e) => setAbbreviation(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. kg, ml, pcs"
                />
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 mt-auto">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg text-gray-600 font-medium hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            form="metadata-form"
            type="submit"
            disabled={loading}
            className="px-5 py-2 bg-blue-600 rounded-lg text-white font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={18} />
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
