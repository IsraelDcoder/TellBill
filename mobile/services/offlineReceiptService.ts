import AsyncStorage from "@react-native-async-storage/async-storage";
import * as crypto from "expo-crypto";

interface PendingReceipt {
  id: string;
  projectId: string;
  vendor: string;
  date: string;
  items: Array<{
    name: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
  grandTotal: number;
  photoBase64: string;
  photoUri: string;
  timestamp: number;
  retries: number;
  status: "pending" | "failed";
}

const PENDING_RECEIPTS_KEY = "@bill_splitter:pending_receipts";
const MAX_RETRIES = 3;

export const offlineReceiptService = {
  /**
   * Add a receipt to the offline queue
   */
  async queueReceipt(
    projectId: string,
    vendor: string,
    date: string,
    items: PendingReceipt["items"],
    grandTotal: number,
    photoUri: string,
    photoBase64: string
  ): Promise<string> {
    try {
      const id = await crypto.digestStringAsync(
        crypto.CryptoDigestAlgorithm.SHA256,
        `${projectId}-${vendor}-${Date.now()}`
      );

      const receipt: PendingReceipt = {
        id,
        projectId,
        vendor,
        date,
        items,
        grandTotal,
        photoBase64,
        photoUri,
        timestamp: Date.now(),
        retries: 0,
        status: "pending",
      };

      const existing = await this.getPendingReceipts();
      existing.push(receipt);

      await AsyncStorage.setItem(PENDING_RECEIPTS_KEY, JSON.stringify(existing));
      console.log(`[OfflineReceiptService] Queued receipt: ${id}`);

      return id;
    } catch (error) {
      console.error("[OfflineReceiptService] Queue error:", error);
      throw error;
    }
  },

  /**
   * Get all pending receipts
   */
  async getPendingReceipts(): Promise<PendingReceipt[]> {
    try {
      const data = await AsyncStorage.getItem(PENDING_RECEIPTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("[OfflineReceiptService] Get error:", error);
      return [];
    }
  },

  /**
   * Get pending receipts for a specific project
   */
  async getPendingReceiptsForProject(projectId: string): Promise<PendingReceipt[]> {
    try {
      const all = await this.getPendingReceipts();
      return all.filter((r) => r.projectId === projectId);
    } catch (error) {
      console.error("[OfflineReceiptService] Get by project error:", error);
      return [];
    }
  },

  /**
   * Mark a receipt as synced and remove from queue
   */
  async markAsSynced(receiptId: string): Promise<void> {
    try {
      const existing = await this.getPendingReceipts();
      const updated = existing.filter((r) => r.id !== receiptId);
      await AsyncStorage.setItem(PENDING_RECEIPTS_KEY, JSON.stringify(updated));
      console.log(`[OfflineReceiptService] Marked as synced: ${receiptId}`);
    } catch (error) {
      console.error("[OfflineReceiptService] Mark synced error:", error);
      throw error;
    }
  },

  /**
   * Increment retry count for a receipt
   */
  async incrementRetry(receiptId: string): Promise<boolean> {
    try {
      const all = await this.getPendingReceipts();
      const receipt = all.find((r) => r.id === receiptId);

      if (!receipt) return false;

      receipt.retries++;

      if (receipt.retries >= MAX_RETRIES) {
        receipt.status = "failed";
        console.log(`[OfflineReceiptService] Max retries exceeded: ${receiptId}`);
      }

      await AsyncStorage.setItem(PENDING_RECEIPTS_KEY, JSON.stringify(all));
      return receipt.retries < MAX_RETRIES;
    } catch (error) {
      console.error("[OfflineReceiptService] Increment retry error:", error);
      return false;
    }
  },

  /**
   * Clear all pending receipts (use with caution)
   */
  async clearQueue(): Promise<void> {
    try {
      await AsyncStorage.removeItem(PENDING_RECEIPTS_KEY);
      console.log("[OfflineReceiptService] Queue cleared");
    } catch (error) {
      console.error("[OfflineReceiptService] Clear error:", error);
      throw error;
    }
  },

  /**
   * Get count of pending receipts
   */
  async getPendingCount(): Promise<number> {
    try {
      const all = await this.getPendingReceipts();
      return all.length;
    } catch (error) {
      console.error("[OfflineReceiptService] Count error:", error);
      return 0;
    }
  },

  /**
   * Process pending receipts when back online
   */
  async processPendingReceipts(uploadFn: (receipt: PendingReceipt) => Promise<void>): Promise<{
    successful: number;
    failed: number;
  }> {
    try {
      const receipts = await this.getPendingReceipts();
      let successful = 0;
      let failed = 0;

      for (const receipt of receipts) {
        try {
          await uploadFn(receipt);
          await this.markAsSynced(receipt.id);
          successful++;
        } catch (error) {
          console.error(
            `[OfflineReceiptService] Failed to process receipt ${receipt.id}:`,
            error
          );
          const shouldRetry = await this.incrementRetry(receipt.id);
          if (!shouldRetry) {
            failed++;
          }
        }
      }

      console.log(
        `[OfflineReceiptService] Processing complete - successful: ${successful}, failed: ${failed}`
      );
      return { successful, failed };
    } catch (error) {
      console.error("[OfflineReceiptService] Process error:", error);
      return { successful: 0, failed: 0 };
    }
  },
};
