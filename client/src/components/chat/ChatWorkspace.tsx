import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { io, type Socket } from "socket.io-client";
import { ChatSidebar } from "./ChatSidebar";
import { ChatWindow } from "./ChatWindow";
import type { ChatContact } from "./types";
import API_URL, { apiUrl } from "../../config/api";

type ChatWorkspaceProps = { compact?: boolean };
type UserSummary = {
  id: string;
  access: Array<"admin" | "mentor" | "student">;
};
type ProfileSummary = { userId: { fullName: string } };
type SessionSummary = {
  _id: string;
  studentId: ProfileSummary;
  mentorId: ProfileSummary;
  topic: string;
  status: string;
};

const tones = ["sky", "coral", "lime", "mint", "peach"];
const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();

function toContacts(
  sessions: SessionSummary[],
  user: UserSummary,
): ChatContact[] {
  return sessions.map((session, index) => {
    const studentName = session.studentId.userId.fullName;
    const mentorName = session.mentorId.userId.fullName;
    const isAdmin = user.access.includes("admin");
    const isMentor = user.access.includes("mentor");
    const name = isAdmin
      ? `${studentName} · ${mentorName}`
      : isMentor
        ? studentName
        : mentorName;
    return {
      sessionId: session._id,
      name,
      role: isAdmin ? "Student + mentor" : isMentor ? "Student" : "Mentor",
      initials: getInitials(name),
      tone: tones[index % tones.length]!,
      topic: session.topic,
      status: session.status,
    };
  });
}

export const ChatWorkspace = ({ compact = false }: ChatWorkspaceProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSessionIdRef = useRef(searchParams.get("sessionId"));
  const [user, setUser] = useState<UserSummary | null>(null);
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    requestedSessionIdRef.current = searchParams.get("sessionId");
  }, [searchParams]);

  const refreshContacts = useCallback(async (currentUser: UserSummary) => {
    const response = await fetch(apiUrl("/api/audio-meet-sessions/me"), {
      credentials: "include",
    });
    if (!response.ok) throw new Error("Could not load your sessions.");
    const { sessions } = (await response.json()) as {
      sessions: SessionSummary[];
    };
    const mappedContacts = toContacts(sessions, currentUser);
    setContacts(mappedContacts);
    setSelectedSessionId((currentId) =>
      mappedContacts.some((contact) => contact.sessionId === currentId)
        ? currentId
        : mappedContacts[0]?.sessionId,
    );
  }, []);

  useEffect(() => {
    let isActive = true;
    const loadConversations = async () => {
      setIsLoading(true);
      setError("");
      try {
        const userResponse = await fetch(apiUrl("/api/users/me"), {
          credentials: "include",
        });
        if (!userResponse.ok) {
          throw new Error(
            userResponse.status === 401
              ? "Sign in to view your conversations."
              : "Could not load your account.",
          );
        }
        const { user: currentUser } = (await userResponse.json()) as {
          user: UserSummary;
        };
        if (!isActive) return;
        setUser(currentUser);
        await refreshContacts(currentUser);
      } catch (loadError) {
        if (isActive) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load conversations.",
          );
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    };
    void loadConversations();
    return () => {
      isActive = false;
    };
  }, [refreshContacts]);

  useEffect(() => {
    if (!user) return;
    const connection = io(API_URL || undefined, { withCredentials: true });
    const onConnect = () => {
      setSocket(connection);
      setIsConnected(true);
      setError("");
      void refreshContacts(user).catch((refreshError: unknown) => {
        setError(
          refreshError instanceof Error
            ? refreshError.message
            : "Could not refresh your sessions.",
        );
      });
    };
    const onDisconnect = () => setIsConnected(false);
    const onConnectError = (connectError: Error) => {
      setSocket(connection);
      setIsConnected(false);
      setError(connectError.message || "Could not connect to messaging.");
    };
    const onSessionUpdate = () => {
      void refreshContacts(user).catch((refreshError: unknown) => {
        setError(
          refreshError instanceof Error
            ? refreshError.message
            : "Could not refresh your sessions.",
        );
      });
    };
    const onSessionDeleted = (event: { sessionId: string }) => {
      if (requestedSessionIdRef.current === event.sessionId) {
        setSearchParams({}, { replace: true });
      }
      onSessionUpdate();
    };
    const onChatActivity = (activity: {
      sessionId: string;
      senderName: string;
      text: string;
    }) => {
      if (!user.access.includes("admin")) return;
      const preview = `${activity.senderName}: ${activity.text}`;
      setContacts((current) =>
        current.map((contact) =>
          contact.sessionId === activity.sessionId
            ? { ...contact, lastActivity: preview }
            : contact,
        ),
      );
    };
    connection.on("connect", onConnect);
    connection.on("disconnect", onDisconnect);
    connection.on("connect_error", onConnectError);
    connection.on("session:updated", onSessionUpdate);
    connection.on("session:deleted", onSessionDeleted);
    connection.on("chat:activity", onChatActivity);
    return () => {
      connection.disconnect();
    };
  }, [user, refreshContacts, setSearchParams]);

  const requestedSessionId = searchParams.get("sessionId");
  const requestedContact = contacts.find(
    (contact) => contact.sessionId === requestedSessionId,
  );
  const selectedContact =
    requestedContact ??
    contacts.find((contact) => contact.sessionId === selectedSessionId);

  return (
    <div
      className={compact ? "chat-layout chat-layout-compact" : "chat-layout"}
    >
      <ChatSidebar
        contacts={contacts}
        selectedId={selectedSessionId}
        onSelect={(contact) => {
          setSelectedSessionId(contact.sessionId);
          setSearchParams({ sessionId: contact.sessionId }, { replace: true });
        }}
      />
      {isLoading ? (
        <div className="chat-workspace-placeholder">
          Loading conversations...
        </div>
      ) : selectedContact && socket ? (
        <ChatWindow
          key={selectedContact.sessionId}
          contact={selectedContact}
          socket={socket}
          currentUserId={user?.id ?? ""}
          connectionLabel={isConnected ? "Connected" : "Connecting…"}
          connectionError={error}
        />
      ) : (
        <div
          className="chat-workspace-placeholder"
          role={error ? "alert" : undefined}
        >
          {error || (
            <>
              <strong>No session conversations yet</strong>
              <span>
                Chat threads are created from scheduled mentor sessions. Once a
                session is created, it will appear in this list for the student,
                mentor, and admins.
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
};
