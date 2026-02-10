import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

let stripeInstance: Stripe | null = null;

/**
 * Lazy initialization of Stripe client
 * Only throws error when actually trying to use Stripe, not at server startup
 */
export const stripe = new Proxy({} as Stripe, {
  get: (target, prop) => {
    if (!stripeInstance) {
      if (!stripeSecretKey) {
        throw new Error(
          "STRIPE_SECRET_KEY environment variable is required for payment operations. " +
          "Add to .env: STRIPE_SECRET_KEY=sk_test_xxxxx"
        );
      }
      stripeInstance = new Stripe(stripeSecretKey, {
        apiVersion: "2023-10-16",
      });
    }
    return (stripeInstance as any)[prop];
  },
});

export function isStripeConfigured(): boolean {
  return !!stripeSecretKey;
}
