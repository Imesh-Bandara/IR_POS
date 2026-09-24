import { invoke } from "@tauri-apps/api/core";

export interface BackupMetadata {
    id: string;
    app_version: string;
    schema_version: string;
    created_at: string;
    notes?: string | null;
}

export interface RestorePreview {
    metadata: BackupMetadata | null;
    is_valid: boolean;
    error_message: string | null;
}

export const createBackup = async (token: string, destPath: string): Promise<void> => {
    return await invoke("create_backup_cmd", { token, destPath });
};

export const validateBackup = async (token: string, backupPath: string): Promise<RestorePreview> => {
    return await invoke("validate_backup_cmd", { token, backupPath });
};

export const restoreBackup = async (token: string, backupPath: string): Promise<void> => {
    return await invoke("restore_backup_cmd", { token, backupPath });
};
