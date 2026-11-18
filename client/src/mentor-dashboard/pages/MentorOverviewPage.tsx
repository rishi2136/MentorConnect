import { ConnectionOverviewPage } from "../../components/ConnectionOverviewPage";

type MentorOverviewPageProps = {
  userName: string;
  onOpenSessions: () => void;
  onOpenProfile: () => void;
};

export const MentorOverviewPage = ({
  userName,
  onOpenSessions,
  onOpenProfile,
}: MentorOverviewPageProps) => (
  <ConnectionOverviewPage
    userName={userName}
    role="mentor"
    onOpenSessions={onOpenSessions}
    onOpenProfile={onOpenProfile}
  />
);
