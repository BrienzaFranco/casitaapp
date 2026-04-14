"use client";

import { useState, useRef, useEffect, useCallback } from "react";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SpeechRecognition: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    webkitSpeechRecognition: any;
  }
}

type VoiceState = "idle" | "recording" | "done" | "error" | "unsupported";

interface UseVoiceReturn {
  state: VoiceState;
  transcript: string;
  interimTranscript: string;
  start: () => void;
  stop: () => void;
  reset: () => void;
  isSupported: boolean;
}

export function useVoiceRecognition(): UseVoiceReturn {
  const [state, setState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const isSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const start = useCallback(() => {
    if (!isSupported) {
      setState("unsupported");
      return;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = "es-AR";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (e: unknown) => {
      const event = e as { results: { isFinal: boolean; [key: number]: { transcript: string } }[] };
      let finalText = "";
      let interim = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      if (finalText) setTranscript(finalText);
      setInterimTranscript(interim);
    };

    recognition.onend = () => {
      setState("done");
      setInterimTranscript("");
    };

    recognition.onerror = () => {
      setState("error");
      setInterimTranscript("");
    };

    recognitionRef.current = recognition;
    recognition.start();
    setState("recording");
    setTranscript("");
    setInterimTranscript("");
  }, [isSupported]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const reset = useCallback(() => {
    stop();
    setTranscript("");
    setInterimTranscript("");
    setState("idle");
  }, [stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  return { state, transcript, interimTranscript, start, stop, reset, isSupported };
}
