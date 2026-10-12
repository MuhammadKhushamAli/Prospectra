import Button from "../ui/Button";

interface SocialAuthButtonProps {
  onPress?: () => void;
}

export default function SocialAuthButton({ onPress }: SocialAuthButtonProps) {
  return (
    <Button label="Continue with Google" variant="ghost" onPress={onPress} />
  );
}
