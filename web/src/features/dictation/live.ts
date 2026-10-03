import { api } from "../../lib/api";

// Dictado en vivo con gpt-live-transcribe (spike HACK-004, spikes/openai/RESULT.md).
// El backend (HACK-008) crea un token efímero en POST /api/transcribe/session; el navegador abre la
// sesión WebRTC con ese token y nunca ve la API key. Con `usable: false` no hay dictado en vivo y la
// UI ofrece el caso de ejemplo.
// NO VERIFICADO de punta a punta: requiere OPENAI_API_KEY en el backend y micrófono.

type TranscribeSession = { client_secret: string; usable: boolean; model: string };

export type LiveHandlers = {
  onDelta: (text: string) => void; // fragmento provisional del segmento en curso
  onSegment: (text: string) => void; // segmento final tras cada commit
  onError: (message: string) => void;
};

export type LiveSession = { stream: MediaStream; stop: () => Promise<void> };

const REALTIME_CALLS_URL = "https://api.openai.com/v1/realtime/calls";
// Sin detección de turnos (turn_detection: null): confirmamos el audio cada pocos segundos para
// que el texto final llegue mientras el médico habla, no sólo al terminar.
const COMMIT_EVERY_MS = 4000;

export class LiveUnavailableError extends Error {}

export async function startLive(handlers: LiveHandlers): Promise<LiveSession> {
  const session = await api<TranscribeSession>("/transcribe/session", { method: "POST" });
  if (!session.usable) throw new LiveUnavailableError(session.model);

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
  });
  const peer = new RTCPeerConnection();
  stream.getAudioTracks().forEach((track) => peer.addTrack(track, stream));
  const channel = peer.createDataChannel("oai-events");

  channel.addEventListener("message", (message) => {
    const event = JSON.parse(String(message.data)) as { type: string; delta?: string; transcript?: string; error?: { message?: string } };
    if (event.type === "conversation.item.input_audio_transcription.delta" && event.delta) handlers.onDelta(event.delta);
    else if (event.type === "conversation.item.input_audio_transcription.completed") handlers.onSegment(event.transcript ?? "");
    else if (event.type === "error") handlers.onError(event.error?.message ?? "Transcription error");
  });

  const offer = await peer.createOffer();
  await peer.setLocalDescription(offer);
  const answer = await fetch(REALTIME_CALLS_URL, {
    method: "POST",
    body: offer.sdp,
    headers: { Authorization: `Bearer ${session.client_secret}`, "Content-Type": "application/sdp" },
  });
  if (!answer.ok) {
    stream.getTracks().forEach((track) => track.stop());
    peer.close();
    throw new Error(`Realtime session ${answer.status}`);
  }
  await peer.setRemoteDescription({ type: "answer", sdp: await answer.text() });

  const commit = () => {
    if (channel.readyState === "open") channel.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
  };
  const timer = window.setInterval(commit, COMMIT_EVERY_MS);

  return {
    stream,
    stop: async () => {
      window.clearInterval(timer);
      stream.getTracks().forEach((track) => track.stop());
      commit();
      // Deja llegar el último segmento antes de cerrar.
      await new Promise((resolve) => window.setTimeout(resolve, 1500));
      channel.close();
      peer.close();
    },
  };
}
