import React from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "react-hot-toast";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./i18n";
import "./index.css";
import { MainLayout } from "./layouts/MainLayout";
import { Dashboard } from "./pages/Dashboard";
import { LoginPage } from "./pages/auth/LoginPage";
import { FirstRunSetup } from "./pages/auth/FirstRunSetup";
import { ProtectedRoute } from "./features/auth/ProtectedRoute";
import { ProductsPage } from "./pages/products/ProductsPage";
import { ProductForm } from "./pages/products/ProductForm";
import { InventoryPage } from "./pages/inventory/InventoryPage";
import { StockMovementHistoryPage } from "./pages/inventory/StockMovementHistoryPage";
import { POSPage } from "./pages/pos/POSPage";
import { SalesHistoryPage } from "./pages/sales/SalesHistoryPage";
import { SuppliersPage } from "./pages/purchases/SuppliersPage";
import { SupplierForm } from "./pages/purchases/SupplierForm";
import { PurchaseOrdersPage } from "./pages/purchases/PurchaseOrdersPage";
import { PurchaseOrderForm } from "./pages/purchases/PurchaseOrderForm";
import { ReceiveGoodsPage } from "./pages/purchases/ReceiveGoodsPage";
import { PurchasesPage } from "./pages/purchases/PurchasesPage";
import { SupplierPaymentForm } from "./pages/purchases/SupplierPaymentForm";
import { PurchaseReturnForm } from "./pages/purchases/PurchaseReturnForm";
import { ReportsLayout } from "./pages/reports/ReportsLayout";
import { SalesReport } from "./pages/reports/SalesReport";
import { ProductPerformanceReport } from "./pages/reports/ProductPerformanceReport";
import { InventoryReport } from "./pages/reports/InventoryReport";
import { SupplierReport } from "./pages/reports/SupplierReport";
import { MetadataSettingsPage } from "./pages/settings/MetadataSettingsPage";
import { BackupRestorePage } from "./pages/settings/BackupRestorePage";
import { HardwareSettingsPage } from "./pages/settings/HardwareSettingsPage";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/setup" element={<FirstRunSetup />} />
        
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="products/new" element={<ProductForm />} />
            <Route path="products/:id/edit" element={<ProductForm />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="inventory/movements" element={<StockMovementHistoryPage />} />
            <Route path="pos" element={<POSPage />} />
            <Route path="sales" element={<SalesHistoryPage />} />
            
            {/* Purchasing */}
            <Route path="suppliers" element={<SuppliersPage />} />
            <Route path="suppliers/new" element={<SupplierForm />} />
            <Route path="suppliers/:id/edit" element={<SupplierForm />} />
            
            <Route path="purchase-orders" element={<PurchaseOrdersPage />} />
            <Route path="purchase-orders/new" element={<PurchaseOrderForm />} />
            <Route path="purchase-orders/:id/receive" element={<ReceiveGoodsPage />} />
            
            <Route path="purchases" element={<PurchasesPage />} />
            <Route path="purchases/:id/payment" element={<SupplierPaymentForm />} />
            <Route path="purchases/:id/return" element={<PurchaseReturnForm />} />

            {/* Reports */}
            <Route path="reports" element={<ReportsLayout />}>
              <Route path="sales" element={<SalesReport />} />
              <Route path="products" element={<ProductPerformanceReport />} />
              <Route path="inventory" element={<InventoryReport />} />
              <Route path="purchases" element={<SupplierReport />} /> {/* Mapping purchases link to Supplier Report for now */}
            </Route>

            {/* Settings */}
            <Route path="settings/metadata" element={<MetadataSettingsPage />} />
            <Route path="settings/backup-restore" element={<BackupRestorePage />} />
            <Route path="settings/hardware" element={<HardwareSettingsPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
