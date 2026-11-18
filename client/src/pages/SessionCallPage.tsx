import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { io, type Socket } from "socket.io-client";
import { CallControls } from "../components/call/CallControls";
import { CallMediaStage } from "../components/call/CallMediaStage";
import type { CallMode, CallStatus } from "../components/call/types";
import {
  formatSessionSchedule,
} from "../utils/timezone";
import { isSessionCallWindowOpen } from "../utils/session-call";
import "./SessionCallPage.css";

type SessionStatus =
  | "requested"
  | "accepted"
  | "rejected"
  | "cancelled"
  | "completed";
type SessionProfile = {
  userId: { _id: string; fullName: string };
  timezone?: string;
};
type CallSession = {
  _id: string;
  topic: string;
  mode: CallMode;
  status: SessionStatus;
  scheduledAt: string;
  scheduledTimezone?: string;
  durationMinutes: number;
  studentId: SessionProfile;
  mentorId: SessionProfile;
};
type CurrentUser = { id: string; access: string[] };
type SignalMessage = {
  sessionId: string;
  type: "offer" | "answer" | "candidate";
  description?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};
const defaultRtcConfiguration: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function getDeviceErrorMessage(error: unknown) {
  const errorName =
    error instanceof DOMException
      ? error.name
      : error instanceof Error
        ? error.name
        : "";
  const requestedDevices = "camera and microphone";
  if (errorName === "NotAllowedError" || errorName === "PermissionDeniedError") {
    return `Access to your ${requestedDevices} was denied. Allow it for this site in your browser's address-bar or site settings, then try again.`;
  }
  if (errorName === "NotFoundError" || errorName === "DevicesNotFoundError") {
    return "A required camera or microphone was not found. Connect the device and try again.";
  }
  if (errorName === "NotReadableError" || errorName === "TrackStartError") {
    return `Your ${requestedDevices} may be in use by another app. Close the other app and try again.`;
  }
  return getErrorMessage(
    error,
    `Could not access your ${requestedDevices}. Check browser permissions and device settings.`
  );
}

