import { eq } from "drizzle-orm";
import type { TaxProfile } from "../shared/schema";
import { taxProfiles } from "../shared/schema";

export interface TaxCalculation {
  laborTotal: number; // in cents
  materialsTotal: number; // in cents
  subtotal: number; // in cents (before tax)
  taxName: string | null;
  taxRate: number | null; // percentage, e.g., 7.5
  taxAppliesto: string | null; // labor_only, materials_only, labor_and_materials
  taxAmount: number; // in cents (calculated)
  total: number; // in cents (subtotal + tax)
}

export async function getDefaultTaxProfile(db: any, userId: string): Promise<TaxProfile | null> {

  const profile = await db
    .select()
    .from(taxProfiles)
    .where(eq(taxProfiles.userId, userId))
    .limit(1)
    .execute();

  return profile?.[0] || null;
}


function safeRound(cents: number): number {
  return Math.round(cents);
}


function calculateTaxAmount(
  laborTotal: number, // cents
  materialsTotal: number, // cents
  taxRate: number, // percentage 0-30
  appliesto: string // labor_only, materials_only, labor_and_materials
): number {
  // Convert percentage to decimal (7.5 → 0.075)
  const rateDecimal = taxRate / 100;

  let taxableBase = 0;

  if (appliesto === "labor_only") {
    taxableBase = laborTotal;
  } else if (appliesto === "materials_only") {
    taxableBase = materialsTotal;
  } else if (appliesto === "labor_and_materials") {
    taxableBase = laborTotal + materialsTotal;
  }

  // Calculate tax: round to nearest cent
  const taxAmount = safeRound(taxableBase * rateDecimal);

  return taxAmount;
}

/**
 * Apply tax to invoice data
 * 
 * Returns complete tax calculation with all values
 * Used when creating invoices
 */
export async function applyTax(
  db: any,
  userId: string,
  laborTotal: number, // cents
  materialsTotal: number, // cents
  taxProfile?: TaxProfile | null
): Promise<TaxCalculation> {
  // Get tax profile if not provided
  const profile = taxProfile || (await getDefaultTaxProfile(db, userId));

  // Calculate subtotal (before tax)
  const subtotal = safeRound(laborTotal + materialsTotal);

  // If no tax profile or tax disabled → no tax
  if (!profile || !profile.enabled) {
    return {
      laborTotal,
      materialsTotal,
      subtotal,
      taxName: null,
      taxRate: null,
      taxAppliesto: null,
      taxAmount: 0,
      total: subtotal,
    };
  }

  // Calculate tax
  const taxAmount = calculateTaxAmount(
    laborTotal,
    materialsTotal,
    Number(profile.rate), // Convert Decimal to number
    profile.appliesto
  );

  const total = safeRound(subtotal + taxAmount);

  return {
    laborTotal,
    materialsTotal,
    subtotal,
    taxName: profile.name,
    taxRate: Number(profile.rate),
    taxAppliesto: profile.appliesto,
    taxAmount,
    total,
  };
}

/**
 * Create or update user's default tax profile
 * 
 * Validates:
 * - Rate between 0-30
 * - Name max 40 chars
 * - appliesto is valid enum
 */
export async function saveTaxProfile(
  db: any,
  userId: string,
  {
    name,
    rate,
    appliesto,
    enabled,
  }: {
    name: string;
    rate: number;
    appliesto: string;
    enabled: boolean;
  }
): Promise<{ success: boolean; error?: string; profile?: TaxProfile }> {
  const { taxProfiles } = await import("@shared/schema");

  // Validation
  if (typeof rate !== "number" || rate < 0 || rate > 30) {
    return { success: false, error: "Tax rate must be between 0 and 30" };
  }

  if (!name || name.length > 40 || name.length === 0) {
    return { success: false, error: "Tax name must be 1-40 characters" };
  }

  if (!["labor_only", "materials_only", "labor_and_materials"].includes(appliesto)) {
    return {
      success: false,
      error: "appliesto must be labor_only, materials_only, or labor_and_materials",
    };
  }

  try {
    // Check if user has existing tax profile
    const existing = await db
      .select()
      .from(taxProfiles)
      .where(eq(taxProfiles.userId, userId))
      .limit(1)
      .execute();

    let profile;

    if (existing && existing.length > 0) {
      // Update existing
      const updated = await db
        .update(taxProfiles)
        .set({
          name,
          rate: rate.toString(), // Store as string for numeric type
          appliesto,
          enabled,
          updatedAt: new Date(),
        })
        .where(eq(taxProfiles.id, existing[0].id))
        .returning();

      profile = updated[0];
    } else {
      // Create new
      const created = await db
        .insert(taxProfiles)
        .values({
          userId,
          name,
          rate: rate.toString(),
          appliesto,
          enabled,
          isDefault: true,
        })
        .returning();

      profile = created[0];
    }

    return {
      success: true,
      profile,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[TaxService] Error saving tax profile:", errorMessage);
    return {
      success: false,
      error: `Failed to save tax profile: ${errorMessage}`,
    };
  }
}

/**
 * Format tax amount for display
 * Converts cents to decimal with 2 decimal places
 */
export function formatTaxAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * Format currency for display
 */
export function formatCurrency(cents: number): string {
  return "$" + formatTaxAmount(cents);
}
