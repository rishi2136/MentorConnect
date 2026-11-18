import { useState } from "react";
import type { ChatContact } from "./types";
export type { ChatContact } from "./types";

type ChatSidebarProps = {
  contacts: ChatContact[];
  selectedId: string | undefined;
  onSelect: (contact: ChatContact) => void;
};

export const ChatSidebar = ({
  contacts,
  selectedId,
  onSelect,
}: ChatSidebarProps) => {
  const [query, setQuery] = useState("");
  const filteredContacts = contacts.filter((contact) =>
    `${contact.name} ${contact.role} ${contact.topic}`
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  return (
    <aside className="chat-sidebar">
      <div className="chat-sidebar-heading">
        <h2>
          Messages <span>{contacts.length}</span>
        </h2>
      </div>
      <label className="chat-search">
        <span aria-hidden="true">⌕</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search conversations"
          aria-label="Search conversations"
        />
      </label>
      <div className="chat-contact-list">
        {filteredContacts.map((contact) => (
          <button
            className={
              contact.sessionId === selectedId
                ? "chat-contact active"
                : "chat-contact"
            }
            type="button"
            key={contact.sessionId}
            onClick={() => onSelect(contact)}
          >
            <span className={`chat-avatar ${contact.tone}`}>
              {contact.initials}
            </span>
            <span className="chat-contact-copy">
              <strong>{contact.name}</strong>
              <small>
                {contact.lastActivity ?? `${contact.role} · ${contact.topic}`}
              </small>
            </span>
            <span className="chat-contact-meta">
              <small>{contact.status}</small>
            </span>
          </button>
        ))}
        {filteredContacts.length === 0 && (
          <p className="chat-empty-list">
            {contacts.length
              ? "No conversations match your search."
              : "No session conversations yet."}
          </p>
        )}
      </div>
    </aside>
  );
};