export const SessionCallPage = () => {
  const { sessionId = "" } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const autoJoinRequested = searchParams.get("join") === "1";
  const [session, setSession] = useState<CallSession | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState(0);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [turnConfigured, setTurnConfigured] = useState<boolean | null>(null);
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMicrophoneMuted, setIsMicrophoneMuted] = useState(false);
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);
  const [isTestingDevices, setIsTestingDevices] = useState(false);
  const [deviceTestMessage, setDeviceTestMessage] = useState("");
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const rtcConfigurationRef = useRef<RTCConfiguration>(defaultRtcConfiguration);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const iceRestartAttemptsRef = useRef(0);
  const joinedRef = useRef(false);
  const offerStartedRef = useRef(false);
  const peerPresentRef = useRef(false);
  const serverClockOffsetRef = useRef(0);
  const mediaRequestInProgressRef = useRef(false);
  const autoJoinHandledRef = useRef(false);

  useEffect(() => {
    let active = true;
    autoJoinHandledRef.current = false;
    const loadCall = async () => {
      setIsLoading(true);
      setError("");
      try {
        const requestStartedAt = Date.now();
        const [sessionResponse, userResponse] = await Promise.all([
          fetch(`/api/audio-meet-sessions/${sessionId}`, {
            credentials: "include",
          }),
          fetch("/api/users/me", { credentials: "include" }),
        ]);
        if (!sessionResponse.ok) {
          throw new Error(
            sessionResponse.status === 401 || sessionResponse.status === 403
              ? "Sign in as a session participant to join this call."
              : "Could not load this session."
          );
        }
        if (!userResponse.ok) throw new Error("Could not verify your account.");
        const {
          session: loadedSession,
          serverTime,
        } = (await sessionResponse.json()) as {
          session: CallSession;
          serverTime?: string;
        };
        const sessionResponseReceivedAt = Date.now();
        const { user: loadedUser } = (await userResponse.json()) as {
          user: CurrentUser;
        };
        const serverTimeMs = serverTime ? Date.parse(serverTime) : Number.NaN;
        if (Number.isFinite(serverTimeMs)) {
          serverClockOffsetRef.current =
            serverTimeMs -
            (requestStartedAt + sessionResponseReceivedAt) / 2;
        }
        if (active) {
          setSession({
            ...loadedSession,
            mode: "video",
          });
          setUser(loadedUser);
          setNow(Date.now() + serverClockOffsetRef.current);
        }
      } catch (loadError) {
        if (active) {
          setError(getErrorMessage(loadError, "Could not load this call."));
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void loadCall();
    return () => {
      active = false;
    };
  }, [sessionId]);

  useEffect(() => {
    const timer = window.setInterval(
      () => setNow(Date.now() + serverClockOffsetRef.current),
      5_000
    );
    return () => window.clearInterval(timer);
  }, []);

  const userId = user?.id;
  const socket = useMemo<Socket | null>(
    () => (userId ? io({ withCredentials: true, autoConnect: false }) : null),
    [userId]
  );

  useEffect(() => {
    if (!socket) return;
    const onConnect = () => setIsSocketConnected(true);
    const onDisconnect = () => {
      setIsSocketConnected(false);
      if (joinedRef.current) {
        setCallStatus("connecting");
        setError("Signaling disconnected. Reconnecting to your call…");
      }
    };
    const onConnectError = (connectionError: Error) =>
      setError(connectionError.message || "Could not connect to call signaling.");
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.connect();
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.disconnect();
    };
  }, [socket]);

  const releaseMediaAndPeer = useCallback(() => {
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setIsMicrophoneMuted(false);
    setIsCameraEnabled(true);
    pendingCandidatesRef.current = [];
    iceRestartAttemptsRef.current = 0;
    offerStartedRef.current = false;
    peerPresentRef.current = false;
    setTurnConfigured(null);
  }, []);

  const createPeerConnection = useCallback(() => {
    if (peerConnectionRef.current) return peerConnectionRef.current;
    if (!socket || !session) throw new Error("Call signaling is not ready.");
    const peerConnection = new RTCPeerConnection(rtcConfigurationRef.current);
    const stream = localStreamRef.current;
    stream?.getTracks().forEach((track) => {
      peerConnection.addTrack(track, stream);
    });
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("call:signal", {
          sessionId: session._id,
          type: "candidate",
          candidate: event.candidate.toJSON(),
        });
      }
    };
    peerConnection.ontrack = (event) => {
      if (event.streams[0]) setRemoteStream(event.streams[0]);
    };
    peerConnection.onconnectionstatechange = () => {
      if (peerConnection.connectionState === "connected") {
        iceRestartAttemptsRef.current = 0;
        setCallStatus("connected");
        setError("");
      } else if (
        peerConnection.connectionState === "connecting" ||
        peerConnection.connectionState === "new" ||
        peerConnection.connectionState === "disconnected"
      ) {
        setCallStatus("connecting");
      } else if (peerConnection.connectionState === "failed") {
        const isOfferer = user?.id === session.studentId.userId._id;
        if (
          isOfferer &&
          socket.connected &&
          iceRestartAttemptsRef.current < 1
        ) {
          iceRestartAttemptsRef.current += 1;
          setCallStatus("connecting");
          setError("Network interrupted. Trying to restore the media connection…");
          void (async () => {
            try {
              const offer = await peerConnection.createOffer({
                iceRestart: true,
              });
              await peerConnection.setLocalDescription(offer);
              socket.emit("call:signal", {
                sessionId: session._id,
                type: "offer",
                description: peerConnection.localDescription,
              });
            } catch (restartError) {
              setError(
                getErrorMessage(
                  restartError,
                  "Could not restore the media connection. Leave and rejoin the call."
                )
              );
            }
          })();
        } else {
          setError(
            "The peer connection failed. Check your network, then leave and rejoin the call."
          );
        }
      }
    };
    peerConnectionRef.current = peerConnection;
    return peerConnection;
  }, [socket, session, user]);

  const flushPendingCandidates = useCallback(async (peerConnection: RTCPeerConnection) => {
    const candidates = pendingCandidatesRef.current.splice(0);
    for (const candidate of candidates) {
      await peerConnection.addIceCandidate(candidate);
    }
  }, []);

  const startOffer = useCallback(async () => {
    if (offerStartedRef.current || !socket || !session) return;
    offerStartedRef.current = true;
    try {
      const peerConnection = createPeerConnection();
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      socket.emit("call:signal", {
        sessionId: session._id,
        type: "offer",
        description: peerConnection.localDescription,
      });
    } catch (offerError) {
      offerStartedRef.current = false;
      setError(getErrorMessage(offerError, "Could not start the peer connection."));
    }
  }, [createPeerConnection, session, socket]);

  const joinCallRoom = useCallback(() => {
    if (!socket || !session || !user || !socket.connected) {
      setError("Call signaling is disconnected. Reconnect before joining.");
      return;
    }
    setCallStatus("joining");
    socket.timeout(10_000).emit(
      "call:join",
      { sessionId: session._id },
      (
        timeoutError: Error | null,
        response: { mode?: CallMode; peers?: string[]; error?: string }
      ) => {
        if (timeoutError) {
          setCallStatus("idle");
          setError("The call request timed out. Please try again.");
          releaseMediaAndPeer();
          return;
        }
        if (response.error || response.mode !== session.mode) {
          setCallStatus("idle");
          setError(response.error ?? "This session's call mode does not match.");
          releaseMediaAndPeer();
          return;
        }
        joinedRef.current = true;
        setCallStatus("waiting");
        peerPresentRef.current =
          peerPresentRef.current || Boolean(response.peers?.length);
        const studentUserId = session.studentId.userId._id;
        if (peerPresentRef.current && user.id === studentUserId) {
          void startOffer();
        }
      }
    );
  }, [releaseMediaAndPeer, session, socket, startOffer, user]);

  useEffect(() => {
    if (!socket || !session || !user) return;

    const handleSignal = async (signal: SignalMessage) => {
      if (signal.sessionId !== session._id || !joinedRef.current) return;
      try {
        if (signal.type === "offer" && signal.description) {
          const peerConnection = createPeerConnection();
          await peerConnection.setRemoteDescription(signal.description);
          await flushPendingCandidates(peerConnection);
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          socket.emit("call:signal", {
            sessionId: session._id,
            type: "answer",
            description: peerConnection.localDescription,
          });
        } else if (signal.type === "answer" && signal.description) {
          const peerConnection = peerConnectionRef.current;
          if (!peerConnection) return;
          await peerConnection.setRemoteDescription(signal.description);
          await flushPendingCandidates(peerConnection);
        } else if (signal.type === "candidate" && signal.candidate) {
          const peerConnection = peerConnectionRef.current;
          if (!peerConnection?.remoteDescription) {
            pendingCandidatesRef.current.push(signal.candidate);
          } else {
            await peerConnection.addIceCandidate(signal.candidate);
          }
        }
      } catch (signalError) {
        setError(getErrorMessage(signalError, "Could not negotiate the call."));
      }
    };
    const handlePeerJoined = (event: { sessionId: string }) => {
      if (event.sessionId !== session._id) return;
      peerPresentRef.current = true;
      if (joinedRef.current && user.id === session.studentId.userId._id) {
        void startOffer();
      }
    };
    const handlePeerLeft = (event: { sessionId: string }) => {
      if (event.sessionId !== session._id) return;
      peerConnectionRef.current?.close();
      peerConnectionRef.current = null;
      pendingCandidatesRef.current = [];
      offerStartedRef.current = false;
      iceRestartAttemptsRef.current = 0;
      peerPresentRef.current = false;
      if (localStreamRef.current) {
        setRemoteStream(null);
        setCallStatus("waiting");
      } else {
        setCallStatus("idle");
      }
    };
    const handleCallEnded = (event: { sessionId: string; status: SessionStatus }) => {
      if (event.sessionId !== session._id) return;
      socket.emit("call:leave", { sessionId: session._id });
      joinedRef.current = false;
      releaseMediaAndPeer();
      setSession((current) =>
        current ? { ...current, status: event.status } : current
      );
      setCallStatus("ended");
      setError("This call ended because the session is no longer active.");
    };
    const handleCallError = (event: { sessionId: string; message: string }) => {
      if (event.sessionId !== session._id) return;
      setError(event.message);
      if (event.message === "This call is no longer available.") {
        if (joinedRef.current) {
          socket.emit("call:leave", { sessionId: session._id });
        }
        joinedRef.current = false;
        releaseMediaAndPeer();
        setCallStatus("ended");
      }
    };
    const rejoinAfterReconnect = () => {
      if (!joinedRef.current) return;
      peerConnectionRef.current?.close();
      peerConnectionRef.current = null;
      pendingCandidatesRef.current = [];
      offerStartedRef.current = false;
      iceRestartAttemptsRef.current = 0;
      peerPresentRef.current = false;
      joinCallRoom();
    };

    socket.on("call:signal", handleSignal);
    socket.on("call:peer-joined", handlePeerJoined);
    socket.on("call:peer-left", handlePeerLeft);
    socket.on("call:ended", handleCallEnded);
    socket.on("call:error", handleCallError);
    socket.on("connect", rejoinAfterReconnect);
    return () => {
      socket.off("call:signal", handleSignal);
      socket.off("call:peer-joined", handlePeerJoined);
      socket.off("call:peer-left", handlePeerLeft);
      socket.off("call:ended", handleCallEnded);
      socket.off("call:error", handleCallError);
      socket.off("connect", rejoinAfterReconnect);
    };
  }, [
    createPeerConnection,
    flushPendingCandidates,
    joinCallRoom,
    releaseMediaAndPeer,
    session,
    socket,
    startOffer,
    user,
  ]);

  useEffect(() => {
    if (!session || session.status !== "accepted") return;
    const remaining = new Date(session.scheduledAt).getTime() +
      session.durationMinutes * 60_000 -
      now;
    const timeout = window.setTimeout(() => {
      if (!joinedRef.current) return;
      if (socket) socket.emit("call:leave", { sessionId: session._id });
      joinedRef.current = false;
      releaseMediaAndPeer();
      setCallStatus("ended");
      setError("The scheduled session time has ended.");
    }, Math.max(remaining, 0));
    return () => window.clearTimeout(timeout);
  }, [now, releaseMediaAndPeer, session, socket]);

  useEffect(
    () => () => {
      if (joinedRef.current && socket) {
        socket.emit("call:leave", { sessionId });
      }
      joinedRef.current = false;
      peerConnectionRef.current?.close();
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
    },
    [sessionId, socket]
  );

  const startCall = useCallback(async () => {
    if (
      isTestingDevices ||
      mediaRequestInProgressRef.current ||
      localStreamRef.current
    ) return;
    if (!session) return;
    const synchronizedNow = Date.now() + serverClockOffsetRef.current;
    if (session.status !== "accepted") {
      setError("The mentor must accept this session before you can join.");
      return;
    }
    if (
      !isSessionCallWindowOpen(
        session.scheduledAt,
        session.durationMinutes,
        synchronizedNow
      )
    ) {
      setError("This call is outside its scheduled join window.");
      setNow(synchronizedNow);
      return;
    }
    if (!socket?.connected) {
      setError("Call signaling is not connected yet. Please wait and try again.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera and microphone access requires a secure browser connection.");
      return;
    }
    setError("");
    mediaRequestInProgressRef.current = true;
    setCallStatus("joining");
    let mediaPromise: Promise<MediaStream> | undefined;
    try {
      mediaPromise = navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: true,
      });
      const configurationPromise = fetch(
        `/api/audio-meet-sessions/${session._id}/ice-servers`,
        { credentials: "include" }
      );
      const [stream, configurationResponse] = await Promise.all([
        mediaPromise,
        configurationPromise,
      ]);
      if (!configurationResponse.ok) {
        const result = (await configurationResponse.json()) as {
          message?: string;
        };
        stream.getTracks().forEach((track) => track.stop());
        throw new Error(
          result.message || "Could not load secure call connection settings."
        );
      }
      const configuration = (await configurationResponse.json()) as {
        iceServers: RTCIceServer[];
        turnConfigured: boolean;
      };
      if (!configuration.iceServers.length) {
        stream.getTracks().forEach((track) => track.stop());
        throw new Error("No ICE servers are configured for this call.");
      }
      rtcConfigurationRef.current = {
        iceServers: configuration.iceServers,
        iceTransportPolicy: "all",
        bundlePolicy: "max-bundle",
        rtcpMuxPolicy: "require",
      };
      setTurnConfigured(configuration.turnConfigured);
      localStreamRef.current = stream;
      setLocalStream(stream);
      joinCallRoom();
      mediaRequestInProgressRef.current = false;
    } catch (mediaError) {
      mediaRequestInProgressRef.current = false;
      setTurnConfigured(null);
      releaseMediaAndPeer();
      setCallStatus("idle");
      setError(getDeviceErrorMessage(mediaError));
      void mediaPromise?.then((stream) => {
        stream.getTracks().forEach((track) => track.stop());
      }).catch(() => undefined);
    }
  }, [
    isTestingDevices,
    joinCallRoom,
    releaseMediaAndPeer,
    session,
    socket,
  ]);

  useEffect(() => {
    if (
      !autoJoinRequested ||
      autoJoinHandledRef.current ||
      !session ||
      !user ||
      !isSocketConnected
    ) {
      return;
    }

    autoJoinHandledRef.current = true;
    const synchronizedNow = Date.now() + serverClockOffsetRef.current;
    if (
      session.status === "accepted" &&
      isSessionCallWindowOpen(
        session.scheduledAt,
        session.durationMinutes,
        synchronizedNow
      )
    ) {
      void startCall();
    }
  }, [autoJoinRequested, isSocketConnected, session, startCall, user]);

  const testDeviceAccess = async () => {
    if (
      !session ||
      isTestingDevices ||
      callStatus !== "idle" ||
      mediaRequestInProgressRef.current ||
      localStreamRef.current
    ) return;
    setDeviceTestMessage("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setDeviceTestMessage(
        "Camera and microphone access requires HTTPS or localhost in a supported browser."
      );
      return;
    }

    setIsTestingDevices(true);
    let stream: MediaStream | undefined;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: true,
      });
      const requiredTracks = [
        ...stream.getAudioTracks(),
        ...stream.getVideoTracks(),
      ];
      if (requiredTracks.length === 0 || requiredTracks.some((track) => track.readyState !== "live")) {
        throw new Error("The browser did not provide all required media devices.");
      }
      setDeviceTestMessage(
        "Camera and microphone access work. Test media has been stopped; start the call when it is time."
      );
    } catch (deviceError) {
      setDeviceTestMessage(getDeviceErrorMessage(deviceError));
    } finally {
      stream?.getTracks().forEach((track) => track.stop());
      setIsTestingDevices(false);
    }
  };

  const endCall = () => {
    if (joinedRef.current && socket) {
      socket.emit("call:leave", { sessionId });
    }
    joinedRef.current = false;
    releaseMediaAndPeer();
    setCallStatus("idle");
    setError("");
  };

  const toggleMicrophone = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setIsMicrophoneMuted(!track.enabled);
  };

  const toggleCamera = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setIsCameraEnabled(track.enabled);
  };

  if (isLoading) {
    return <section className="session-call-page"><p>Loading session...</p></section>;
  }
  if (error && !session) {
    return (
      <section className="session-call-page">
        <div className="session-call-card" role="alert">
          <h1>Unable to open call</h1>
          <p>{error}</p>
          <button className="button outline" type="button" onClick={() => navigate(-1)}>
            Go back
          </button>
        </div>
      </section>
    );
  }
  if (!session || !user) return null;

  const scheduledAt = new Date(session.scheduledAt).getTime();
  const callOpensAt = scheduledAt - 5 * 60_000;
  const callEndsAt = scheduledAt + session.durationMinutes * 60_000;
  const isWithinCallWindow = isSessionCallWindowOpen(
    session.scheduledAt,
    session.durationMinutes,
    now
  );
  const counterpart =
    user.id === session.studentId.userId._id
      ? session.mentorId.userId.fullName
      : session.studentId.userId.fullName;
  const schedule = formatSessionSchedule(session.scheduledAt);
  const callOpenSchedule = formatSessionSchedule(
    new Date(callOpensAt)
  );
  const canJoin =
    session.status === "accepted" &&
    isWithinCallWindow &&
    isSocketConnected &&
    !isTestingDevices &&
    callStatus === "idle";

  return (
    <section className="session-call-page">
      <header className="session-call-heading">
        <div>
          <span className="eyebrow">Video mentorship session</span>
          <h1>{session.topic}</h1>
          <p>
            With {counterpart} · {schedule} · {session.durationMinutes} minutes
          </p>
        </div>
        <button
          className="button outline small"
          type="button"
          onClick={() => navigate(`/chat?sessionId=${session._id}`)}
        >
          Open chat
        </button>
      </header>

      <section className="session-call-card">
        <CallMediaStage
          counterpart={counterpart}
          localStream={localStream}
          remoteStream={remoteStream}
        />

        <div className="session-call-status" role="status">
          <span className={isSocketConnected ? "connected" : "disconnected"} />
          {callStatus === "connected"
            ? "Call connected"
            : callStatus === "connecting"
              ? "Connecting media…"
              : callStatus === "joining"
                ? "Joining call…"
                : callStatus === "waiting"
                ? `Waiting for ${counterpart} to join…`
                  : callStatus === "ended"
                    ? "Session ended"
                    : isSocketConnected
                      ? "Signaling connected"
                      : "Connecting to call service…"}
        </div>

        {session.status !== "accepted" && (
          <p className="session-call-notice">
            Calls are available after the mentor accepts this session. Current
            status: {session.status}.
          </p>
        )}
        {session.status === "accepted" && !isWithinCallWindow && (
          <p className="session-call-notice">
            {now < callOpensAt
              ? `Call opens at ${callOpenSchedule}.`
              : `The scheduled call window ended at ${formatSessionSchedule(
                  new Date(callEndsAt)
                )}.`}
          </p>
        )}
        {!isSocketConnected && (
          <p className="session-call-notice">
            Reconnecting to the call service. You can join when the connection is restored.
          </p>
        )}
        {turnConfigured === false && (
          <p className="session-call-notice">
            No TURN relay is configured. Calls may fail on restrictive Wi-Fi,
            mobile carrier networks, or some VPNs. Ask your administrator to
            configure TURN for more reliable connections.
          </p>
        )}
        {error && <p className="session-call-error" role="alert">{error}</p>}

        {session.status === "accepted" && (
          <div className="session-call-device-test">
            <button
              className="button outline small"
              type="button"
              onClick={() => void testDeviceAccess()}
              disabled={
                isTestingDevices ||
                callStatus !== "idle" ||
                Boolean(localStream)
              }
            >
              {isTestingDevices
                ? "Checking devices..."
                : "Test camera & microphone"}
            </button>
            {deviceTestMessage && (
              <p
                className={
                  deviceTestMessage.includes("work.")
                    ? "session-call-device-test-success"
                    : "session-call-error"
                }
                role="status"
              >
                {deviceTestMessage}
              </p>
            )}
          </div>
        )}

        <CallControls
          callStatus={callStatus}
          localStream={localStream}
          canJoin={canJoin}
          isMicrophoneMuted={isMicrophoneMuted}
          isCameraEnabled={isCameraEnabled}
          onJoin={() => void startCall()}
          onLeave={endCall}
          onToggleMicrophone={toggleMicrophone}
          onToggleCamera={toggleCamera}
        />
        <p className="session-call-privacy">
          Your browser will request camera and microphone access when you start
          the call if this site has not already been granted it. Media is
          exchanged peer to peer; the server handles signaling only.
        </p>
      </section>
    </section>
  );
};
