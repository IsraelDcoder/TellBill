import type { Express, Request, Response } from "express";
import { eq, and } from "drizzle-orm";
import {
  jobSites,
  inventoryItems,
  stockHistory,
  reorderOrders,
  users,
} from "@shared/schema";
import { db } from "./db";

interface CreateJobSiteRequest {
  userId: string;
  name: string;
  location?: string;
  description?: string;
}

interface UpdateJobSiteRequest {
  name?: string;
  location?: string;
  description?: string;
  status?: "active" | "inactive" | "completed";
}

interface AddInventoryRequest {
  siteId: string;
  name: string;
  description?: string;
  category?: string;
  unit?: string;
  minimumStock?: number;
  reorderQuantity?: number;
  unitCost?: number;
}

interface UpdateStockRequest {
  currentStock: number;
  reason?: string;
}

interface PlaceReorderRequest {
  quantity: number;
  supplier?: string;
  expectedDate?: number;
  notes?: string;
}

export function registerInventoryRoutes(app: Express) {
  // Health check endpoint
  app.get("/api/inventory/health", async (_req: Request, res: Response) => {
    return res.status(200).json({ success: true, message: "Inventory API is healthy" });
  });

  // ===== JOB SITES ENDPOINTS =====

  /**
   * POST /api/job-sites
   * Create a new job site
   */
  app.post("/api/job-sites", async (req: Request, res: Response) => {
    try {
      const { userId, name, location, description } = req.body as CreateJobSiteRequest;

      if (!userId || !name) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: userId, name",
        });
      }

      // Verify user exists
      const userIdStr = typeof userId === "string" ? userId : "";
      const userExists = await db
        .select()
        .from(users)
        .where(eq(users.id, userIdStr))
        .limit(1);

      if (userExists.length === 0) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      const newSite = await db
        .insert(jobSites)
        .values({
          userId,
          name,
          location,
          description,
        })
        .returning();

      console.log(`[Inventory] Created job site: ${newSite[0]?.id}`);

      return res.status(201).json({
        success: true,
        site: newSite[0],
      });
    } catch (error) {
      console.error("[Inventory] Create job site error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to create job site",
      });
    }
  });

  /**
   * GET /api/job-sites/:userId
   * Get all job sites for a user
   */
  app.get("/api/job-sites/:userId", async (req: Request, res: Response) => {
    try {
      const userId = typeof req.params.userId === "string" ? req.params.userId : "";

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: "User ID is required",
        });
      }

      const sites = await db
        .select()
        .from(jobSites)
        .where(eq(jobSites.userId, userId));

      return res.status(200).json({
        success: true,
        sites,
      });
    } catch (error) {
      console.error("[Inventory] Get job sites error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch job sites",
      });
    }
  });

  /**
   * PUT /api/job-sites/:siteId
   * Update a job site
   */
  app.put("/api/job-sites/:siteId", async (req: Request, res: Response) => {
    try {
      const siteId = typeof req.params.siteId === "string" ? req.params.siteId : "";
      const { name, location, description, status } = req.body as UpdateJobSiteRequest;

      if (!siteId) {
        return res.status(400).json({
          success: false,
          error: "Site ID is required",
        });
      }

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (location !== undefined) updateData.location = location;
      if (description !== undefined) updateData.description = description;
      if (status !== undefined) updateData.status = status;
      updateData.updatedAt = new Date();

      const updated = await db
        .update(jobSites)
        .set(updateData)
        .where(eq(jobSites.id, siteId))
        .returning();

      if (updated.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Job site not found",
        });
      }

      console.log(`[Inventory] Updated job site: ${siteId}`);

      return res.status(200).json({
        success: true,
        site: updated[0],
      });
    } catch (error) {
      console.error("[Inventory] Update job site error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to update job site",
      });
    }
  });

  /**
   * DELETE /api/job-sites/:siteId
   * Delete a job site
   */
  app.delete("/api/job-sites/:siteId", async (req: Request, res: Response) => {
    try {
      const siteId = typeof req.params.siteId === "string" ? req.params.siteId : "";

      if (!siteId) {
        return res.status(400).json({
          success: false,
          error: "Site ID is required",
        });
      }

      const deleted = await db
        .delete(jobSites)
        .where(eq(jobSites.id, siteId))
        .returning();

      if (deleted.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Job site not found",
        });
      }

      console.log(`[Inventory] Deleted job site: ${siteId}`);

      return res.status(200).json({
        success: true,
        message: "Job site deleted successfully",
      });
    } catch (error) {
      console.error("[Inventory] Delete job site error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to delete job site",
      });
    }
  });

  // ===== INVENTORY ITEMS ENDPOINTS =====

  /**
   * POST /api/inventory
   * Add inventory item to a job site
   */
  app.post("/api/inventory", async (req: Request, res: Response) => {
    try {
      const {
        siteId,
        name,
        description,
        category,
        unit,
        minimumStock,
        reorderQuantity,
        unitCost,
      } = req.body as AddInventoryRequest;

      if (!siteId || !name) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: siteId, name",
        });
      }

      // Verify site exists
      const siteIdStr = typeof siteId === "string" ? siteId : "";
      const siteExists = await db
        .select()
        .from(jobSites)
        .where(eq(jobSites.id, siteIdStr))
        .limit(1);

      if (siteExists.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Job site not found",
        });
      }

      const newItem = await db
        .insert(inventoryItems)
        .values({
          siteId,
          name,
          description,
          category,
          unit: unit || "pcs",
          minimumStock: minimumStock ?? 10,
          reorderQuantity: reorderQuantity ?? 50,
          unitCost: unitCost ?? 0,
        })
        .returning();

      console.log(`[Inventory] Created inventory item: ${newItem[0]?.id}`);

      return res.status(201).json({
        success: true,
        item: newItem[0],
      });
    } catch (error) {
      console.error("[Inventory] Create inventory error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to add inventory item",
      });
    }
  });

  /**
   * GET /api/inventory/:siteId
   * Get all inventory items for a job site
   */
  app.get("/api/inventory/:siteId", async (req: Request, res: Response) => {
    try {
      const siteId = typeof req.params.siteId === "string" ? req.params.siteId : "";

      if (!siteId) {
        return res.status(400).json({
          success: false,
          error: "Site ID is required",
        });
      }

      const items = await db
        .select()
        .from(inventoryItems)
        .where(eq(inventoryItems.siteId, siteId));

      return res.status(200).json({
        success: true,
        items,
      });
    } catch (error) {
      console.error("[Inventory] Get inventory error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch inventory items",
      });
    }
  });

  /**
   * GET /api/inventory/low-stock/:userId
   * Get low-stock alerts for all user's items
   */
  app.get("/api/inventory/low-stock/:userId", async (req: Request, res: Response) => {
    try {
      const userId = typeof req.params.userId === "string" ? req.params.userId : "";

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: "User ID is required",
        });
      }

      // Get all job sites for user
      const userSites = await db
        .select()
        .from(jobSites)
        .where(eq(jobSites.userId, userId));

      const siteIds = userSites.map((s) => s.id);

      if (siteIds.length === 0) {
        return res.status(200).json({
          success: true,
          lowStockItems: [],
        });
      }

      // Get all items for user's sites, then filter for low stock
      const lowStockItems = await db
        .select({
          item: inventoryItems,
          site: jobSites,
        })
        .from(inventoryItems)
        .innerJoin(jobSites, eq(inventoryItems.siteId, jobSites.id))
        .where(eq(jobSites.userId, userId));

      // Filter items where current stock is below minimum
      const filtered = lowStockItems.filter(
        (row) => (row.item.currentStock ?? 0) < (row.item.minimumStock ?? 10),
      );

      return res.status(200).json({
        success: true,
        lowStockItems: filtered,
      });
    } catch (error) {
      console.error("[Inventory] Get low-stock error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch low-stock items",
      });
    }
  });

  /**
   * PUT /api/inventory/:itemId
   * Update inventory stock level
   */
  app.put("/api/inventory/:itemId", async (req: Request, res: Response) => {
    try {
      const itemId = typeof req.params.itemId === "string" ? req.params.itemId : "";
      const { currentStock, reason } = req.body as UpdateStockRequest;

      if (!itemId || currentStock === undefined) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: itemId, currentStock",
        });
      }

      // Get current item
      const item = await db
        .select()
        .from(inventoryItems)
        .where(eq(inventoryItems.id, itemId))
        .limit(1);

      if (item.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Inventory item not found",
        });
      }

      const previousStock = item[0].currentStock ?? 0;
      const quantity = currentStock - previousStock;
      const action = quantity > 0 ? "add" : "remove";

      // Update stock
      const updated = await db
        .update(inventoryItems)
        .set({
          currentStock: currentStock as number,
          updatedAt: new Date(),
        })
        .where(eq(inventoryItems.id, itemId))
        .returning();

      // Record in history
      await db.insert(stockHistory).values({
        itemId: item[0].id,
        action,
        quantity: Math.abs(quantity),
        previousStock,
        newStock: currentStock,
        reason,
      });

      console.log(`[Inventory] Updated stock for item ${itemId}: ${previousStock} -> ${currentStock}`);

      return res.status(200).json({
        success: true,
        item: updated[0],
      });
    } catch (error) {
      console.error("[Inventory] Update stock error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to update inventory stock",
      });
    }
  });

  /**
   * DELETE /api/inventory/:itemId
   * Delete inventory item
   */
  app.delete("/api/inventory/:itemId", async (req: Request, res: Response) => {
    try {
      const itemId = typeof req.params.itemId === "string" ? req.params.itemId : "";

      if (!itemId) {
        return res.status(400).json({
          success: false,
          error: "Item ID is required",
        });
      }

      const deleted = await db
        .delete(inventoryItems)
        .where(eq(inventoryItems.id, itemId))
        .returning();

      if (deleted.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Inventory item not found",
        });
      }

      console.log(`[Inventory] Deleted inventory item: ${itemId}`);

      return res.status(200).json({
        success: true,
        message: "Inventory item deleted successfully",
      });
    } catch (error) {
      console.error("[Inventory] Delete inventory error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to delete inventory item",
      });
    }
  });

  // ===== REORDER ENDPOINTS =====

  /**
   * POST /api/inventory/reorder/:itemId
   * Place a reorder for an item
   */
  app.post("/api/inventory/reorder/:itemId", async (req: Request, res: Response) => {
    try {
      const itemId = typeof req.params.itemId === "string" ? req.params.itemId : "";
      const { quantity, supplier, expectedDate, notes } = req.body as PlaceReorderRequest;

      if (!itemId || !quantity) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: itemId, quantity",
        });
      }

      // Verify item exists
      const item = await db
        .select()
        .from(inventoryItems)
        .where(eq(inventoryItems.id, itemId))
        .limit(1);

      if (item.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Inventory item not found",
        });
      }
      const order = await db
        .insert(reorderOrders)
        .values({
          itemId,
          quantity,
          supplier,
          expectedDate: expectedDate ? new Date(expectedDate) : undefined,
          notes,
        })
        .returning();

      console.log(`[Inventory] Created reorder: ${order[0]?.id}`);

      return res.status(201).json({
        success: true,
        order: order[0],
      });
    } catch (error) {
      console.error("[Inventory] Place reorder error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to place reorder",
      });
    }
  });

  /**
   * GET /api/inventory/reorder-status/:siteId
   * Get reorder history for a job site
   */
  app.get("/api/inventory/reorder-status/:siteId", async (req: Request, res: Response) => {
    try {
      const siteId = typeof req.params.siteId === "string" ? req.params.siteId : "";

      if (!siteId) {
        return res.status(400).json({
          success: false,
          error: "Site ID is required",
        });
      }

      // Get all items for site
      const siteItems = await db
        .select()
        .from(inventoryItems)
        .where(eq(inventoryItems.siteId, siteId));

      const itemIds = siteItems.map((i) => i.id);

      if (itemIds.length === 0) {
        return res.status(200).json({
          success: true,
          orders: [],
        });
      }

      // Get all reorders for these items
      const orders = await db.select().from(reorderOrders);
      const siteOrders = orders.filter((o) => itemIds.includes(o.itemId));

      return res.status(200).json({
        success: true,
        orders: siteOrders,
      });
    } catch (error) {
      console.error("[Inventory] Get reorder status error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch reorder status",
      });
    }
  });
}
