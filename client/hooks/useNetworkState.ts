import { useEffect, useState, useCallback } from "react";
import NetInfo from "@react-native-community/netinfo";

interface NetworkState {
  isOnline: boolean;
  isConnected: boolean;
  type: string | null;
}

export function useNetworkState(): NetworkState {
  const [networkState, setNetworkState] = useState<NetworkState>({
    isOnline: true,
    isConnected: true,
    type: null,
  });

  useEffect(() => {
    // Subscribe to network state updates
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isOnline = state.isConnected && state.isInternetReachable;
      const isConnected = state.isConnected ?? false;

      setNetworkState({
        isOnline: isOnline ?? false,
        isConnected,
        type: state.type,
      });

      console.log(
        `[useNetworkState] Network state: online=${isOnline}, type=${state.type}`
      );
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return networkState;
}

/**
 * Hook to detect when network transitions from offline to online
 */
export function useOnline(callback?: () => void): boolean {
  const { isOnline } = useNetworkState();
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
    } else if (wasOffline && isOnline) {
      // Just came back online
      console.log("[useOnline] Network is back online");
      callback?.();
      setWasOffline(false);
    }
  }, [isOnline, wasOffline, callback]);

  return isOnline;
}
