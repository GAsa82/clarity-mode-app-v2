export const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    // Open Relay free TURN — handles symmetric NAT
    { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
    { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
    { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" },
  ],
};

export type ConnectionState = "new" | "connecting" | "connected" | "disconnected" | "failed" | "closed";
export type NetworkQuality = "excellent" | "good" | "fair" | "poor" | "unknown";

export type SignalMessage =
  | { type: "offer";       from: string; sdp: RTCSessionDescriptionInit }
  | { type: "answer";      from: string; sdp: RTCSessionDescriptionInit }
  | { type: "ice";         from: string; candidate: RTCIceCandidateInit }
  | { type: "media_state"; from: string; video: boolean; audio: boolean }
  | { type: "screen_share";from: string; sharing: boolean }
  | { type: "timer_sync";  from: string; state: object }
  | { type: "heartbeat";   from: string };

export class WebRTCService {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private iceCandidateBuffer: RTCIceCandidateInit[] = [];
  private statsInterval: ReturnType<typeof setInterval> | null = null;
  private lastRtt = 0;

  onRemoteStream: ((stream: MediaStream) => void) | null = null;
  onConnectionStateChange: ((state: ConnectionState) => void) | null = null;
  onIceCandidate: ((candidate: RTCIceCandidateInit) => void) | null = null;
  onRemoteMediaState: ((video: boolean, audio: boolean) => void) | null = null;

  // ─── Media acquisition ────────────────────────────────────────────────────

  async acquireMedia(video: boolean, audio: boolean): Promise<MediaStream> {
    const attempts: MediaStreamConstraints[] = video
      ? [
          { video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { max: 30 } }, audio },
          { video: { width: { ideal: 640 }, height: { ideal: 480 } }, audio },
          { video: true, audio },
        ]
      : [{ video: false, audio: true }];

    let lastErr: unknown;
    for (const constraints of attempts) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        this.localStream = stream;
        return stream;
      } catch (e: any) {
        lastErr = e;
        if (e?.name === "NotAllowedError" || e?.name === "PermissionDeniedError") throw e;
      }
    }
    throw lastErr;
  }

  async acquireScreenShare(): Promise<MediaStream> {
    const stream = await (navigator.mediaDevices as any).getDisplayMedia({
      video: { cursor: "always", width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: true,
    });
    this.screenStream = stream;
    return stream;
  }

  getLocalStream() { return this.localStream; }

  // ─── Peer connection lifecycle ────────────────────────────────────────────

  private buildPC(): RTCPeerConnection {
    const pc = new RTCPeerConnection(ICE_CONFIG);
    this.pc = pc;

    // Add local tracks
    this.localStream?.getTracks().forEach(t => pc.addTrack(t, this.localStream!));

    // Remote track
    pc.ontrack = ({ streams }) => {
      if (streams[0]) this.onRemoteStream?.(streams[0]);
    };

    // ICE
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) this.onIceCandidate?.(candidate.toJSON());
    };

    // Connection state
    pc.onconnectionstatechange = () => {
      this.onConnectionStateChange?.(pc.connectionState as ConnectionState);
      if (pc.connectionState === "failed") this.attemptIceRestart();
    };

    this.startStatsMonitor();
    return pc;
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    const pc = this.buildPC();
    const offer = await pc.createOffer({ offerToReceiveVideo: true, offerToReceiveAudio: true });
    await pc.setLocalDescription(offer);
    return offer;
  }

  async handleOffer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    const pc = this.buildPC();
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    await this.flushIceBuffer();
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    return answer;
  }

  async handleAnswer(answer: RTCSessionDescriptionInit) {
    if (!this.pc || this.pc.signalingState === "stable") return;
    await this.pc.setRemoteDescription(new RTCSessionDescription(answer)).catch(() => {});
  }

  async addIceCandidate(candidate: RTCIceCandidateInit) {
    if (this.pc?.remoteDescription) {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
    } else {
      this.iceCandidateBuffer.push(candidate);
    }
  }

  private async flushIceBuffer() {
    if (!this.pc) return;
    for (const c of this.iceCandidateBuffer) {
      await this.pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
    }
    this.iceCandidateBuffer = [];
  }

  private async attemptIceRestart() {
    if (!this.pc) return;
    try {
      const offer = await this.pc.createOffer({ iceRestart: true });
      await this.pc.setLocalDescription(offer);
    } catch {}
  }

  // ─── Media controls ───────────────────────────────────────────────────────

  setVideoEnabled(enabled: boolean) {
    this.localStream?.getVideoTracks().forEach(t => { t.enabled = enabled; });
  }

  setAudioEnabled(enabled: boolean) {
    this.localStream?.getAudioTracks().forEach(t => { t.enabled = enabled; });
  }

  async switchCamera() {
    const track = this.localStream?.getVideoTracks()[0];
    if (!track) return;
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter(d => d.kind === "videoinput");
    if (cameras.length < 2) return;
    const currentId = track.getSettings().deviceId;
    const next = cameras.find(c => c.deviceId !== currentId) ?? cameras[0];
    const newStream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: next.deviceId } } });
    const newTrack = newStream.getVideoTracks()[0];
    const sender = this.pc?.getSenders().find(s => s.track?.kind === "video");
    if (sender) await sender.replaceTrack(newTrack);
    track.stop();
    this.localStream?.removeTrack(track);
    this.localStream?.addTrack(newTrack);
  }

  async startScreenShare(screenStream: MediaStream) {
    const screenTrack = screenStream.getVideoTracks()[0];
    const sender = this.pc?.getSenders().find(s => s.track?.kind === "video");
    if (sender) await sender.replaceTrack(screenTrack);
    screenTrack.onended = () => this.stopScreenShare();
  }

  async stopScreenShare() {
    this.screenStream?.getTracks().forEach(t => t.stop());
    this.screenStream = null;
    const camTrack = this.localStream?.getVideoTracks()[0];
    if (!camTrack) return;
    const sender = this.pc?.getSenders().find(s => s.track?.kind === "video");
    if (sender) await sender.replaceTrack(camTrack);
  }

  // ─── Quality monitoring ───────────────────────────────────────────────────

  private startStatsMonitor() {
    if (this.statsInterval) clearInterval(this.statsInterval);
    this.statsInterval = setInterval(async () => {
      if (!this.pc) return;
      try {
        const stats = await this.pc.getStats();
        stats.forEach((report) => {
          if (report.type === "candidate-pair" && report.state === "succeeded") {
            this.lastRtt = report.currentRoundTripTime ?? 0;
          }
        });
      } catch {}
    }, 3000);
  }

  getNetworkQuality(): NetworkQuality {
    if (!this.pc) return "unknown";
    const state = this.pc.connectionState;
    if (state !== "connected") {
      if (state === "connecting" || state === "new") return "fair";
      return "poor";
    }
    if (this.lastRtt === 0) return "good";
    if (this.lastRtt < 0.05) return "excellent";
    if (this.lastRtt < 0.15) return "good";
    if (this.lastRtt < 0.3)  return "fair";
    return "poor";
  }

  // ─── Cleanup ──────────────────────────────────────────────────────────────

  destroy() {
    if (this.statsInterval) clearInterval(this.statsInterval);
    this.localStream?.getTracks().forEach(t => t.stop());
    this.screenStream?.getTracks().forEach(t => t.stop());
    this.pc?.close();
    this.pc = null;
    this.localStream = null;
    this.screenStream = null;
    this.iceCandidateBuffer = [];
  }
}
