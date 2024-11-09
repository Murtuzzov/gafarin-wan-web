"use client";

import React, { useRef, useState, useEffect } from "react";
import axios from "axios";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions'
import { Mic, Play, Pause, Scissors, Upload } from "lucide-react";
import { sliceAudioBlob } from "./audio";

type WaveSurferExt = WaveSurfer & { regions: RegionsPlugin };

const AudioRecorder: React.FC = () => {
  const waveformRef = useRef<HTMLDivElement>(null);
  const [word, setWord] = useState<string>("Чубарук");
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [region, setRegion] = useState<any | null>(null)
  const [wavesurfer, setWavesurfer] = useState<WaveSurferExt | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [hasRecorded, setHasRecorded] = useState<boolean>(false);
  const [trimStart, setTrimStart] = useState<number>(0);
  const [trimEnd, setTrimEnd] = useState<number>(0);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isReplaceButtonEnabled, setIsReplaceButtonEnabled] =
    useState<boolean>(true);

  useEffect(() => {
    const fetchWord = async () => {
      const response = await axios.get("your-api-url", {
        params: { id: "someId", spelling: "someSpelling" },
      });
      setWord(response.data.word || "Чубарук");
    };

    fetchWord();

    return () => {
      if (wavesurfer) wavesurfer.destroy();
    };
  }, [wavesurfer]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const newChunks: BlobPart[] = [];

      recorder.ondataavailable = (event) => newChunks.push(event.data);
      recorder.onstop = () => {
        const blob = new Blob(newChunks, { type: "audio/wav" });
        setAudioBlob(blob);
        createWaveform(blob);
        setHasRecorded(true);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      console.error("Ошибка при начале записи:", error);
    }
  };

  const stopRecording = () => {
    mediaRecorder?.stop();
    setIsRecording(false);
  };

  const createWaveform = (blob: Blob) => {
    if (waveformRef.current) {
      const newWavesurfer = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: "violet",
        progressColor: "purple",
        cursorColor: "navy",
      }) as WaveSurferExt;
      // Initialize the Regions plugin
      const regionsPlugin = newWavesurfer.registerPlugin(RegionsPlugin.create())
      newWavesurfer.regions = regionsPlugin
      
      newWavesurfer.loadBlob(blob);
      setWavesurfer(newWavesurfer);

      newWavesurfer.on("ready", () => {
        setTrimEnd(newWavesurfer.getDuration());
      });
    }
  };

  const togglePlayPause = () => {
    if (!wavesurfer) {
      return;
    }
    if (isPlaying) { 
      wavesurfer.pause()
    } else {
      wavesurfer.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleReplaceWord = async () => {
    if (!isReplaceButtonEnabled) return;

    setIsReplaceButtonEnabled(false);
    console.log("Слово заменено");
    const response = await axios.get("your-api-url", {
      params: { id: "someId", spelling: "someSpelling" },
    });
    setWord(response.data.word || "Чубарук");

    setTimeout(() => {
      setIsReplaceButtonEnabled(true);
    }, 2000);
  };

  const createTrimRegion = () => {
    if (wavesurfer && wavesurfer.regions) {
      const newRegion = wavesurfer.regions.addRegion({
        start: trimStart,
        end: wavesurfer.getDuration(),
        color: "rgba(0, 255, 0, 0.3)",
      });
      setRegion(newRegion)
    }
  };

  const trimAudio = () => {
    if (wavesurfer &&  region && audioBlob) {
      sliceAudioBlob(audioBlob, region.start, region.end)
        .then((slicedWavBlob) => {
            setAudioBlob(slicedWavBlob);
            createWaveform(slicedWavBlob);
            // Use the sliced WAV Blob as needed
            const audioURL = URL.createObjectURL(slicedWavBlob);

            // Play the sliced audio
            const audioElement = new Audio(audioURL);
            audioElement.play();
        })
        .catch((error) => {
            console.error('Error slicing audio Blob:', error);
        });
    }
  };

  const handleUploadClick = () => {
    setIsModalOpen(true);
  };

  const handleConfirmUpload = async () => {
    if (audioBlob) {
      const formData = new FormData();
      formData.append("audio", audioBlob, "audio.wav");
      formData.append("id", "someId");
      formData.append("spelling", word);

      try {
        console.log("Аудио успешно загружено на сервер");
        await axios.post("your-upload-api-url", formData);
      } catch (error) {
        console.error("Ошибка загрузки:", error);
      }
    }
    setIsModalOpen(false);
  };

  const handleCancelUpload = () => {
    setIsModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white shadow-md rounded-lg">
        <div className="p-4 border-b">
          {!hasRecorded && (
            <h2 className="text-2xl font-bold text-center">Озвучь слово:</h2>
          )}
        </div>
        <div className="p-4 space-y-4">
          <div className="flex justify-center items-center">
            <div className="text-xl font-semibold" aria-live="polite">
              {word}
            </div>
            <button
              onClick={handleReplaceWord}
              className={`bg-blue-500 hover:bg-blue-600 text-white px-1 py-1 rounded flex items-center ml-2 ${
                !isReplaceButtonEnabled ? "opacity-50 cursor-not-allowed" : ""
              }`}
              disabled={!isReplaceButtonEnabled}
            >
              <img
                src="/src/assets/images/word-replacement.png"
                alt="Заменить слово"
                className="w-5 h-5"
              />
            </button>
          </div>
          <div className="flex justify-center space-x-4">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`flex items-center text-white px-4 py-2 rounded ${
                isRecording
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-green-500 hover:bg-green-600"
              }`}
            >
              <Mic className="w-4 h-4 mr-2" />
              {isRecording ? "Остановить запись" : "Начать запись"}
            </button>
            {audioBlob && (
              <button
                onClick={togglePlayPause}
                className="flex items-center bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" /> Пауза
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" /> Воспроизвести
                  </>
                )}
              </button>
            )}
          </div>
          <div ref={waveformRef} className="w-full h-32 relative z-10" />
          {audioBlob && (
            <div className="flex justify-center space-x-4">
              <button
                onClick={createTrimRegion}
                className="flex items-center bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded"
              >
                <Scissors className="w-4 h-4 mr-2" /> Создать область обрезки
              </button>
              <button
                onClick={trimAudio}
                className="flex items-center bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded"
              >
                <Scissors className="w-4 h-4 mr-2" /> Обрезать
              </button>
              <button
                onClick={handleUploadClick}
                className="flex items-center bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded"
              >
                <Upload className="w-4 h-4 mr-2" /> Загрузить аудио
              </button>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl mb-4">
              Вы действительно хотите загрузить аудио?
            </h2>
            <div className="flex justify-end space-x-4">
              <button
                onClick={handleConfirmUpload}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
              >
                Да
              </button>
              <button
                onClick={handleCancelUpload}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
              >
                Нет
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioRecorder;
