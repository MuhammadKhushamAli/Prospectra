import { StyleSheet } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated from "react-native-reanimated";

import { CardFront } from "./CardFront";
import { CardBack } from "./CardBack";
import type { UserIdCardProfile } from "../../types/profile";

interface UserIdCardProps {
  profile: UserIdCardProfile | null;
  displayName: string;
  userInitial: string;
  complete: boolean;
  panGesture: any;
  cardDragAnimatedStyle: any;
  frontFaceAnimatedStyle: any;
  backFaceAnimatedStyle: any;
  onNavigate: () => void;
  colors: any;
}

export function UserIdCard({
  profile,
  displayName,
  userInitial,
  complete,
  panGesture,
  cardDragAnimatedStyle,
  frontFaceAnimatedStyle,
  backFaceAnimatedStyle,
  onNavigate,
  colors,
}: UserIdCardProps) {
  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        accessible
        accessibilityRole="button"
        accessibilityLabel={
          complete
            ? `Prospectra ID card for ${profile?.name}, ${profile?.role} at ${profile?.organizationName}. Swipe to open prospecting.`
            : "Profile not set up. Swipe to complete your profile."
        }
        accessibilityActions={[
          {
            name: "activate",
            label: complete ? "Open prospecting" : "Complete profile",
          },
        ]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === "activate") {
            onNavigate();
          }
        }}
        style={[styles.cardWrapper, cardDragAnimatedStyle]}
      >
        <CardFront
          profile={profile}
          displayName={displayName}
          userInitial={userInitial}
          colors={colors}
          animatedStyle={frontFaceAnimatedStyle}
          pointerEvents={complete ? "auto" : "none"}
        />

        <CardBack
          colors={colors}
          animatedStyle={backFaceAnimatedStyle}
          pointerEvents={!complete ? "auto" : "none"}
        />
      </Animated.View>
    </GestureDetector>
  );
}

const CARD_MIN_HEIGHT = 400;

const styles = StyleSheet.create({
  cardWrapper: {
    width: "100%",
    minHeight: CARD_MIN_HEIGHT,
    position: "relative",
  },
});
