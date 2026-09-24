
import { X, AlertTriangle } from "lucide-react";
import { RestorePreview } from "../../features/backup/backup.api";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  preview: RestorePreview | null;
  loading: boolean;
}

export function RestorePreviewModal({ isOpen, onClose, onConfirm, preview, loading }: Props) {
  if (!isOpen || !preview) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800">Restore Backup</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors"
            disabled={loading}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {!preview.is_valid ? (
            <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex gap-3">
              <AlertTriangle className="text-red-500 shrink-0" size={24} />
              <div>
                <h3 className="font-semibold text-red-800">Invalid Backup</h3>
                <p className="text-red-600 text-sm mt-1">{preview.error_message}</p>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <h3 className="font-semibold text-blue-900 mb-4">Backup Details</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-700">Created At:</span>
                    <span className="font-medium text-blue-900">
                      {new Date(preview.metadata?.created_at || "").toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">App Version:</span>
                    <span className="font-medium text-blue-900">{preview.metadata?.app_version}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Schema Version:</span>
                    <span className="font-medium text-blue-900">{preview.metadata?.schema_version}</span>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 flex gap-3">
                <AlertTriangle className="text-amber-600 shrink-0" size={24} />
                <div>
                  <h3 className="font-semibold text-amber-900">Warning: Destructive Action</h3>
                  <p className="text-amber-700 text-sm mt-1">
                    Restoring this backup will replace all current application data with the selected backup data. 
                    An emergency backup of your current data will be created before proceeding.
                    The application will automatically restart upon successful restore.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-gray-700 font-medium hover:bg-gray-200 rounded-lg transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          {preview.is_valid && (
            <button
              onClick={onConfirm}
              disabled={loading}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? "Restoring..." : "Confirm Restore"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
