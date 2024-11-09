// Function to slice an audio Blob and encode it into a WAV Blob
export async function sliceAudioBlob(
  audioBlob: Blob,
  startTime: number,
  endTime: number
): Promise<Blob> {
  const audioContext = new AudioContext();

  // Convert Blob to ArrayBuffer
  const arrayBuffer = await audioBlob.arrayBuffer();

  // Decode ArrayBuffer into AudioBuffer
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  // Calculate sample frames
  const sampleRate = audioBuffer.sampleRate;
  const startSample = Math.floor(startTime * sampleRate);
  const endSample = Math.floor(endTime * sampleRate);
  const frameCount = endSample - startSample;

  // Create a new AudioBuffer for the sliced audio
  const numberOfChannels = audioBuffer.numberOfChannels;
  const newAudioBuffer = audioContext.createBuffer(
      numberOfChannels,
      frameCount,
      sampleRate
  );

  // Copy the sliced data into the new AudioBuffer
  for (let channel = 0; channel < numberOfChannels; channel++) {
      const oldChannelData = audioBuffer.getChannelData(channel);
      const newChannelData = newAudioBuffer.getChannelData(channel);
      newChannelData.set(
          oldChannelData.slice(startSample, endSample)
      );
  }

  // Encode the new AudioBuffer into a WAV Blob
  const slicedBlob = encodeWAV(newAudioBuffer);

  return slicedBlob;
}

// Function to encode an AudioBuffer into a WAV Blob
function encodeWAV(audioBuffer: AudioBuffer): Blob {
  const numberOfChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const bitsPerSample = 16;
  const blockAlign = (numberOfChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataLength = audioBuffer.length * blockAlign;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  /* RIFF Chunk Descriptor */
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true); // ChunkSize
  writeString(view, 8, 'WAVE');

  /* FMT Sub-chunk */
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true);  // AudioFormat (1 for PCM)
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  /* Data Sub-chunk */
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  // Write audio data
  let offset = 44;
  for (let i = 0; i < audioBuffer.length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
          let sample = audioBuffer.getChannelData(channel)[i];
          // Clamp the sample
          sample = Math.max(-1, Math.min(1, sample));
          // Convert to 16-bit PCM
          view.setInt16(offset, sample * 0x7FFF, true);
          offset += 2;
      }
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

// Helper function to write ASCII strings to DataView
function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
  }
}

// // Example usage
// const originalAudioBlob: Blob = /* your original audio Blob from MediaRecorder */;
// const startTime = 10; // start time in seconds
// const endTime = 20;   // end time in seconds

// sliceAudioBlob(originalAudioBlob, startTime, endTime)
//   .then((slicedWavBlob) => {
//       // Use the sliced WAV Blob as needed
//       const audioURL = URL.createObjectURL(slicedWavBlob);

//       // Play the sliced audio
//       const audioElement = new Audio(audioURL);
//       audioElement.play();

//       // Or create a download link
//       const downloadLink = document.createElement('a');
//       downloadLink.href = audioURL;
//       downloadLink.download = 'sliced-audio.wav';
//       downloadLink.textContent = 'Download Sliced Audio';
//       document.body.appendChild(downloadLink);
//   })
//   .catch((error) => {
//       console.error('Error slicing audio Blob:', error);
//   });
