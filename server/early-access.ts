import type { Express } from "express";
import { db } from "./db";
import { earlyAccess } from "../shared/schema";
import { eq } from "drizzle-orm";
import { authMiddleware } from "./utils/authMiddleware";
import { sendEmail } from "./emailService";

/**
 * Early Access Waitlist API
 * - POST /api/early-access: Sign up for early access
 * - GET /api/early-admin: Admin dashboard (founder only)
 * - GET /api/early-admin/export: Export CSV of signups
 */

export function registerEarlyAccessRoutes(app: Express) {
  /**
   * POST /api/early-access
   * Sign up for early access waitlist
   * Body: { name, email, trade? }
   * Returns: { success: boolean, message: string }
   */
  app.post("/api/early-access", async (req, res) => {
    try {
      const { name, email, trade } = req.body;

      // ✅ Validation
      if (!name || typeof name !== "string" || name.trim().length < 2) {
        return res.status(400).json({
          error: "Please provide a valid name (at least 2 characters).",
        });
      }

      if (!email || typeof email !== "string" || !isValidEmail(email)) {
        return res.status(400).json({
          error: "Please provide a valid email address.",
        });
      }

      // ✅ Normalize email (lowercase, trim)
      const normalizedEmail = email.toLowerCase().trim();

      // ✅ Check for duplicates
      const existing = await db
        .select()
        .from(earlyAccess)
        .where(eq(earlyAccess.email, normalizedEmail))
        .limit(1);

      if (existing.length > 0) {
        return res.status(409).json({
          error: "This email is already on the waitlist.",
        });
      }

      // ✅ Check capacity (50-spot limit)
      const count = await db.select().from(earlyAccess);
      if (count.length >= 50) {
        return res.status(403).json({
          error: "Early access is at capacity. Thank you for your interest!",
        });
      }

      // ✅ Insert into database
      await db.insert(earlyAccess).values({
        name: name.trim(),
        email: normalizedEmail,
        trade: trade || null,
      });

      // ✅ Send confirmation email
      try {
        await sendEmail({
          to: normalizedEmail,
          subject: "You're on the TellBill Early Access List 🎉",
          html: `
            <h2>Welcome to TellBill Early Access!</h2>
            <p>Hi ${name},</p>
            <p>You're now on the exclusive list of ${count.length + 1} contractors getting early access to TellBill.</p>
            <p>We'll notify you the moment access opens. Keep an eye on your inbox!</p>
            <p><strong>In the meantime:</strong> Reply to this email with questions or feature requests. We read every response.</p>
            <p>— The TellBill Founder</p>
          `,
        });
      } catch (emailError) {
        console.error("Failed to send confirmation email:", emailError);
        // Don't fail the signup if email fails
      }

      // ✅ Log the signup
      console.log(
        `[Early Access] New signup: ${name} (${normalizedEmail}) - ${count.length + 1}/50`
      );

      return res.status(200).json({
        success: true,
        message: "You're on the list! We'll notify you before launch.",
        spotsRemaining: 50 - (count.length + 1),
      });
    } catch (error) {
      console.error("[Early Access] Error:", error);
      return res.status(500).json({
        error: "Something went wrong. Please try again later.",
      });
    }
  });

  /**
   * GET /api/early-admin
   * Founder-only dashboard - view all signups
   * Requires: Founder authentication (specific user ID)
   * Returns: HTML page with signup list and stats
   */
  app.get("/api/early-admin", authMiddleware, async (req, res) => {
    try {
      // ✅ Restrict to founder only (hardcode for now, can be made dynamic)
      const founderId = process.env.FOUNDER_USER_ID;
      if (!founderId || req.user?.userId !== founderId) {
        return res.status(403).json({
          error: "Unauthorized. Founder access only.",
        });
      }

      // ✅ Fetch all signups, ordered by most recent
      const signups = await db
        .select()
        .from(earlyAccess)
        .orderBy(earlyAccess.createdAt); // Latest first

      const total = signups.length;
      const remaining = 50 - total;

      // ✅ Group by trade for stats
      const tradeStats: Record<string, number> = {};
      signups.forEach((signup) => {
        if (signup.trade) {
          tradeStats[signup.trade] = (tradeStats[signup.trade] || 0) + 1;
        }
      });

      // ✅ Return HTML dashboard
      const html = generateAdminDashboard(signups, total, remaining, tradeStats);
      res.setHeader("Content-Type", "text/html");
      return res.send(html);
    } catch (error) {
      console.error("[Early Admin] Error:", error);
      return res.status(500).json({
        error: "Failed to load dashboard.",
      });
    }
  });

  /**
   * GET /api/early-admin/export
   * Export all signups as CSV
   * Requires: Founder authentication
   */
  app.get("/api/early-admin/export", authMiddleware, async (req, res) => {
    try {
      // ✅ Restrict to founder only
      const founderId = process.env.FOUNDER_USER_ID;
      if (!founderId || req.user?.userId !== founderId) {
        return res.status(403).json({
          error: "Unauthorized. Founder access only.",
        });
      }

      // ✅ Fetch all signups
      const signups = await db.select().from(earlyAccess);

      // ✅ Generate CSV
      const csv = generateCSV(signups);

      // ✅ Send as downloadable file
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=tellbill-early-access.csv"
      );
      res.setHeader("Content-Type", "text/csv");
      return res.send(csv);
    } catch (error) {
      console.error("[Early Admin Export] Error:", error);
      return res.status(500).json({
        error: "Failed to export data.",
      });
    }
  });
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Generate admin dashboard HTML
 */
