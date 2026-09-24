import { useState } from "react";
import { save, open } from "@tauri-apps/plugin-dialog";
import { toast } from "react-hot-toast";
import { useAuthStore } from "../../features/auth/auth.store";
import { createBackup, validateBackup, restoreBackup, RestorePreview } from "../../features/backup/backup.api";
import { UploadCloud, DownloadCloud, ShieldAlert } from "lucide-react";
import { RestorePreviewModal } from "./RestorePreviewModal";

export function BackupRestorePage() {
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<RestorePreview | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBackupPath, setSelectedBackupPath] = useState<string | null>(null);

  const handleCreateBackup = async () => {
    if (!token) return;
    try {
      const d = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
      
      const defaultPath = `IRPOS_Backup_${dateStr}.irposbackup`;
      
      const destPath = await save({
        title: "Save Backup",
        defaultPath,
        filters: [{ name: "IR POS Backup", extensions: ["irposbackup"] }]
      });

      if (!destPath) return; // User cancelled

      setLoading(true);
      const toastId = toast.loading("Creating backup...");
      
      await createBackup(token, destPath);
      
      toast.success("Backup created successfully!", { id: toastId });
    } catch (error: any) {
      toast.error(error.toString() || "Failed to create backup.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBackup = async () => {
    if (!token) return;
    try {
      const backupPath = await open({
        title: "Select Backup File",
        filters: [{ name: "IR POS Backup", extensions: ["irposbackup", "db"] }]
      });

      if (!backupPath || Array.isArray(backupPath)) return;

      setLoading(true);
      const toastId = toast.loading("Validating backup...");

      const validationPreview = await validateBackup(token, backupPath);
      setSelectedBackupPath(backupPath);
      setPreview(validationPreview);
      setIsModalOpen(true);

      toast.dismiss(toastId);
    } catch (error: any) {
      toast.error(error.toString() || "Failed to read backup.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmRestore = async () => {
    if (!token || !selectedBackupPath) return;
    try {
      setLoading(true);
      const toastId = toast.loading("Restoring database and restarting application...");
      
      await restoreBackup(token, selectedBackupPath);
      
      toast.success("Restore successful! Restarting...", { id: toastId });
    } catch (error: any) {
      toast.error(error.toString() || "Failed to restore backup.");
      setLoading(false);
      setIsModalOpen(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Backup & Restore</h2>
          <p className="text-gray-500 mt-1">Manage and protect your business data offline.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Backup Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-start gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <UploadCloud size={28} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Create Backup</h3>
              <p className="text-gray-500 text-sm mt-1">
                Save a secure copy of all your products, sales, and settings to your local computer or an external drive.
              </p>
            </div>
          </div>
          <div className="p-6 bg-gray-50 flex justify-end">
            <button
              onClick={handleCreateBackup}
              disabled={loading}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              {loading ? "Processing..." : "Create Backup"}
            </button>
          </div>
        </div>

        {/* Restore Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-start gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <DownloadCloud size={28} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Restore Data</h3>
              <p className="text-gray-500 text-sm mt-1">
                Restore your business data from a previously saved backup file. Requires application restart.
              </p>
            </div>
          </div>
          <div className="p-6 bg-gray-50 flex justify-end">
            <button
              onClick={handleSelectBackup}
              disabled={loading}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              Select Backup File
            </button>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-start gap-4">
        <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
          <ShieldAlert size={28} />
        </div>
        <div>
           <h3 className="text-lg font-semibold text-gray-800">Data Safety Guarantee</h3>
           <p className="text-gray-500 text-sm mt-1">
             Your backups are safely validated before any restore operation. An automatic emergency backup is created every time you restore data to ensure you never lose your progress.
           </p>
        </div>
      </div>

      <RestorePreviewModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmRestore}
        preview={preview}
        loading={loading}
      />
    </div>
  );
}
