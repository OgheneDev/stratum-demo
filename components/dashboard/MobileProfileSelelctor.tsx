import type { WorkspaceProfile } from "@/types";
import { ProfileSelector } from "./ProfileSelector";

interface MobileProfileSelectorProps {
  activeProfile: WorkspaceProfile;
  initializing: boolean;
  onProfileChange: (profile: WorkspaceProfile) => void;
}

export function MobileProfileSelector({
  activeProfile,
  initializing,
  onProfileChange,
}: MobileProfileSelectorProps) {
  return (
    <div className="sm:hidden shrink-0 px-3 py-2 border-b border-white/5 bg-[#0a0f1a]">
      <ProfileSelector
        active={activeProfile}
        onChange={onProfileChange}
        loading={initializing}
      />
    </div>
  );
}
