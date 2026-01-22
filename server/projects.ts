import type { Express, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { projects, users } from "@shared/schema";
import { db } from "./db";

interface CreateProjectRequest {
  userId: string;
  name: string;
  clientName: string;
  address: string;
  status: "active" | "completed" | "on_hold";
  budget: number;
}

interface UpdateProjectRequest {
  name?: string;
  clientName?: string;
  address?: string;
  status?: "active" | "completed" | "on_hold";
  budget?: number;
}

export function registerProjectRoutes(app: Express) {
  /**
   * POST /api/projects
   * Create a new project for a user
   */
  app.post("/api/projects", async (req: Request, res: Response) => {
    try {
      const { userId, name, clientName, address, status, budget } = req.body as CreateProjectRequest;

      if (!userId || !name || !clientName || !address || !status) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: userId, name, clientName, address, status",
        });
      }

      // Verify user exists
      const userExists = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (userExists.length === 0) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      const newProject = await db
        .insert(projects)
        .values({
          userId,
          name,
          description: `Client: ${clientName}, Address: ${address}`,
          status,
        })
        .returning();

      console.log(`[Projects] Created project: ${newProject[0]?.id} for user: ${userId}`);

      return res.status(201).json({
        success: true,
        project: {
          id: newProject[0]?.id,
          name: newProject[0]?.name,
          clientName,
          address,
          status: newProject[0]?.status,
          budget,
          createdAt: newProject[0]?.createdAt,
        },
      });
    } catch (error) {
      console.error("[Projects] Create project error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to create project",
      });
    }
  });

  /**
   * GET /api/projects/:userId
   * Get all projects for a user
   */
  app.get("/api/projects/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: "userId is required",
        });
      }

      // ✅ Filter by userId for security
      const userProjects = await db
        .select()
        .from(projects)
        .where(eq(projects.userId, userId));

      return res.status(200).json({
        success: true,
        data: userProjects,
      });
    } catch (error) {
      console.error("[Projects] Error fetching projects:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch projects",
      });
    }
  });

  /**
   * PUT /api/projects/:projectId
   * Update a project
   */
  app.put("/api/projects/:projectId", async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const { userId, ...updates } = req.body as UpdateProjectRequest & { userId: string };

      if (!projectId || !userId) {
        return res.status(400).json({
          success: false,
          error: "projectId and userId are required",
        });
      }

      // Verify project belongs to user
      const existingProject = await db
        .select()
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);

      if (existingProject.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Project not found",
        });
      }

      if (existingProject[0]?.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: "Unauthorized: This project belongs to another user",
        });
      }

      const updatedProject = await db
        .update(projects)
        .set(updates)
        .where(eq(projects.id, projectId))
        .returning();

      console.log(`[Projects] Updated project: ${projectId}`);

      return res.status(200).json({
        success: true,
        project: updatedProject[0],
      });
    } catch (error) {
      console.error("[Projects] Update project error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to update project",
      });
    }
  });

  /**
   * DELETE /api/projects/:projectId
   * Delete a project
   */
  app.delete("/api/projects/:projectId", async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const { userId } = req.query as { userId: string };

      if (!projectId || !userId) {
        return res.status(400).json({
          success: false,
          error: "projectId and userId are required",
        });
      }

      // Verify project belongs to user
      const existingProject = await db
        .select()
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);

      if (existingProject.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Project not found",
        });
      }

      if (existingProject[0]?.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: "Unauthorized: This project belongs to another user",
        });
      }

      await db
        .delete(projects)
        .where(eq(projects.id, projectId));

      console.log(`[Projects] Deleted project: ${projectId}`);

      return res.status(200).json({
        success: true,
        message: "Project deleted successfully",
      });
    } catch (error) {
      console.error("[Projects] Delete project error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to delete project",
      });
    }
  });
}
