import { Mail } from "lucide-react-native";

import { emailVerificationCopy } from "../../constants/constants";
import DomainVerificationHeader from "../domain/DomainVerificationHeader";

export default function EmailVerificationHeader() {
  return (
    <DomainVerificationHeader
      badgeLabel={emailVerificationCopy.badge}
      title={emailVerificationCopy.title}
      subtitle={emailVerificationCopy.subtitle}
      icon={Mail}
    />
  );
}

