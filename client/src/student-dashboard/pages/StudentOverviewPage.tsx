import { ConnectionOverviewPage } from "../../components/ConnectionOverviewPage";

type StudentOverviewPageProps = {
  userName: string;
  onOpenSessions: () => void;
  onOpenProfile: () => void;
};

export const StudentOverviewPage = ({
  userName,
  onOpenSessions,
  onOpenProfile,
}: StudentOverviewPageProps) => (
  <ConnectionOverviewPage
    userName={userName}
    role="student"
    onOpenSessions={onOpenSessions}
    onOpenProfile={onOpenProfile}
  />
);
