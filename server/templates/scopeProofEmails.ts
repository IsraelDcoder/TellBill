/**
 * ✅ HTML EMAIL TEMPLATES FOR SCOPE PROOF ENGINE
 * 
 * Professional, branded email templates with inline CSS
 * Used by scopeProof.ts and scopeProofScheduler.ts
 */

export function generateApprovalRequestEmail(params: {
  contractorName: string;
  workDescription: string;
  estimatedCost: number;
  photoUrls: string[];
  approvalUrl: string;
  expiresIn: number; // hours
  projectName?: string;
  clientEmail: string;
}): string {
  const photoGrid = params.photoUrls
    .slice(0, 3)
    .map(
      (url) => `
    <img src="${url}" alt="Work photo" style="width: 100%; height: 150px; object-fit: cover; border-radius: 6px; margin-bottom: 10px;">
  `
    )
    .join("");

  return `
    <table cellpadding="0" cellspacing="0" style="width: 100%; max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #ffffff;">
      <!-- Header with gradient -->
      <tr>
        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">TellBill</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Scope Proof Ready for Approval</p>
        </td>
      </tr>

      <!-- Main content -->
      <tr>
        <td style="padding: 40px 20px;">
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #1f2937; line-height: 1.6;">
            Hi ${params.contractorName},
          </p>

          <p style="margin: 0 0 30px 0; font-size: 16px; color: #1f2937; line-height: 1.6;">
            Your scope proof is ready! We've prepared this extra work for your client to approve.
          </p>

          <!-- Work details card -->
          <table cellpadding="0" cellspacing="0" style="width: 100%; background: #f3f4f6; border-radius: 8px; padding: 24px; margin-bottom: 30px; border: 1px solid #e5e7eb;">
            <tr>
              <td>
                <p style="margin: 0 0 12px 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Work Description</p>
                <p style="margin: 0 0 20px 0; font-size: 16px; color: #1f2937; font-weight: 500;">${params.workDescription}</p>

                ${
                  params.projectName
                    ? `
                  <p style="margin: 0 0 12px 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Project</p>
                  <p style="margin: 0 0 20px 0; font-size: 14px; color: #4b5563;">${params.projectName}</p>
                `
                    : ""
                }

                <hr style="border: none; border-top: 1px solid #d1d5db; margin: 0 0 20px 0;">

                <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Estimated Cost</p>
                <p style="margin: 0; font-size: 28px; color: #d4af37; font-weight: 700;">$${params.estimatedCost.toFixed(2)}</p>
              </td>
            </tr>
          </table>

          <!-- Photos section -->
          ${
            params.photoUrls.length > 0
              ? `
            <p style="margin: 0 0 12px 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Work Photos</p>
            <table cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 30px;">
              <tr>
                <td>
                  ${photoGrid}
                </td>
              </tr>
            </table>
          `
              : ""
          }

          <!-- Approval info -->
          <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 6px; margin-bottom: 30px;">
            <p style="margin: 0 0 12px 0; font-size: 14px; color: #1f2937; font-weight: 600;">What happens next?</p>
            <p style="margin: 0; font-size: 14px; color: #4b5563; line-height: 1.6;">
              Your client (${params.clientEmail}) will receive an approval link. Once they approve, this work automatically gets added to the invoice. No more forgotten extras!
            </p>
          </div>

          <!-- Time remaining -->
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 6px; margin-bottom: 30px;">
            <p style="margin: 0; font-size: 14px; color: #78350f;">
              <strong>⏰ Approval expires in ${params.expiresIn} hours</strong> — Make sure your client approves in time!
            </p>
          </div>

          <!-- CTA Button -->
          <table cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 30px;">
            <tr>
              <td style="text-align: center;">
                <a href="${params.approvalUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
                  View Scope Proof
                </a>
              </td>
            </tr>
          </table>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

          <p style="margin: 0; font-size: 12px; color: #9ca3af; line-height: 1.6;">
            Questions? Reply to this email or contact us in the TellBill app.
          </p>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background: #f9fafb; padding: 24px 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; font-size: 12px; color: #6b7280;">
            © TellBill • Making contractors unstoppable
          </p>
        </td>
      </tr>
    </table>
  `;
}

