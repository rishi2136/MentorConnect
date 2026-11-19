import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { io } from "socket.io-client";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router";
import "./App.css";
import { Header } from "./components/Header";
import { AuthModal, type AuthenticatedUser } from "./components/AuthModal";
import { HomePage } from "./pages/HomePage";
import { MentorsPage } from "./pages/MentorsPage";
import { MentorProfilePage } from "./pages/MentorProfilePage";
import { type Mentor } from "./data/mentors";
import { MentorDashboard } from "./mentor-dashboard/MentorDashboard";
import { StudentDashboard } from "./student-dashboard/StudentDashboard";
import { StudentOnboardingPage } from "./student-dashboard/pages/StudentOnboardingPage";
import { AdminDashboard } from "./admin-dashboard/AdminDashboard";
import { ChatPage } from "./pages/ChatPage";
import { SessionCallPage } from "./pages/SessionCallPage";
import { MentorSessionStatsProvider } from "./contexts/MentorSessionStatsProvider";
import { useMentorSessionStats } from "./contexts/useMentorSessionStats";
import API_URL, { apiUrl } from "./config/api";

export type Page =
  | "home"
  | "mentors"
  | "profile"
  | "chat"
  | "call"
  | "student-onboarding"
  | "mentor-dashboard"
  | "student-dashboard"
  | "admin-dashboard";
export type AuthMode = "login" | "signup";

const App = () => {
  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [isDark, setIsDark] = useState(
    () => localStorage.getItem("mentorconnect-theme") === "dark",
  );

  useEffect(() => {
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
    localStorage.setItem("mentorconnect-theme", isDark ? "dark" : "light");
  }, [isDark]);

  return (
    <BrowserRouter>
      <MentorSessionStatsProvider>
        <AppRoutes
          selectedMentor={selectedMentor}
          setSelectedMentor={setSelectedMentor}
          isDark={isDark}
          setIsDark={setIsDark}
          authMode={authMode}
          setAuthMode={setAuthMode}
        />
      </MentorSessionStatsProvider>
    </BrowserRouter>
  );
};

type AppRoutesProps = {
  selectedMentor: Mentor | null;
  setSelectedMentor: (mentor: Mentor) => void;
  isDark: boolean;
  setIsDark: Dispatch<SetStateAction<boolean>>;
  authMode: AuthMode | null;
  setAuthMode: (mode: AuthMode | null) => void;
};

type StudentProfileStatus = "checking" | "incomplete" | "complete" | "error";

async function fetchStudentProfileStatus(): Promise<"incomplete" | "complete"> {
  const response = await fetch(apiUrl("/api/students/me"), {
    credentials: "include",
  });
  if (response.status === 404) return "incomplete";
  if (!response.ok) throw new Error("Could not check your student profile.");
  return "complete";
}

