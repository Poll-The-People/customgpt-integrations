'use client';

import {useEffect, useRef} from "react";
import {useMicVAD} from "@ricky0123/vad-react";
import {onMisfire, onSpeechEnd, onSpeechStart} from "@/lib/speech-manager";
import { AI_CONFIG } from '@/config/constants';

export const useMicVADWrapper = (onLoadingChange: (loading: boolean) => void) => {
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
        positiveSpeechThreshold: AI_CONFIG.vadPositiveSpeechThreshold,
        negativeSpeechThreshold: AI_CONFIG.vadNegativeSpeechThreshold,
        // Configure ONNX runtime to load WASM files from public directory
        ortConfig: (ort) => {
            // Set WASM paths to public directory root
            ort.env.wasm.wasmPaths = '/';
            console.log("[VAD] ONNX Runtime configured to load from:", ort.env.wasm.wasmPaths);
        }
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
