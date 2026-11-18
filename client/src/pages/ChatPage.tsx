import { ChatWorkspace } from "../components/chat/ChatWorkspace";
import "./ChatPage.css";

export const ChatPage = () => {
  return (
    <section className="chat-page">
      <div className="chat-page-heading">
        <div>
          <span className="eyebrow">Shared workspace</span>
          <h1>
            Messages <em>that move work forward.</em>
          </h1>
        </div>
      </div>
      <ChatWorkspace />
    </section>
  );
};