export function generateClientApprovalEmail(params: {
  contractorName: string;
  workDescription: string;
  estimatedCost: number;
  approvalUrl: string;
  photoUrls: string[];
}): string {
  const photoGrid = params.photoUrls
    .slice(0, 2)
    .map(
      (url) => `
    <img src="${url}" alt="Work photo" style="width: 48%; height: 150px; object-fit: cover; border-radius: 6px; display: inline-block; margin-right: 4%;">
  `
    )
    .join("");

  return `
    <table cellpadding="0" cellspacing="0" style="width: 100%; max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #ffffff;">
      <!-- Header -->
      <tr>
        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">TellBill</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Work Approval Needed</p>
        </td>
      </tr>

      <!-- Main content -->
      <tr>
        <td style="padding: 40px 20px;">
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #1f2937; line-height: 1.6;">
            Hi there,
          </p>

          <p style="margin: 0 0 30px 0; font-size: 16px; color: #1f2937; line-height: 1.6;">
            <strong>${params.contractorName}</strong> has completed some additional work on your project and is requesting your quick approval.
          </p>

          <!-- Work summary -->
          <div style="background: #f9fafb; border-left: 4px solid #d4af37; padding: 20px; border-radius: 6px; margin-bottom: 30px;">
            <p style="margin: 0 0 12px 0; font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Extra Work</p>
            <p style="margin: 0 0 16px 0; font-size: 18px; color: #1f2937; font-weight: 600;">${params.workDescription}</p>
            <p style="margin: 0; font-size: 24px; color: #d4af37; font-weight: 700;">$${params.estimatedCost.toFixed(2)}</p>
          </div>

          <!-- Photos -->
          ${
            params.photoUrls.length > 0
              ? `
            <p style="margin: 0 0 12px 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Work Photos</p>
            <table cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 30px;">
              <tr>
                <td>
                  ${photoGrid}
                </td>
              </tr>
            </table>
          `
              : ""
          }

          <!-- Approval section -->
          <div style="background: #f0fdf4; border-radius: 8px; padding: 24px; margin-bottom: 30px; text-align: center;">
            <p style="margin: 0 0 16px 0; font-size: 16px; color: #1f2937; font-weight: 600;">Does this look right?</p>
            <p style="margin: 0 0 24px 0; font-size: 14px; color: #4b5563;">Click below to approve. This will be added to your invoice.</p>

            <a href="${params.approvalUrl}" style="background: #22c55e; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);">
              ✓ Approve This Work
            </a>
          </div>

          <!-- Info section -->
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 6px;">
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #78350f; font-weight: 600;">ℹ️ This link expires in 24 hours</p>
            <p style="margin: 0; font-size: 12px; color: #92400e; line-height: 1.6;">
              If you don't approve by then, ${params.contractorName} will need to send a new request. It only takes a click!
            </p>
          </div>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background: #f9fafb; padding: 24px 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280;">
            TellBill helps contractors get paid for all their work.
          </p>
          <p style="margin: 0; font-size: 11px; color: #9ca3af;">
            © TellBill • Making work conversations profitable
          </p>
        </td>
      </tr>
    </table>
  `;
}

export function generateApprovalApprovedEmail(params: {
  workDescription: string;
  estimatedCost: number;
  invoiceAmount: number;
}): string {
  return `
    <table cellpadding="0" cellspacing="0" style="width: 100%; max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #ffffff;">
      <!-- Success header -->
      <tr>
        <td style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 32px;">✓</h1>
          <h2 style="color: white; margin: 12px 0 0 0; font-size: 24px; font-weight: 700;">Approved!</h2>
        </td>
      </tr>

      <!-- Content -->
      <tr>
        <td style="padding: 40px 20px;">
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #1f2937; line-height: 1.6;">
            Great news! Your client approved the extra work.
          </p>

          <!-- Details -->
          <table cellpadding="0" cellspacing="0" style="width: 100%; background: #f0fdf4; border-radius: 8px; padding: 20px; margin-bottom: 30px; border: 1px solid #86efac;">
            <tr>
              <td>
                <p style="margin: 0 0 12px 0; font-size: 12px; color: #166534; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">What was approved</p>
                <p style="margin: 0 0 20px 0; font-size: 16px; color: #1f2937; font-weight: 500;">${params.workDescription}</p>

                <p style="margin: 0 0 8px 0; font-size: 12px; color: #166534; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Cost</p>
                <p style="margin: 0; font-size: 24px; color: #22c55e; font-weight: 700;">+$${params.estimatedCost.toFixed(2)}</p>
              </td>
            </tr>
          </table>

          <!-- Invoice update -->
          <div style="background: #f3f4f6; border-left: 4px solid #667eea; padding: 16px; border-radius: 6px; margin-bottom: 30px;">
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #1f2937; font-weight: 600;">Invoice Updated</p>
            <p style="margin: 0; font-size: 14px; color: #4b5563;">
              This work has been added as a line item. New invoice total: <strong>$${params.invoiceAmount.toFixed(2)}</strong>
            </p>
          </div>

          <p style="margin: 0 0 20px 0; font-size: 14px; color: #4b5563; line-height: 1.6;">
            No more forgotten work. No more disputes. Just paid fairly for everything you do.
          </p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

          <p style="margin: 0; font-size: 12px; color: #9ca3af;">
            Open TellBill to view your updated invoice and next steps.
          </p>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background: #f9fafb; padding: 24px 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; font-size: 12px; color: #6b7280;">
            © TellBill • Revenue protection for contractors
          </p>
        </td>
      </tr>
    </table>
  `;
}
