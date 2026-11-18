import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import type { Socket } from "socket.io-client";
import type { ChatContact, ChatMessage } from "./types";

type ChatWindowProps = {
  contact: ChatContact;
  socket: Socket;
  currentUserId: string;
  connectionLabel: string;
  connectionError: string;
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "UTC",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(value));
}

export const ChatWindow = ({
  contact,
  socket,
  currentUserId,
  connectionLabel,
  connectionError,
}: ChatWindowProps) => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messageListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const addMessage = (message: ChatMessage) => {
      if (message.sessionId !== contact.sessionId) return;
      setMessages((current) =>
        current.some((item) => item.id === message.id)
          ? current
          : [...current, message]
      );
    };
    const joinConversation = () => {
      socket.emit(
        "conversation:join",
        { sessionId: contact.sessionId },
        (response: { messages?: ChatMessage[]; error?: string }) => {
          if (response.error) {
            setError(response.error);
            return;
          }
          setError("");
          setMessages((current) => {
            const byId = new Map(current.map((message) => [message.id, message]));
            for (const message of response.messages ?? []) {
              byId.set(message.id, message);
            }
            return [...byId.values()].sort(
              (first, second) =>
                new Date(first.createdAt).getTime() -
                new Date(second.createdAt).getTime()
            );
          });
        }
      );
    };
    socket.on("chat:message", addMessage);
    socket.on("connect", joinConversation);
    if (socket.connected) joinConversation();
    return () => {
      socket.emit("conversation:leave", { sessionId: contact.sessionId });
      socket.off("chat:message", addMessage);
      socket.off("connect", joinConversation);
    };
  }, [contact.sessionId, socket]);

  useEffect(() => {
    const messageList = messageListRef.current;
    if (messageList) messageList.scrollTop = messageList.scrollHeight;
  }, [messages]);

  const sendMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !socket.connected || isSending) return;
    setIsSending(true);
    setError("");
    socket.timeout(10000).emit(
      "chat:send",
      { sessionId: contact.sessionId, text },
      (
        timeoutError: Error | null,
        response: { message?: ChatMessage; error?: string }
      ) => {
        setIsSending(false);
        if (timeoutError) {
          setError("Message could not be confirmed. Please try again.");
          return;
        }
        if (response.error) {
          setError(response.error);
          return;
        }
        setDraft("");
      }
    );
  };

  return (
    <section className="chat-window">
      <header className="chat-window-header">
        <span className={`chat-avatar ${contact.tone}`}>
          {contact.initials}
        </span>
        <div>
          <strong>{contact.name}</strong>
          <small>
            {contact.topic} · Video call · {contact.status} · {connectionLabel}
          </small>
        </div>
        {contact.status === "accepted" && (
          <button
            className="button outline small"
            type="button"
            onClick={() => navigate(`/call/${contact.sessionId}?join=1`)}
          >
            Join video call
          </button>
        )}
      </header>
      {connectionError && (
        <p className="chat-inline-error" role="alert">{connectionError}</p>
      )}
      <div className="chat-messages" ref={messageListRef} aria-live="polite">
        {messages.length === 0 && !error && (
          <p className="chat-empty-thread">
            Messages for this session will appear here. Say hello to begin.
          </p>
        )}
        {messages.map((message) => {
          const isOwnMessage = message.senderId === currentUserId;
          return (
            <div
              className={isOwnMessage ? "chat-message own" : "chat-message"}
              key={message.id}
            >
              {!isOwnMessage && <small className="chat-sender">{message.senderName}</small>}
              <p>{message.text}</p>
              <small>{formatTime(message.createdAt)}</small>
            </div>
          );
        })}
      </div>
      {error && <p className="chat-inline-error" role="alert">{error}</p>}
      <form className="chat-composer" onSubmit={sendMessage}>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={
            socket.connected ? "Write a message..." : "Reconnecting..."
          }
          aria-label="Write a message"
          maxLength={2000}
          disabled={!socket.connected || Boolean(connectionError)}
        />
        <button
          className="chat-send"
          type="submit"
          aria-label="Send message"
          disabled={!socket.connected || isSending || !draft.trim()}
        >
          ↗
        </button>
      </form>
    </section>
  );
};
