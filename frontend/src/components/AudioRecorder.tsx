import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface AudioRecorderProps {
  onTranscript: (text: string) => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onTranscript }) => {
  const { language, t } = useLanguage();
  const [isRecording, setIsRecording] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
    }
  }, []);

  const toggleRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in this browser. Please type your description.");
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      // Language code: Kannada kn-IN or English en-IN
      recognition.lang = language === 'kn' ? 'kn-IN' : 'en-IN';

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        if (text) {
          onTranscript(text);
        }
        setIsRecording(false);
      };

      recognition.onerror = () => {
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
    } catch (e) {
      setIsRecording(false);
    }
  };

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={toggleRecording}
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${
        isRecording
          ? 'bg-rose-600 text-white animate-pulse ring-4 ring-rose-200'
          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
      }`}
      title="Voice Input"
    >
      {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-emerald-600" />}
      <span>{isRecording ? t.listening : t.voiceInput}</span>
    </button>
  );
};