function generateAdminDashboard(
  signups: any[],
  total: number,
  remaining: number,
  tradeStats: Record<string, number>
): string {
  const rows = signups
    .map(
      (s, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${s.name}</td>
        <td>${s.email}</td>
        <td>${s.trade || "—"}</td>
        <td>${new Date(s.createdAt).toLocaleDateString()}</td>
      </tr>
    `
    )
    .join("");

  const tradeRows = Object.entries(tradeStats)
    .sort((a, b) => b[1] - a[1])
    .map(
      ([trade, count]) => `
      <tr>
        <td>${trade}</td>
        <td>${count}</td>
      </tr>
    `
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>TellBill Early Access Admin</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #f5f5f5;
          padding: 20px;
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
          background: white;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        h1 {
          color: #1a1a1a;
          margin-bottom: 10px;
          font-size: 28px;
        }
        .stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin: 30px 0;
        }
        .stat-card {
          background: #f9f9f9;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
        }
        .stat-card h3 {
          color: #888;
          font-size: 12px;
          text-transform: uppercase;
          margin-bottom: 10px;
          font-weight: 600;
        }
        .stat-card .number {
          font-size: 36px;
          font-weight: 700;
          color: #ff9f43;
        }
        .section {
          margin-top: 40px;
        }
        .section h2 {
          font-size: 18px;
          color: #1a1a1a;
          margin-bottom: 15px;
          border-bottom: 2px solid #ff9f43;
          padding-bottom: 10px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }
        th {
          background: #f9f9f9;
          padding: 12px;
          text-align: left;
          font-weight: 600;
          color: #1a1a1a;
          border-bottom: 2px solid #e0e0e0;
        }
        td {
          padding: 12px;
          border-bottom: 1px solid #f0f0f0;
        }
        tr:hover {
          background: #fafafa;
        }
        .actions {
          margin-top: 20px;
          display: flex;
          gap: 10px;
        }
        a, button {
          padding: 10px 20px;
          background: #ff9f43;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          text-decoration: none;
          font-size: 14px;
          font-weight: 600;
          transition: background 0.2s;
        }
        a:hover, button:hover {
          background: #f08030;
        }
        .empty {
          color: #999;
          text-align: center;
          padding: 30px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🎉 Early Access Admin Dashboard</h1>
        <p style="color: #666; margin-bottom: 20px;">Manage TellBill early access signups (Limited to 50)</p>

        <div class="stats">
          <div class="stat-card">
            <h3>Total Signups</h3>
            <div class="number">${total}</div>
          </div>
          <div class="stat-card">
            <h3>Remaining Spots</h3>
            <div class="number">${remaining}</div>
          </div>
          <div class="stat-card">
            <h3>Capacity Used</h3>
            <div class="number">${Math.round((total / 50) * 100)}%</div>
          </div>
        </div>

        <div class="section">
          <h2>📊 Signups by Trade</h2>
          ${
            Object.keys(tradeStats).length > 0
              ? `<table>
              <tr>
                <th>Trade/Type</th>
                <th>Count</th>
              </tr>
              ${tradeRows}
            </table>`
              : '<p class="empty">No trade data yet</p>'
          }
        </div>

        <div class="section">
          <h2>📋 All Signups</h2>
          ${
            signups.length > 0
              ? `<table>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Email</th>
                <th>Trade</th>
                <th>Signup Date</th>
              </tr>
              ${rows}
            </table>`
              : '<p class="empty">No signups yet</p>'
          }
        </div>

        <div class="actions">
          <a href="/api/early-admin/export">📥 Export as CSV</a>
          <button onclick="window.location.reload()">🔄 Refresh</button>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate CSV from signups
 */
function generateCSV(signups: any[]): string {
  let csv = "Name,Email,Trade,Signup Date\n";
  signups.forEach((s) => {
    const date = new Date(s.createdAt).toLocaleDateString();
    const trade = s.trade || "";
    csv += `"${s.name}","${s.email}","${trade}","${date}"\n`;
  });
  return csv;
}
