import { useEffect, useState } from "react";
import * as Linking from "expo-linking";
import { Alert } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { useNavigation } from "@react-navigation/native";
import { flutterwaveService } from "@/services/flutterwaveService";
import { getApiUrl } from "@/lib/backendUrl";

interface PaymentResult {
  status: "pending" | "success" | "failed" | "cancelled";
  message?: string;
  planId?: "solo" | "team" | "enterprise";
}

const prefix = Linking.createURL("/");

export const useFlutterwavePayment = () => {
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();
  const { setCurrentPlan, setIsSubscribed } = useSubscriptionStore();
  const navigation = useNavigation<any>();

  useEffect(() => {
    // Set up deep link listener
    const subscription = Linking.addEventListener("url", handleDeepLink);

    // Handle initial URL (if app was launched from deep link)
    Linking.getInitialURL().then((url) => {
      if (url != null) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [user?.id]);

  const handleDeepLink = async (event: { url: string }) => {
    const { url } = event;

    // Parse the payment callback
    if (url.includes("payment")) {
      const params = new URL(url).searchParams;
      const reference = params.get("ref");
      const planId = params.get("plan") as
        | "solo"
        | "team"
        | "enterprise"
        | null;
      const userId = params.get("userId");
      const status = params.get("status");

      if (!reference || !planId || !userId) {
        setPaymentResult({
          status: "failed",
          message: "Invalid payment response",
        });
        return;
      }

      setIsProcessing(true);

      try {
        // Verify payment with backend
        const isVerified = await flutterwaveService.verifyPayment(
          reference,
          reference,
          planId,
          userId
        );

        if (isVerified) {
          // Update subscription
          setCurrentPlan(planId);
          setIsSubscribed(true);

          setPaymentResult({
            status: "success",
            message: `Welcome to the ${planId.charAt(0).toUpperCase() + planId.slice(1)} plan!`,
            planId,
          });

          // Navigate to payment success screen
          setTimeout(() => {
            navigation.navigate("PaymentSuccess", { planId });
          }, 500);

          Alert.alert(
            "Payment Successful",
            `You've successfully upgraded to the ${planId.charAt(0).toUpperCase() + planId.slice(1)} plan!`
          );
        } else {
          setPaymentResult({
            status: "failed",
            message: "Payment verification failed",
          });

          Alert.alert(
            "Payment Failed",
            "Your payment could not be verified. Please try again."
          );
        }
      } catch (error) {
        console.error("[Payment Hook] Error processing payment:", error);
        setPaymentResult({
          status: "failed",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const initiatePayment = async (
    planId: "solo" | "team" | "enterprise",
    planName: string,
    userEmail: string,
    userPhone: string,
    userFullName: string
  ) => {
    if (!user?.id) {
      setPaymentResult({
        status: "failed",
        message: "You must be logged in to process payment",
      });
      return;
    }

    setIsProcessing(true);
    setPaymentResult({ status: "pending" });

    try {
      const amount = flutterwaveService.getPlanPrice(planId);

      const result = await flutterwaveService.initiatePayment({
        userId: user.id,
        amount,
        planId,
        planName,
        email: userEmail,
        phoneNumber: userPhone,
        userFullName,
      });

      if (!result.success) {
        setPaymentResult({
          status: "failed",
          message: result.error || "Failed to initiate payment",
        });
      }
    } catch (error) {
      console.error("[Payment Hook] Payment initiation error:", error);
      setPaymentResult({
        status: "failed",
        message: error instanceof Error ? error.message : "Payment initiation failed",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetPaymentResult = () => {
    setPaymentResult(null);
  };

  return {
    paymentResult,
    isProcessing,
    initiatePayment,
    resetPaymentResult,
  };
};
