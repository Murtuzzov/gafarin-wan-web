import React, { useRef, useState, useEffect } from "react";
import axios from "axios";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions";
import { Mic, Play, Pause, Scissors, Upload } from "lucide-react";
import { sliceAudioBlob } from "./audio";
import Modal from "./Modal";

type WaveSurferExt = WaveSurfer & { regions: RegionsPlugin };

const AudioRecorder: React.FC = () => {
  const waveformRef = useRef<HTMLDivElement>(null);
  const [word, setWord] = useState<string>("Чубарук");
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [region, setRegion] = useState<any | null>(null);
  const [wavesurfer, setWavesurfer] = useState<WaveSurferExt | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [hasRecorded, setHasRecorded] = useState<boolean>(false);
  const [trimStart, setTrimStart] = useState<number>(0);
  const [trimEnd, setTrimEnd] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isReplaceButtonEnabled, setIsReplaceButtonEnabled] =
    useState<boolean>(true);
  const [isWordReplaced, setIsWordReplaced] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Статистика
  const [totalWords, setTotalWords] = useState<number>(0);
  const [recordedWords, setRecordedWords] = useState<number>(0);

  // Функция для обновления статистики
  const fetchStatistics = async () => {
    try {
      const response = await axios.get("/api/statistics"); // Путь к API для статистики
      setTotalWords(response.data.total); // Общее количество слов
      setRecordedWords(response.data.recorded); // Количество озвученных слов
    } catch (error) {
      console.error("Ошибка при получении статистики:", error);
    }
  };

  useEffect(() => {
    fetchStatistics();

    // Получаем слово, которое нужно озвучить
    const fetchWord = async () => {
      try {
        const response = await axios.get("your-api-url", {
          params: { id: "someId", spelling: "someSpelling" },
        });
        setWord(response.data.word || "Чубарук");
      } catch (error) {
        console.error("Ошибка при получении слова:", error);
      }
    };

    fetchWord();

    return () => {
      if (wavesurfer) wavesurfer.destroy();
    };
  }, [wavesurfer]);

  const handleCancelUpload = () => {
    setIsModalOpen(false); // Закрытие модального окна
  };

  const handleConfirmUpload = async () => {
    if (!audioBlob || !word) return; // Если нет аудио или слова, ничего не делаем

    // Создаем объект FormData для отправки на сервер
    const formData = new FormData();
    formData.append("audio", audioBlob, "audio.wav"); // Добавляем аудиофайл
    formData.append("word", word); // Добавляем слово

    try {
      // Отправляем POST-запрос на сервер с аудио и словом
      const response = await axios.post("/api/upload-audio", formData, {
        headers: {
          "Content-Type": "multipart/form-data", // Указываем, что отправляем форму с файлом
        },
      });

      if (response.status === 200) {
        console.log("Аудио успешно загружено на сервер");

        const getWordResponse = await axios.get("/api/get-new-word");
        if (getWordResponse.status === 200) {
          const newWord = getWordResponse.data.word;
          console.log("Новое слово получено:", newWord);
          setWord(newWord); // Обновляем слово
        } else {
          console.error("Ошибка при получении нового слова");
        }
      }
    } catch (error) {
      console.error("Ошибка при загрузке аудио:", error);
    }

    setIsModalOpen(false); // Закрываем модальное окно
  };

  const handleUploadClick = () => {
    setIsModalOpen(true); // Открытие модального окна
  };

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
        setIsWordReplaced(false); // Reset after recording
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setCurrentTime(0);
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
      const regionsPlugin = newWavesurfer.registerPlugin(
        RegionsPlugin.create()
      );
      newWavesurfer.regions = regionsPlugin;

      newWavesurfer.loadBlob(blob);
      setWavesurfer(newWavesurfer);

      newWavesurfer.on("ready", () => {
        setTrimEnd(newWavesurfer.getDuration());
      });

      newWavesurfer.on("audioprocess", () => {
        setCurrentTime(newWavesurfer.getCurrentTime());
      });

      newWavesurfer.on("finish", () => {
        setIsPlaying(false);
      });
    }
  };

  const togglePlayPause = () => {
    if (!wavesurfer) return;
    if (isPlaying) {
      wavesurfer.pause();
    } else {
      wavesurfer.play();
    }
    setIsPlaying(!isPlaying);
  };

  const createTrimRegion = () => {
    if (wavesurfer && wavesurfer.regions) {
      const newRegion = wavesurfer.regions.addRegion({
        start: trimStart,
        end: wavesurfer.getDuration(),
        color: "rgba(0, 255, 0, 0.3)",
      });
      setRegion(newRegion);
    }
  };

  const trimAudio = () => {
    if (wavesurfer && region && audioBlob) {
      sliceAudioBlob(audioBlob, region.start, region.end)
        .then((slicedWavBlob) => {
          setAudioBlob(slicedWavBlob);
          createWaveform(slicedWavBlob);
          const audioURL = URL.createObjectURL(slicedWavBlob);
          const audioElement = new Audio(audioURL);
          audioElement.play();
          setCurrentTime(0);
          setTrimEnd(slicedWavBlob.size);
        })
        .catch((error) => {
          console.error("Error slicing audio Blob:", error);
        });
    }
  };

  const handleReplaceWord = async () => {
    if (!isReplaceButtonEnabled) return;
    setIsReplaceButtonEnabled(false);
    console.log("Слово заменено");

    const response = await axios.get("your-api-url", {
      params: { id: "someId", spelling: "someSpelling" },
    });

    setWord(response.data.word || "Чубарук");
    setIsWordReplaced(true);

    setTimeout(() => {
      setIsReplaceButtonEnabled(true);
    }, 2000);
  };

  const formatTime = (seconds: number) => {
    const fullSeconds = Math.floor(seconds);
    const milliseconds = Math.floor((seconds - fullSeconds) * 10);
    return `${fullSeconds}.${milliseconds}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-100 via-blue-50 to-indigo-100">
          {!hasRecorded && (
            <h2 className="text-3xl font-semibold text-center text-gray-800">
              Озвучь слово:
            </h2>
          )}
        </div>
        <div className="p-6 space-y-6">
          <div className="flex justify-center items-center space-x-4">
            <div
              className="text-xl font-semibold text-gray-800"
              aria-live="polite"
            >
              {word}
            </div>
            <button
              onClick={handleReplaceWord}
              className={`bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-full transition-all duration-200 ${
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

          <div className="flex flex-col justify-center items-center space-y-4 xs:flex-row xs:space-x-4 xs:space-y-0">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`flex items-center justify-center text-white px-6 py-2 rounded-[12px] w-full xs:w-auto ${
                isRecording
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-green-500 hover:bg-green-600"
              } transition-all duration-300 text-sm md:text-base`}
            >
              <Mic className="w-5 h-5 mr-2" />
              {isRecording ? "Остановить запись" : "Начать запись"}
            </button>
            {audioBlob && (
              <button
                onClick={togglePlayPause}
                className="flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-[12px] w-full xs:w-auto transition-all duration-300 text-sm min-w-[150px] justify-center"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-5 h-5 mr-2 shrink-0" /> Пауза
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2 shrink-0" /> Воспроизвести
                  </>
                )}
              </button>
            )}
          </div>

          <div ref={waveformRef} className="w-full h-32 relative z-10" />

          {audioBlob && (
            <div className="flex justify-between items-center mt-0 text-sm text-gray-600">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(trimEnd)}</span>
            </div>
          )}

          {audioBlob && (
            <div className="flex justify-center space-y-4 mt-4 flex-col md:flex-row md:space-x-4 md:space-y-0">
              <button
                onClick={createTrimRegion}
                className="flex items-center justify-center w-full md:w-auto bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-[10px] transition-all duration-300 text-sm md:text-base"
              >
                <Scissors className="w-5 h-5 mr-2" /> Создать область обрезки
              </button>
              <button
                onClick={trimAudio}
                className="flex items-center justify-center w-full md:w-auto bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-[10px] transition-all duration-300 text-sm md:text-base"
              >
                <Scissors className="w-5 h-5 mr-2" /> Обрезать
              </button>
              <button
                onClick={handleUploadClick}
                className={`flex items-center justify-center w-full md:w-auto bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-[10px] transition-all duration-300 text-sm md:text-base ${
                  isWordReplaced ? "opacity-50 cursor-not-allowed" : ""
                }`}
                disabled={isWordReplaced}
              >
                <Upload className="w-5 h-5 mr-2" /> Загрузить аудио
              </button>
            </div>
          )}

          <div className="mt-4 text-center text-lg text-gray-600">
            Озвучено: {recordedWords} / {totalWords} слов
          </div>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCancelUpload}
        onConfirm={handleConfirmUpload}
      />
    </div>
  );
};

export default AudioRecorder;
