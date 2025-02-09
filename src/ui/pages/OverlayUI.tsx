import { useEffect, useRef, useState } from "react";
import { IoIosSend } from "react-icons/io";
import { FaMicrophone, FaYoutube } from "react-icons/fa";
import { CiGlobe, CiImageOn } from "react-icons/ci";
import { motion } from "motion/react";
import { Scale } from "lucide-react";

const OverlayUI = () => {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hello! How can I assist you today?" },
  ]);
  const [userInput, setUserInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [messageTag, setMessageTag] = useState<string | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Scroll to the latest message
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Handle text message submission
  const sendMessage = () => {
    if (userInput.trim() === "") return;

    const taggedMessage = messageTag ? `${userInput} ${messageTag}` : userInput;

    setMessages((prev) => [...prev, { role: "user", content: userInput }]);

    try {
      let aiResponse = "";

      // Send the message via Electron API
      //@ts-ignore
      window.llmAPI.sendText(taggedMessage, "overlay");

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "..." }, // Append new assistant message
      ]);

      // Listen for streamed text chunks
      //@ts-ignore
      window.llmAPI.onStreamText((textChunk) => {
        aiResponse += textChunk;

        // Update the last assistant message progressively
        setMessages((prev) =>
          prev.map((msg, index) =>
            index === prev.length - 1 ? { ...msg, content: aiResponse } : msg
          )
        );
      });

      // Handle when streaming is complete
      //@ts-ignore
      window.llmAPI.onStreamComplete((fullText) => {
        console.log("Streaming Complete:", fullText);
      });
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error processing your request." },
      ]);
    }

    setUserInput("");
  };

  // Handle recording toggle
  // const handleRecord = () => {
  //   if (isRecording) {
  //     if (mediaRecorder.current) {
  //       mediaRecorder.current.stop();
  //       mediaRecorder.current.stream
  //         .getTracks()
  //         .forEach((track) => track.stop());
  //     }
  //     setIsRecording(false);
  //     return;
  //   }

  //   navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
  //     const recorder = new MediaRecorder(stream);
  //     const audioChunks: Blob[] = [];

  //     recorder.ondataavailable = (event) => {
  //       audioChunks.push(event.data);
  //     };

  //     recorder.onstop = () => {
  //       const blob = new Blob(audioChunks, { type: "audio/wav" });
  //       sendAudio(blob);
  //     };

  //     recorder.start();
  //     mediaRecorder.current = recorder;
  //     setIsRecording(true);
  //   });
  // };

  // Handle audio submission
  const sendAudio = async (audioBlob: Blob) => {
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
      if (reader.result === null) return;

      const base64Audio = (reader.result as string).split(",")[1]; // Extract base64 data

      try {
        //@ts-ignore
        const response = await window.llmAPI.sendAudio(base64Audio);

        setMessages((prev) => [...prev, { role: "user", content: response }]);

        let aiResponse = "";

        // Send the message via Electron API
        //@ts-ignore
        window.llmAPI.sendText(response, "overlay");

        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "..." }, // Append new assistant message
        ]);

        // Listen for streamed text chunks
        //@ts-ignore
        window.llmAPI.onStreamText((textChunk) => {
          aiResponse += textChunk;

          // Update the last assistant message progressively
          setMessages((prev) =>
            prev.map((msg, index) =>
              index === prev.length - 1 ? { ...msg, content: aiResponse } : msg
            )
          );
        });

        // Handle when streaming is complete
        //@ts-ignore
        window.llmAPI.onStreamComplete((fullText) => {
          console.log("Streaming Complete:", fullText);
        });
      } catch (error) {
        console.error("Error processing audio or sending message:", error);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Error processing your request." },
        ]);
      }
    };
  };

  const handleLLMResponse = (message: string, role: string): JSX.Element => {
    const imageRegex = /\.(jpeg|jpg|gif|png|webp|bmp|svg)$/i;
    const youtubeRegex =
      /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]+)/i;

    if (imageRegex.test(message)) {
      return (
        <div className="w-full animate-pop-up">
          <a href={message} target="_blank" rel="noopener noreferrer">
            <img src={message} alt="Image" className="rounded-lg w-full" />
          </a>
        </div>
      );
    } else if (youtubeRegex.test(message)) {
      const match = message.match(youtubeRegex);
      const videoId = match ? match[1] : null;

      if (videoId) {
        return (
          <div className="relative w-full aspect-video rounded-lg overflow-hidden">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              title="YouTube video player"
              className="absolute top-0 left-0 w-full h-full"
              allowFullScreen
            ></iframe>
          </div>
        );
      }
    }

    return (
      <p
        className={`px-4 py-2 rounded-lg animate-pop-up ${
          role === "user"
            ? "bg-blue-600 text-white"
            : "bg-[#212121] text-gray-200"
        }`}
      >
        {message}
      </p>
    );
  };

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isAwake, setIsAwake] = useState<boolean>(true);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [isBlinking, setIsBlinking] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);

  //Handle Thinking
  useEffect(() => {
    setIsThinking(isStreaming);
  }, [isStreaming]);

  //Eye Movements
  useEffect(() => {
    const interval = setInterval(() => {
      setPosition({
        x: (Math.random() - 0.5) * 20, // Random x movement
        y: (Math.random() - 0.5) * 20, // Random y movement
      });
    }, 4000); // Moves every 2 seconds

    return () => clearInterval(interval);
  }, []);

  // Blinking effect
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 150); // Eye stays closed briefly
    }, 4500);

    return () => clearInterval(blinkInterval);
  }, []);

  const sleep = () => {
    setTimeout(() => {
      setIsAwake(false);
    }, 3000);
  };

  const startRecording = () => {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(async (stream) => {
        const recorder = new MediaRecorder(stream);
        const audioChunks: Blob[] = [];
        const audioContext = new AudioContext();

        // Ensure AudioContext is active
        await audioContext.resume();

        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();

        source.connect(analyser);
        analyser.connect(audioContext.destination);

        analyser.fftSize = 2048; // Larger FFT size for better resolution
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        analyser.getByteFrequencyData(dataArray);
        console.log("Frequency Data:", Array.from(dataArray));

        let hasSound = false;
        let silenceTimeout: NodeJS.Timeout | null = null;

        const checkSilence = () => {
          analyser.getByteTimeDomainData(dataArray);
          console.log("Data Array:", dataArray); // Debugging

          // Compute volume
          const volume =
            dataArray.reduce((sum, val) => sum + Math.abs(val - 128), 0) /
            bufferLength;
          console.log("Volume:", volume);

          if (volume > 10) {
            hasSound = true;
            if (silenceTimeout) {
              clearTimeout(silenceTimeout);
              silenceTimeout = null;
            }
          } else {
            if (!silenceTimeout) {
              silenceTimeout = setTimeout(() => {
                console.log("Silence Detected - Stopping Recording...");
                stopRecording();
              }, 5000);
            }
          }

          if (isRecording) {
            requestAnimationFrame(checkSilence);
          }
        };

        //start monitoring silence
        checkSilence();

        recorder.ondataavailable = (event) => {
          audioChunks.push(event.data);
        };

        recorder.onstop = () => {
          const blob = new Blob(audioChunks, { type: "audio/wav" });

          if (hasSound) {
            console.log("Sending audio...");
            sendAudio(blob);
          } else {
            console.log("No voice detected - Audio discarded.");
          }

          stream.getTracks().forEach((track) => track.stop());
          audioContext.close();
        };

        recorder.start();
        mediaRecorder.current = recorder;
        setIsRecording(true);
        hasSound = false;
        checkSilence();
      });
  };

  const stopRecording = () => {
    if (mediaRecorder.current) {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach((track) => track.stop());
    }
    setIsRecording(false);
  };

  //Electron API listeners
  //@ts-ignore
  window.overlayManagerAPI.removeToggleOverlayListener();
  //@ts-ignore
  window.overlayManagerAPI.onToggleOverlay(() => {
    setIsOpen((prev) => !prev);
  });

  //@ts-ignore
  window.llmAPI.removeStreamStartListener();
  //@ts-ignore
  window.llmAPI.onStreamStart(() => {
    setIsStreaming(true);
  });

  //@ts-ignore
  window.llmAPI.removeStreamCompleteListener();
  //@ts-ignore
  window.llmAPI.onStreamComplete(() => {
    setIsStreaming(false);
    sleep();
  });

  //@ts-ignore
  window.overlayManagerAPI.removeWakeUpCommandListener();
  //@ts-ignore
  window.overlayManagerAPI.onWakeUpCommand(() => {
    if (!isOpen) setIsOpen(true);
    setIsAwake(true);
    startRecording();
  });

  return (
    <div className="flex flex-col h-screen text-white  text-sm gap-3 relative">
      {/* AI ICON */}

      {/* MAIN TAG FOR OPEN AND CLOSE */}
      <motion.div
        className="absolute top-10 right-10"
        initial={false}
        animate={{
          scale: isOpen ? 1 : 0, // Open/close transition
        }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      >
        {/* AI Main Container with Smooth Scaling & Opacity */}
        <motion.div
          className="w-16 h-16 flex items-center justify-center rounded-full shadow-lg border-white border-2"
          animate={{
            scale: isAwake ? [1, 1.1, 1] : 1, // Heartbeat effect
            backgroundColor: "#212121",
            opacity: isAwake ? 1 : 0.1, // Fades out when not awake
          }}
          transition={{
            scale: isAwake
              ? { repeat: Infinity, duration: 1.5, ease: "easeInOut" }
              : {},
            backgroundColor: { duration: 0.5, ease: "easeInOut" }, // Smooth color transition
            opacity: { duration: 0.5 }, // Fades smoothly
          }}
        >
          {/* Thinking Mode Animation */}
          <motion.div
            animate={{
              scale: isThinking ? 1 : 0, // Scales in and out smoothly
              opacity: isThinking ? 1 : 0, // Fades in/out
            }}
            transition={{ duration: 0.4, ease: "easeInOut" }} // Smooth transition timing
            className="absolute flex items-center justify-center"
          >
            <img
              src="./Interwind.svg"
              alt="Thinking Animation"
              className="w-14 h-14"
            />
          </motion.div>

          {/* Eye Animation (Only Visible When Not Thinking) */}
          <motion.div
            animate={{
              scaleY: isThinking ? 0 : isAwake ? (isBlinking ? 0 : 1) : 0.05, // Eye shrinks when thinking
              scale: isThinking ? 0 : 1, // Slight shrink effect
            }}
            transition={{ duration: 0.3 }} // Smooth transition effect
          >
            <motion.div
              className="w-5 h-5 flex items-center justify-center bg-white rounded-full shadow-lg border"
              animate={
                isAwake ? { x: position.x, y: position.y } : { opacity: 0.8 }
              }
              transition={
                isAwake ? { type: "spring", stiffness: 50, damping: 5 } : {}
              }
            ></motion.div>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Chat Area (Only Shows Latest Assistant Response) */}
      <motion.div
        className="overflow-y-auto w-[360px] max-h-[70vh] p-1 before:scrollbar-hide rounded-lg mt-[110px]"
        initial={false}
        animate={{
          scale: isOpen ? 1 : 0,
        }}
        transition={{ delay: 0.2, duration: 0.6, ease: "easeInOut" }}
        style={{ originX: 1, originY: 0 }}
      >
        {messages
          .filter((msg) => msg.role === "assistant") // Filter only assistant messages
          .slice(-1) // Keep only the latest one
          .map((message, index) => (
            <div key={index} className="flex justify-end">
              {handleLLMResponse(message.content, message.role)}
            </div>
          ))}
        <div ref={chatEndRef} />
      </motion.div>
      {/* Input Area */}
      <div className="pointer-events-auto w-[300px]">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              className="flex-grow p-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Type a message..."
            />
            <button
              onClick={sendMessage}
              className="px-2 py-2 text-xl bg-blue-500 rounded-lg hover:scale-110 hover:shadow-md hover:shadow-blue-500 transition-transform duration-300"
            >
              <IoIosSend />
            </button>
            <button
              onClick={startRecording}
              className={`px-2 py-2 text-xl rounded-lg ${
                isRecording
                  ? "bg-red-500 hover:shadow-red-500"
                  : "bg-green-600 hover:shadow-green-600"
              } hover:scale-110 hover:shadow-md transition-transform duration-300`}
            >
              <FaMicrophone />
            </button>
          </div>

          {/* Toggleable Message Tags */}
          <div className="flex text-sm gap-2 ">
            {/* Search Button */}
            <button
              onClick={() => setIsThinking((prev) => !prev)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-transform duration-300 ${
                messageTag === "websearch"
                  ? "bg-blue-500 shadow-md shadow-blue-500"
                  : "bg-blue-500 hover:scale-110 hover:shadow-md hover:shadow-blue-500"
              }`}
            >
              <CiGlobe />
              Search
            </button>

            {/* Image Button */}
            <button
              onClick={() => setIsOpen((prev) => !prev)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-transform duration-300  ${
                messageTag === "show me an image"
                  ? "bg-purple-700 shadow-md shadow-purple-700"
                  : "bg-purple-700 hover:scale-110 hover:shadow-md hover:shadow-purple-700"
              }`}
            >
              <CiImageOn />
              Image
            </button>

            {/* Video Button */}
            <button
              onClick={() => setIsAwake((prev) => !prev)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-transform duration-300  ${
                messageTag === "show me a video"
                  ? "bg-red-500 shadow-md shadow-red-500"
                  : "bg-red-500 hover:scale-110 hover:shadow-md hover:shadow-red-500"
              }`}
            >
              <FaYoutube />
              Video
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverlayUI;
