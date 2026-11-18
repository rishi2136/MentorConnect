import { useEffect, useRef, useState } from "react";

type CallMediaStageProps = {
  counterpart: string;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
};

export const CallMediaStage = ({
  counterpart,
  localStream,
  remoteStream,
}: CallMediaStageProps) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const [audioPlaybackBlocked, setAudioPlaybackBlocked] = useState(false);

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
    const audio = remoteAudioRef.current;
    if (!audio) return;
    audio.srcObject = remoteStream;
    if (!remoteStream) return;
    void audio
      .play()
      .then(() => setAudioPlaybackBlocked(false))
      .catch(() => setAudioPlaybackBlocked(true));
  }, [remoteStream]);

  const enableRemoteAudio = () => {
    const audio = remoteAudioRef.current;
    if (!audio) return;
    void audio
      .play()
      .then(() => setAudioPlaybackBlocked(false))
      .catch(() => setAudioPlaybackBlocked(true));
  };

  return (
    <div className="session-call-video-grid">
      <div className="session-call-video remote">
        <video ref={remoteVideoRef} autoPlay muted playsInline />
        {!remoteStream && <span>Waiting for the other participant…</span>}
        <small>{counterpart}</small>
      </div>
      <audio ref={remoteAudioRef} autoPlay />
      {audioPlaybackBlocked && remoteStream && (
        <button
          className="button outline"
          type="button"
          onClick={enableRemoteAudio}
        >
          Enable speaker audio
        </button>
      )}
      {localStream && (
        <div className="session-call-video local">
          <video ref={localVideoRef} autoPlay muted playsInline />
          <small>You</small>
        </div>
      )}
    </div>
  );
};
