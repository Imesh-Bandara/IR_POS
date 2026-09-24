import { invoke } from "@tauri-apps/api/core";

export interface HardwareSetting {
    key: string;
    value: string;
}

export const HardwareAPI = {
    printReceipt: async (token: string, invoiceNumber: string): Promise<void> => {
        return await invoke("print_receipt_cmd", { token, invoiceNumber });
    },

    testPrinter: async (token: string): Promise<void> => {
        return await invoke("test_printer_cmd", { token });
    },

    openCashDrawer: async (token: string): Promise<void> => {
        return await invoke("open_cash_drawer_cmd", { token });
    },

    testCustomerDisplay: async (token: string, line1: string, line2: string): Promise<void> => {
        return await invoke("test_display_cmd", { token, line1, line2 });
    },

    getSettings: async (token: string): Promise<HardwareSetting[]> => {
        return await invoke("get_hardware_settings_cmd", { token });
    },

    updateSettings: async (token: string, settings: HardwareSetting[]): Promise<void> => {
        return await invoke("update_hardware_settings_cmd", { token, settings });
    }
};