const AppRoutes = ({
  selectedMentor,
  setSelectedMentor,
  isDark,
  setIsDark,
  authMode,
  setAuthMode,
}: AppRoutesProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setMentorSessionCounts } = useMentorSessionStats();
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const userId = user?.id;
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [studentProfileStatus, setStudentProfileStatus] =
    useState<StudentProfileStatus>("checking");

  useEffect(() => {
    if (!userId) return;
    const socket = io(API_URL || undefined, { withCredentials: true });
    const updateMentorSessionCount = (event: unknown) => {
      if (
        typeof event === "object" &&
        event !== null &&
        "mentorProfileId" in event &&
        typeof event.mentorProfileId === "string" &&
        "sessionCount" in event &&
        typeof event.sessionCount === "number" &&
        Number.isFinite(event.sessionCount)
      ) {
        setMentorSessionCounts({
          [event.mentorProfileId]: event.sessionCount,
        });
      }
    };
    socket.on("mentor:session-count-updated", updateMentorSessionCount);
    return () => {
      socket.disconnect();
    };
  }, [setMentorSessionCounts, userId]);

  const refreshStudentProfileStatus = async () => {
    setStudentProfileStatus("checking");
    try {
      const status = await fetchStudentProfileStatus();
      setStudentProfileStatus(status);
      setAuthError("");
      return status;
    } catch (error) {
      setStudentProfileStatus("error");
      setAuthError(
        error instanceof Error
          ? error.message
          : "Could not check your student profile.",
      );
      return "error" as const;
    }
  };

  useEffect(() => {
    let isActive = true;
    const loadCurrentUser = async () => {
      try {
        const response = await fetch(apiUrl("/api/users/me"), {
          credentials: "include",
        });
        if (response.status === 401) return;
        if (!response.ok) throw new Error("Could not restore your sign-in.");
        const result = (await response.json()) as { user: AuthenticatedUser };
        if (isActive) setUser(result.user);
        if (result.user.access.includes("student")) {
          try {
            const profileStatus = await fetchStudentProfileStatus();
            if (isActive) setStudentProfileStatus(profileStatus);
          } catch (error) {
            if (isActive) {
              setStudentProfileStatus("error");
              setAuthError(
                error instanceof Error
                  ? error.message
                  : "Could not check your student profile.",
              );
            }
          }
        }
      } catch (error) {
        if (isActive) {
          setAuthError(
            error instanceof Error
              ? error.message
              : "Could not restore your sign-in.",
          );
        }
      } finally {
        if (isActive) setIsAuthLoading(false);
      }
    };
    void loadCurrentUser();
    return () => {
      isActive = false;
    };
  }, []);

  const destinationFor = (authenticatedUser: AuthenticatedUser) =>
    authenticatedUser.access.includes("admin")
      ? "admin-dashboard"
      : authenticatedUser.access.includes("mentor")
        ? "mentor-dashboard"
        : "student-dashboard";

  const handleLogout = async () => {
    const response = await fetch(apiUrl("/api/users/logout"), {
      method: "POST",
      credentials: "include",
    });
    if (!response.ok) {
      const result = (await response.json()) as { message?: string };
      throw new Error(result.message ?? "Could not log out.");
    }
    setUser(null);
    setStudentProfileStatus("checking");
    setAuthError("");
    navigate("/");
  };

  const dashboardFor = (
    requiredRole: "student" | "mentor" | "admin",
    requireStudentProfile = false,
  ) => {
    if (isAuthLoading) {
      return (
        <div className="chat-workspace-placeholder">
          Checking your sign-in...
        </div>
      );
    }
    if (!user) return <Navigate to="/" replace />;
    if (!user.access.includes(requiredRole)) {
      return <Navigate to={`/${destinationFor(user)}`} replace />;
    }
    if (requiredRole === "student" && studentProfileStatus === "checking") {
      return (
        <div className="chat-workspace-placeholder">
          Checking your student profile...
        </div>
      );
    }
    if (requiredRole === "student" && studentProfileStatus === "error") {
      return (
        <div className="chat-workspace-placeholder" role="alert">
          <span>Could not check your student profile.</span>
          <button
            className="button small"
            type="button"
            onClick={() => void refreshStudentProfileStatus()}
          >
            Try again
          </button>
        </div>
      );
    }
    if (
      requireStudentProfile &&
      requiredRole === "student" &&
      studentProfileStatus === "incomplete"
    ) {
      return <Navigate to="/student-onboarding" replace />;
    }
    return null;
  };

  const page: Page =
    location.pathname === "/mentor-dashboard"
      ? "mentor-dashboard"
      : location.pathname === "/student-dashboard"
        ? "student-dashboard"
        : location.pathname === "/admin-dashboard"
          ? "admin-dashboard"
          : location.pathname === "/mentors"
            ? "mentors"
            : location.pathname === "/profile"
              ? "profile"
              : location.pathname === "/chat"
                ? "chat"
                : location.pathname.startsWith("/call/")
                  ? "call"
                  : location.pathname === "/student-onboarding"
                    ? "student-onboarding"
                    : "home";
  const goToPage = (nextPage: Page) =>
    navigate(nextPage === "home" ? "/" : `/${nextPage}`);
  return (
    <div className="app-shell">
      {page !== "mentor-dashboard" &&
        page !== "student-dashboard" &&
        page !== "student-onboarding" &&
        page !== "admin-dashboard" && (
          <Header
            page={page}
            isDark={isDark}
            user={user}
            onNavigate={goToPage}
            onThemeToggle={() => setIsDark((current) => !current)}
            onAuthOpen={setAuthMode}
            onLogout={handleLogout}
          />
        )}
      <main>
        {authError && (
          <p className="auth-error" role="alert">
            {authError}
          </p>
        )}
        <Routes>
          <Route
            path="/"
            element={
              <HomePage
                onExplore={() => navigate("/mentors")}
                onAuthOpen={setAuthMode}
              />
            }
          />
          <Route
            path="/mentors"
            element={
              <MentorsPage
                onAuthOpen={setAuthMode}
                onMentorSelect={(mentor) => {
                  setSelectedMentor(mentor);
                  navigate("/profile");
                }}
              />
            }
          />
          <Route
            path="/profile"
            element={
              <MentorProfilePage
                mentor={selectedMentor}
                onBack={() => navigate("/mentors")}
                onHomeClick={() => navigate("/")}
                onAuthOpen={setAuthMode}
                currentUser={user}
              />
            }
          />
          <Route path="/chat" element={<ChatPage />} />
          <Route
            path="/call/:sessionId"
            element={
              isAuthLoading ? (
                <div className="chat-workspace-placeholder">
                  Checking your sign-in...
                </div>
              ) : user ? (
                <SessionCallPage />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/mentor-dashboard"
            element={
              dashboardFor("mentor") ?? (
                <MentorDashboard
                  isDark={isDark}
                  onThemeToggle={() => setIsDark((current) => !current)}
                  onHomeClick={() => navigate("/")}
                  userName={user?.fullName ?? ""}
                  onLogout={handleLogout}
                />
              )
            }
          />
          <Route
            path="/student-dashboard"
            element={
              dashboardFor("student", true) ?? (
                <StudentDashboard
                  isDark={isDark}
                  onThemeToggle={() => setIsDark((current) => !current)}
                  onHomeClick={() => navigate("/")}
                  userName={user?.fullName ?? ""}
                  onLogout={handleLogout}
                />
              )
            }
          />
          <Route
            path="/student-onboarding"
            element={
              dashboardFor("student") ??
              (studentProfileStatus === "incomplete" ? (
                <StudentOnboardingPage
                  onComplete={() => {
                    setStudentProfileStatus("complete");
                    setAuthError("");
                    navigate("/student-dashboard", { replace: true });
                  }}
                />
              ) : (
                <Navigate to="/student-dashboard" replace />
              ))
            }
          />
          <Route
            path="/admin-dashboard"
            element={
              dashboardFor("admin") ?? (
                <AdminDashboard
                  isDark={isDark}
                  onThemeToggle={() => setIsDark((current) => !current)}
                  onHomeClick={() => navigate("/")}
                  userName={user?.fullName ?? ""}
                  onLogout={handleLogout}
                />
              )
            }
          />
        </Routes>
      </main>
      {authMode && (
        <AuthModal
          mode={authMode}
          onClose={() => setAuthMode(null)}
          onModeChange={setAuthMode}
          onAuthenticated={async (authenticatedUser: AuthenticatedUser) => {
            setUser(authenticatedUser);
            setAuthError("");
            setAuthMode(null);
            if (authenticatedUser.access.includes("student")) {
              setStudentProfileStatus("checking");
              await refreshStudentProfileStatus();
              navigate("/student-dashboard");
            } else {
              navigate(`/${destinationFor(authenticatedUser)}`);
            }
          }}
        />
      )}
    </div>
  );
};

export default App;
