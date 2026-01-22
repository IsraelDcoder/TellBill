/**
 * Client Portal Page
 * Main page at /view/[token]
 * Shows project progress, activities, invoice, and approval interface
 */

import React, { useState, useEffect } from "react";
import { clientPortalAPI, ClientPortalData, InvoiceSummary } from "../lib/api";
import ProjectHeader from "../components/ProjectHeader";
import InvoiceSummary from "../components/InvoiceSummary";
import ActivityFeed from "../components/ActivityFeed";
import ChangeOrderCard from "../components/ChangeOrderCard";
import ErrorBoundary from "../components/ErrorBoundary";
import LoadingSpinner from "../components/LoadingSpinner";
import "../styles/portal.css";

interface ClientPortalPageProps {
  token?: string;
}

type PageState = "loading" | "ready" | "error" | "expired";

export const ClientPortalPage: React.FC<ClientPortalPageProps> = ({ token }) => {
  // State management
  const [state, setState] = useState<PageState>("loading");
  const [error, setError] = useState<string>("");
  const [projectData, setProjectData] = useState<ClientPortalData | null>(null);
  const [invoiceSummary, setInvoiceSummary] = useState<InvoiceSummary | null>(null);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());

  // Extract token from URL if not passed as prop
  const getToken = (): string | null => {
    if (token) return token;

    // Try URL path: /view/[token]
    const pathMatch = window.location.pathname.match(/\/view\/([a-f0-9-]+)$/i);
    if (pathMatch) return pathMatch[1];

    // Try URL query: ?token=...
    const params = new URLSearchParams(window.location.search);
    return params.get("token");
  };

  // Fetch project data and invoice
  const fetchData = async (portalToken: string) => {
    try {
      setState("loading");
      setError("");

      // Fetch all data in parallel
      const [projectDataResponse, invoiceDataResponse, receiptsData] = await Promise.all([
        clientPortalAPI.fetchProjectData(portalToken),
        clientPortalAPI.fetchInvoiceSummary(portalToken),
        clientPortalAPI.fetchReceipts(portalToken),
      ]);

      setProjectData(projectDataResponse);
      setInvoiceSummary(invoiceDataResponse);
      setReceipts(receiptsData);
      setLastUpdated(Date.now());
      setState("ready");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";

      // Check if token expired or was revoked
      if (
        errorMsg.includes("expired") ||
        errorMsg.includes("revoked") ||
        errorMsg.includes("Invalid token")
      ) {
        setState("expired");
      } else {
        setState("error");
      }

      setError(errorMsg);
    }
  };

  // Initialize on mount
  useEffect(() => {
    const portalToken = getToken();

    if (!portalToken) {
      setError("No access token provided");
      setState("error");
      return;
    }

    fetchData(portalToken);
  }, [token]);

  // Refresh data periodically (every 30 seconds)
  useEffect(() => {
    const portalToken = getToken();
    if (!portalToken || state !== "ready") return;

    const interval = setInterval(() => {
      fetchData(portalToken);
    }, 30000);

    return () => clearInterval(interval);
  }, [state, token]);

  // Handle refresh button click
  const handleRefresh = () => {
    const portalToken = getToken();
    if (portalToken) {
      fetchData(portalToken);
    }
  };

  // Handle activity approval
  const handleActivityApproved = (eventId: string, status: "APPROVED" | "REJECTED") => {
    // Refresh data to show updated state
    const portalToken = getToken();
    if (portalToken) {
      fetchData(portalToken);
    }
  };

  // Render error state - token expired
  if (state === "expired") {
    return (
      <div className="portal-page expired-state">
        <div className="expired-container">
          <div className="expired-icon">⏰</div>
          <h1>Access Expired</h1>
          <p>This portal link has either expired or been revoked.</p>
          <p className="error-details">{error}</p>
          <p className="contact-info">
            Please contact the contractor to request a new link.
          </p>
        </div>
      </div>
    );
  }

  // Render error state - generic error
  if (state === "error") {
    return (
      <div className="portal-page error-state">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h1>Unable to Load Portal</h1>
          <p className="error-details">{error}</p>
          <button onClick={handleRefresh} className="btn btn-primary">
            Try Again
          </button>
          <p className="contact-info">
            If the problem persists, please contact the contractor.
          </p>
        </div>
      </div>
    );
  }

  // Render loading state
  if (state === "loading") {
    return (
      <div className="portal-page loading-state">
        <LoadingSpinner />
        <p>Loading project portal...</p>
      </div>
    );
  }

  // Render ready state - main portal UI
  if (!projectData || !invoiceSummary) {
    return <div className="portal-page">Error: No data</div>;
  }

  const changeOrders = projectData.activities.filter((a) => a.eventType === "ALERT");
  const visibleActivities = projectData.activities.filter((a) => a.eventType !== "ALERT");

  return (
    <ErrorBoundary>
      <div className="portal-page">
        {/* Header */}
        <ProjectHeader project={projectData.project} />

        {/* Main Content */}
        <div className="portal-container">
          {/* Left Column - Invoice Summary (Sticky) */}
          <aside className="portal-sidebar">
            <InvoiceSummary summary={invoiceSummary} />

            {/* Refresh Info */}
            <div className="refresh-info">
              <small>Last updated: {new Date(lastUpdated).toLocaleTimeString()}</small>
              <button
                onClick={handleRefresh}
                className="refresh-btn"
                title="Refresh data"
              >
                🔄
              </button>
            </div>
          </aside>

          {/* Right Column - Activities */}
          <main className="portal-main">
            {/* Change Orders Section */}
            {changeOrders.length > 0 && (
              <section className="change-orders-section">
                <h2>⚠️ Change Orders Awaiting Approval</h2>
                <p className="section-description">
                  The contractor has proposed changes that affect your invoice. Review and
                  approve or reject each one below.
                </p>
                <div className="change-orders-list">
                  {changeOrders.map((activity) => (
                    <ChangeOrderCard
                      key={activity.eventId}
                      activity={activity}
                      onApproved={() => handleActivityApproved(activity.eventId, "APPROVED")}
                      onRejected={() => handleActivityApproved(activity.eventId, "REJECTED")}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Activity Timeline */}
            <section className="activity-section">
              <h2>📋 Project Activity</h2>
              {visibleActivities.length === 0 ? (
                <div className="empty-state">
                  <p>No activities to display yet</p>
                </div>
              ) : (
                <ActivityFeed activities={visibleActivities} receipts={receipts} />
              )}
            </section>
          </main>
        </div>

        {/* Footer */}
        <footer className="portal-footer">
          <div className="footer-content">
            <p>
              Powered by <strong>TellBill</strong> — Real-time project communication
            </p>
            <p className="footer-security">🔒 Your data is secure and encrypted</p>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  );
};

export default ClientPortalPage;
