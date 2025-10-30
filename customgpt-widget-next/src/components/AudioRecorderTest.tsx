'use client';

import { useState, useRef } from 'react';

export default function AudioRecorderTest() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string>('');
  const [mimeType, setMimeType] = useState<string>('');
  const [error, setError] = useState<string>('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const getSupportedMimeType = (): string => {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/mpeg',
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return '';
  };

  const startRecording = async () => {
    try {
      setError('');
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const supportedMimeType = getSupportedMimeType();

      if (!supportedMimeType) {
        setError('No supported audio format found');
        return;
      }

      setMimeType(supportedMimeType);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: supportedMimeType,
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: supportedMimeType });
        const url = URL.createObjectURL(blob);
        setAudioURL(url);

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      setError(`Error starting recording: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">WebM Audio Recording Test</h1>

      <div className="space-y-4">
        <div className="flex gap-4">
          <button
            onClick={startRecording}
            disabled={isRecording}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
          >
            Start Recording
          </button>

          <button
            onClick={stopRecording}
            disabled={!isRecording}
            className="px-4 py-2 bg-red-500 text-white rounded disabled:bg-gray-300"
          >
            Stop Recording
          </button>
        </div>

        {isRecording && (
          <div className="text-green-600 font-semibold">
            🔴 Recording...
          </div>
        )}

        {mimeType && (
          <div className="p-4 bg-blue-50 rounded">
            <strong>Detected MIME Type:</strong> {mimeType}
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded">
            <strong>Error:</strong> {error}
          </div>
        )}

        {audioURL && (
          <div className="space-y-2">
            <div className="p-4 bg-green-50 rounded">
              <strong>✓ Recording Complete!</strong>
            </div>
            <audio controls src={audioURL} className="w-full" />
            <div className="text-sm text-gray-600">
              Format: {mimeType}
            </div>
          </div>
        )}

        <div className="mt-8 p-4 bg-gray-50 rounded">
          <h2 className="font-semibold mb-2">Browser Compatibility:</h2>
          <ul className="space-y-1 text-sm">
            <li>
              ✓ WebM (Opus): {MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? '✅ Supported' : '❌ Not supported'}
            </li>
            <li>
              ✓ WebM: {MediaRecorder.isTypeSupported('audio/webm') ? '✅ Supported' : '❌ Not supported'}
            </li>
            <li>
              ✓ MP4: {MediaRecorder.isTypeSupported('audio/mp4') ? '✅ Supported' : '❌ Not supported'}
            </li>
            <li>
              ✓ MPEG: {MediaRecorder.isTypeSupported('audio/mpeg') ? '✅ Supported' : '❌ Not supported'}
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
