import {useEffect, useRef} from "react";
import {useMicVAD} from "@ricky0123/vad-react";
import {onMisfire, onSpeechEnd, onSpeechStart} from "../speech-manager-optimized.ts";

export const useMicVADWrapper = (onLoadingChange) => {
    console.log("[VAD] Initializing useMicVADWrapper");

    const micVAD = useMicVAD({
        startOnLoad: true,
        onSpeechStart: () => {
            console.log("[VAD] ✅ Speech started detected!");
            onSpeechStart();
        },
        onSpeechEnd: (audio) => {
            console.log("[VAD] ✅ Speech ended detected, audio length:", audio?.length);
            onSpeechEnd(audio);
        },
        onVADMisfire: () => {
            console.log("[VAD] ⚠️ VAD misfire detected");
            onMisfire();
        },
        positiveSpeechThreshold: 0.90,
        negativeSpeechThreshold: 0.75
    });

    console.log("[VAD] micVAD state:", {
        loading: micVAD.loading,
        listening: micVAD.listening,
        userSpeaking: micVAD.userSpeaking
    });

    const loadingRef = useRef(micVAD.loading);
    useEffect(() => {
        if (loadingRef.current !== micVAD.loading) {
            console.log("[VAD] Loading state changed:", loadingRef.current, "→", micVAD.loading);
            onLoadingChange(micVAD.loading);
            loadingRef.current = micVAD.loading;
        }
    });

    return micVAD;
}
