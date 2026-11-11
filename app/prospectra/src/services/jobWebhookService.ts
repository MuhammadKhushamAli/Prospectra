import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

import { backendApiPath } from "../constants/api";
import type { JobWebhookEvent } from "../types/prospecting";

const ANDROID_CHANNEL_ID = "prospectra-jobs";

// Ensure local mobile OS notifications display as system heads-up banners even when the app is open
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

let permissionsInitialized = false;

export async function ensureMobileNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (window.Notification.permission === "granted") return true;
      if (window.Notification.permission !== "denied") {
        const perm = await window.Notification.requestPermission();
        return perm === "granted";
      }
    }
    return false;
  }

  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
        name: "Prospectra Background Jobs",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 200, 150, 200],
        enableVibrate: true,
        sound: "default",
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted" && !permissionsInitialized) {
      permissionsInitialized = true;
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === "granted";
  } catch {
    return false;
  }
}

/**
 * Triggers a native local mobile OS notification directly from the app
 * (without using Google Play Services / Firebase Cloud Messaging).
 */
export async function sendMobileJobNotification(
  title: string,
  body: string,
): Promise<void> {
  const granted = await ensureMobileNotificationPermissions();
  if (!granted) return;

  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && "Notification" in window) {
      new window.Notification(title, { body });
    }
    return;
  }

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: "default",
        ...(Platform.OS === "android" ? { channelId: ANDROID_CHANNEL_ID } : {}),
      },
      trigger: null, // Immediate local mobile notification
    });
  } catch (err) {
    console.warn("Could not schedule mobile notification:", err);
  }
}

/**
 * Subscribes to real-time job webhook events ('started', 'done', 'failed') pushed from the
 * backend for an organization without any HTTP polling or Google Play Services dependency.
 */
export function subscribeToJobWebhooks(
  orgId: string | null | undefined,
  onWebhookEvent: (event: JobWebhookEvent) => void,
): () => void {
  const baseURL = process.env.EXPO_PUBLIC_BACKEND_URL;
  if (!baseURL || !orgId) {
    return () => {};
  }

  const wsBaseURL = baseURL
    .trim()
    .replace(/\/+$/, "")
    .replace(/^http:\/\//i, "ws://")
    .replace(/^https:\/\//i, "wss://");

  const wsUrl = `${wsBaseURL}${backendApiPath.jobWebhookStream}/${encodeURIComponent(orgId)}`;

  let ws: WebSocket | null = null;
  let isClosedIntentionally = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  const connect = () => {
    if (isClosedIntentionally) return;
    try {
      ws = new WebSocket(wsUrl);

      ws.onmessage = (messageEvent) => {
        try {
          const data = JSON.parse(String(messageEvent.data)) as JobWebhookEvent;
          if (data && data.status && data.task_name) {
            onWebhookEvent(data);
          }
        } catch {
          // Ignore malformed frames
        }
      };

      ws.onclose = () => {
        if (!isClosedIntentionally) {
          reconnectTimer = setTimeout(connect, 3000);
        }
      };

      ws.onerror = () => {
        // Error will be followed by onclose which schedules reconnect
      };
    } catch {
      if (!isClosedIntentionally) {
        reconnectTimer = setTimeout(connect, 3000);
      }
    }
  };

  connect();

  return () => {
    isClosedIntentionally = true;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (ws) {
      try {
        ws.close();
      } catch {
        // Ignore close error
      }
      ws = null;
    }
  };
}
