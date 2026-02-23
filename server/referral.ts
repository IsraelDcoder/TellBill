import type { Express, Request, Response } from "express";
import { eq, and, sql, count } from "drizzle-orm";
import { db } from "./db";
import { referralCodes, referralConversions, referralBonuses, users } from "@shared/schema";
import { authMiddleware } from "./utils/authMiddleware";
import { randomBytes } from "crypto";

/**
 * Generate a unique 8-character referral code
 * Format: 3 letters + 4 digits + 1 letter (e.g., ABC1D2E3F)
 */
function generateReferralCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function registerReferralRoutes(app: Express) {
  /**
   * GET /api/referral/my-code
   * Get user's referral code (creates one if doesn't exist)
   * Returns: { code, link, referrals_count }
   */
  app.get("/api/referral/my-code", authMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, error: "Not authenticated" });
      }

      // Check if user already has a referral code
      let existingCode = await db
        .select()
        .from(referralCodes)
        .where(eq(referralCodes.userId, userId))
        .limit(1);

      let code: string;

      if (existingCode.length === 0) {
        // Generate new code
        let newCode = generateReferralCode();
        
        // Ensure uniqueness
        let isUnique = false;
        while (!isUnique) {
          const existing = await db
            .select()
            .from(referralCodes)
            .where(eq(referralCodes.code, newCode))
            .limit(1);
          
          if (existing.length === 0) {
            isUnique = true;
          } else {
            newCode = generateReferralCode();
          }
        }

        // Insert new code
        await db.insert(referralCodes).values({
          userId,
          code: newCode,
        });

        code = newCode;
        console.log(`[Referral] ✅ New referral code created for user ${userId}: ${code}`);
      } else {
        code = existingCode[0].code;
      }

      // Get referral count (conversions where status = 'converted')
      const referralCount = await db
        .select({ count: count() })
        .from(referralConversions)
        .where(
          and(
            eq(referralConversions.referrerId, userId),
            eq(referralConversions.status, 'converted')
          )
        );

      const count_value = referralCount[0]?.count || 0;

      // Get bonus status
      const bonusData = await db
        .select()
        .from(referralBonuses)
        .where(eq(referralBonuses.userId, userId))
        .limit(1);

      const referralLink = `https://tellbill.app/signup?ref=${code}`;

      return res.json({
        success: true,
        code,
        link: referralLink,
        referral_count: count_value,
        bonus_progress: `${count_value}/3 referrals until 1 month free`,
        bonus_earned: bonusData.length > 0 && bonusData[0].bonusEarnedAt !== null,
        bonus_redeemed: bonusData.length > 0 && bonusData[0].bonusRedeemedAt !== null,
      });
    } catch (error) {
      console.error("[Referral] Error getting referral code:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to get referral code",
      });
    }
  });

  /**
   * POST /api/referral/signup-with-code
   * When new user signs up with a referral code
   * Body: { referral_code }
   * This should be called during signup process
   */
  app.post("/api/referral/signup-with-code", authMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const { referralCode } = req.body;

      if (!userId || !referralCode) {
        return res.status(400).json({
          success: false,
          error: "User ID and referral code are required",
        });
      }

      // Find the referral code (belongs to referrer)
      const codeData = await db
        .select()
        .from(referralCodes)
        .where(eq(referralCodes.code, referralCode))
        .limit(1);

      if (codeData.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Invalid referral code",
        });
      }

      const referrerId = codeData[0].userId;

      // Check if this referral already exists (prevent duplicates)
      const existing = await db
        .select()
        .from(referralConversions)
        .where(
          and(
            eq(referralConversions.referrerId, referrerId),
            eq(referralConversions.referredUserId, userId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        return res.status(400).json({
          success: false,
          error: "This referral has already been recorded",
        });
      }

      // Record the referral (status = 'pending' until referred user upgrades)
      const conversion = await db
        .insert(referralConversions)
        .values({
          referrerId,
          referredUserId: userId,
          referralCode: referralCode,
          status: "pending",
        })
        .returning();

      console.log(`[Referral] ✅ New signup with referral code: ${referralCode} (Referred by: ${referrerId})`);

      return res.status(201).json({
        success: true,
        referral_id: conversion[0].id,
        referrer_id: referrerId,
        status: "pending",
      });
    } catch (error) {
      console.error("[Referral] Error recording signup:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to record referral",
      });
    }
  });

  /**
   * POST /api/referral/mark-converted
   * Called when referred user completes payment
   * Body: { referral_id }
   * Backend should call this from payment webhook
   */
  app.post("/api/referral/mark-converted", authMiddleware, async (req: Request, res: Response) => {
    try {
      const { referralId } = req.body;

      if (!referralId) {
        return res.status(400).json({
          success: false,
          error: "Referral ID is required",
        });
      }

      // Update conversion status
      const updated = await db
        .update(referralConversions)
        .set({ status: 'converted', convertedAt: new Date() })
        .where(eq(referralConversions.id, referralId))
        .returning();

      if (updated.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Referral not found",
        });
      }

      const referrerId = updated[0].referrerId;

      // Check if referrer now has 3 conversions → trigger bonus
      const conversionCount = await db
        .select({ count: count() })
        .from(referralConversions)
        .where(
          and(
            eq(referralConversions.referrerId, referrerId),
            eq(referralConversions.status, 'converted')
          )
        );

      const conversion_count = conversionCount[0]?.count || 0;

      // If 3 conversions, create bonus entry
      if (conversion_count === 3) {
        const bonusExpiry = new Date();
        bonusExpiry.setMonth(bonusExpiry.getMonth() + 1); // 1 month expiry

        await db
          .insert(referralBonuses)
          .values({
            userId: referrerId,
            successfulReferrals: conversion_count,
            bonusEarnedAt: new Date(),
            bonusExpiresAt: bonusExpiry,
          })
          .onConflictDoUpdate({
            target: referralBonuses.userId,
            set: {
              successfulReferrals: conversion_count,
              bonusEarnedAt: new Date(),
              bonusExpiresAt: bonusExpiry,
            },
          });

        console.log(`[Referral] 🎉 User ${referrerId} earned 1-month bonus! (3 referrals)`);
      }

      return res.json({
        success: true,
        message: "Referral marked as converted",
        referrer_id: referrerId,
        total_conversions: conversion_count,
        bonus_earned: conversion_count === 3,
      });
    } catch (error) {
      console.error("[Referral] Error marking conversion:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to mark referral as converted",
      });
    }
  });

  /**
   * GET /api/referral/stats
   * Get referral stats for dashboard
   */
  app.get("/api/referral/stats", authMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, error: "Not authenticated" });
      }

      // Count successfully referred users
      const conversions = await db
        .select({ count: count() })
        .from(referralConversions)
        .where(
          and(
            eq(referralConversions.referrerId, userId),
            eq(referralConversions.status, 'converted')
          )
        );

      const conversion_count = conversions[0]?.count || 0;

      // Get pending referrals (signed up but not yet paid)
      const pending = await db
        .select({ count: count() })
        .from(referralConversions)
        .where(
          and(
            eq(referralConversions.referrerId, userId),
            eq(referralConversions.status, 'pending')
          )
        );

      const pending_count = pending[0]?.count || 0;

      // Check bonus status
      const bonus = await db
        .select()
        .from(referralBonuses)
        .where(eq(referralBonuses.userId, userId))
        .limit(1);

      const bonus_earned = bonus.length > 0 && bonus[0].bonusEarnedAt !== null;
      const bonus_redeemed = bonus.length > 0 && bonus[0].bonusRedeemedAt !== null;

      return res.json({
        success: true,
        stats: {
          total_conversions: conversion_count,
          pending_signups: pending_count,
          progress_to_bonus: `${conversion_count}/3`,
          bonus_earned,
          bonus_redeemed,
          bonus_expires_at: bonus.length > 0 ? bonus[0].bonusExpiresAt : null,
        },
      });
    } catch (error) {
      console.error("[Referral] Error getting stats:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to get referral stats",
      });
    }
  });

  /**
   * POST /api/referral/redeem-bonus
   * Redeem earned 1-month bonus (applies discount to subscription)
   */
  app.post("/api/referral/redeem-bonus", authMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, error: "Not authenticated" });
      }

      // Get bonus
      const bonus = await db
        .select()
        .from(referralBonuses)
        .where(
          and(
            eq(referralBonuses.userId, userId),
            sql`bonus_earned_at IS NOT NULL`,
            sql`bonus_redeemed_at IS NULL`
          )
        )
        .limit(1);

      if (bonus.length === 0) {
        return res.status(400).json({
          success: false,
          error: "No unredeemed bonus found",
        });
      }

      // Mark as redeemed
      await db
        .update(referralBonuses)
        .set({ bonusRedeemedAt: new Date() })
        .where(eq(referralBonuses.userId, userId));

      console.log(`[Referral] ✅ User ${userId} redeemed 1-month bonus`);

      return res.json({
        success: true,
        message: "Bonus redeemed! You get 1 month of Professional features free.",
        bonus_expires_at: bonus[0].bonusExpiresAt,
      });
    } catch (error) {
      console.error("[Referral] Error redeeming bonus:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to redeem bonus",
      });
    }
  });
}
