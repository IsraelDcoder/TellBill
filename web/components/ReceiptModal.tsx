/**
 * Receipt Modal Component
 * Displays enlarged receipt image in a modal
 * Allows users to view receipt details and photos
 */

import React from "react";
import { Receipt } from "../lib/api";

interface ReceiptModalProps {
  receipt: Receipt | null;
  isOpen: boolean;
  onClose: () => void;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({ receipt, isOpen, onClose }) => {
  if (!isOpen || !receipt) return null;

  // Parse extracted items if it's a JSON string
  let items: any[] = [];
  try {
    items = typeof receipt.extractedItems === "string" 
      ? JSON.parse(receipt.extractedItems) 
      : receipt.extractedItems;
  } catch {
    console.error("Failed to parse extracted items");
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const purchaseDate = new Date(receipt.purchaseDate).toLocaleDateString();

  return (
    <div className="receipt-modal-overlay" onClick={onClose}>
      <div className="receipt-modal" onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button className="modal-close" onClick={onClose}>
          ✕
        </button>

        {/* Modal content */}
        <div className="receipt-modal-content">
          {/* Receipt image */}
          <div className="receipt-image-container">
            <img 
              src={receipt.photoUrl} 
              alt={`Receipt from ${receipt.vendor}`}
              className="receipt-image"
            />
          </div>

          {/* Receipt metadata */}
          <div className="receipt-metadata">
            <h3 className="receipt-vendor">{receipt.vendor}</h3>
            <p className="receipt-date">
              📅 {purchaseDate}
            </p>
            <div className="receipt-total">
              <span className="label">Total Amount:</span>
              <span className="amount">{formatCurrency(receipt.totalAmount)}</span>
            </div>

            {/* Extracted items */}
            {items.length > 0 && (
              <div className="receipt-items">
                <h4>Extracted Items:</h4>
                <ul className="items-list">
                  {items.map((item: any, idx: number) => (
                    <li key={idx} className="item">
                      <span className="item-name">{item.name || item.description || "Item"}</span>
                      {item.quantity && (
                        <span className="item-qty">× {item.quantity}</span>
                      )}
                      {item.price && (
                        <span className="item-price">
                          {formatCurrency(item.price)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
            <a 
              href={receipt.photoUrl} 
              download 
              className="btn btn-primary"
            >
              Download Image
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal;
