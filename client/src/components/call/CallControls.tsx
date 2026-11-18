import type { CallStatus } from "./types";

type CallControlsProps = {
  callStatus: CallStatus;
  localStream: MediaStream | null;
  canJoin: boolean;
  isMicrophoneMuted: boolean;
  isCameraEnabled: boolean;
  onJoin: () => void;
  onLeave: () => void;
  onToggleMicrophone: () => void;
  onToggleCamera: () => void;
};

export const CallControls = ({
  callStatus,
  localStream,
  canJoin,
  isMicrophoneMuted,
  isCameraEnabled,
  onJoin,
  onLeave,
  onToggleMicrophone,
  onToggleCamera,
}: CallControlsProps) => (
  <div className="session-call-controls">
    {localStream ? (
      <>
        <button className="button outline" type="button" onClick={onToggleMicrophone}>
          {isMicrophoneMuted ? "Unmute microphone" : "Mute microphone"}
        </button>
        <button className="button outline" type="button" onClick={onToggleCamera}>
          {isCameraEnabled ? "Turn camera off" : "Turn camera on"}
        </button>
        <button className="button session-call-end" type="button" onClick={onLeave}>
          Leave call
        </button>
      </>
    ) : (
      <button
        className="button"
        type="button"
        onClick={onJoin}
        disabled={!canJoin}
      >
        {callStatus === "joining"
          ? "Requesting camera and microphone access..."
          : "Start video call"}
      </button>
    )}
  </div>
);
