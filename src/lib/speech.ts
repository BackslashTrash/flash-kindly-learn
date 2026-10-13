import { useEffect, useRef, useState } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
export function useSpeech(lang: string, onFinal: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const rec = useRef<any>(null);
  const cb = useRef(onFinal);
  cb.current = onFinal;

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSupported(!!SR);
    if (!SR) return;
    const r = new SR();
    r.lang = lang;
    r.interimResults = true;
    r.continuous = true;
    r.onresult = (e: any) => {
      let tmp = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) cb.current(res[0].transcript.trim());
        else tmp += res[0].transcript;
      }
      setInterim(tmp);
    };
    r.onend = () => {
      setListening(false);
      setInterim("");
    };
    r.onerror = () => setListening(false);
    rec.current = r;
    return () => r.abort();
  }, [lang]);

  const toggle = () => {
    if (!rec.current) return;
    if (listening) rec.current.stop();
    else {
      try {
        rec.current.start();
        setListening(true);
      } catch {}
    }
  };
  const stop = () => listening && rec.current?.stop();
  return { supported, listening, interim, toggle, stop };
}
