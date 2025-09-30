/**
 * Utility functions for handling audio data in React Native
 */

export interface AudioData {
  uri: string;
  blob?: Blob;
  data?: Uint8Array;
}

/**
 * Convert audio URI to Uint8Array for AI processing
 * This handles React Native's file URI system properly
 */
export async function convertAudioToUint8Array(
  audioData: AudioData
): Promise<Uint8Array> {
  console.log("🟦 [AudioUtils] convertAudioToUint8Array - Starting conversion");
  console.log("🟦 [AudioUtils] Audio data received:", {
    hasData: !!audioData.data,
    hasBlob: !!audioData.blob,
    hasUri: !!audioData.uri,
    dataLength: audioData.data?.length,
    blobType: audioData.blob?.type,
    uri: audioData.uri,
  });

  try {
    // If we already have the data as Uint8Array, use it
    if (audioData.data) {
      console.log(
        "🟦 [AudioUtils] Using existing Uint8Array data, length:",
        audioData.data.length
      );
      return audioData.data;
    }

    // If we have a blob, try to convert it
    if (audioData.blob) {
      console.log(
        "🟦 [AudioUtils] Converting blob to Uint8Array, blob type:",
        audioData.blob.type
      );
      if (typeof audioData.blob.arrayBuffer === "function") {
        console.log("🟦 [AudioUtils] Using arrayBuffer() method");
        const arrayBuffer = await audioData.blob.arrayBuffer();
        const result = new Uint8Array(arrayBuffer);
        console.log(
          "🟦 [AudioUtils] Blob converted via arrayBuffer, length:",
          result.length
        );
        return result;
      } else if (typeof audioData.blob.stream === "function") {
        console.log("🟦 [AudioUtils] Using stream() method");
        const stream = audioData.blob.stream();
        const reader = stream.getReader();
        const chunks: Uint8Array[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }

        const totalLength = chunks.reduce(
          (acc, chunk) => acc + chunk.length,
          0
        );
        const result = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          result.set(chunk, offset);
          offset += chunk.length;
        }
        console.log(
          "🟦 [AudioUtils] Blob converted via stream, length:",
          result.length
        );
        return result;
      } else {
        console.warn(
          "🟦 [AudioUtils] Blob has neither arrayBuffer nor stream method"
        );
      }
    }

    // Fallback: try to fetch the URI and convert to Uint8Array
    if (audioData.uri) {
      console.log("🟦 [AudioUtils] Fetching audio from URI:", audioData.uri);
      try {
        const response = await fetch(audioData.uri);
        console.log("🟦 [AudioUtils] URI fetch response:", {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
        });
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const result = new Uint8Array(arrayBuffer);
          console.log(
            "🟦 [AudioUtils] URI audio converted, length:",
            result.length
          );
          return result;
        }
      } catch (fetchError) {
        console.error("🟦 [AudioUtils] Failed to fetch audio URI:", fetchError);
      }
    }

    console.error(
      "🟦 [AudioUtils] Unable to convert audio data to Uint8Array - no valid data source found"
    );
    throw new Error("Unable to convert audio data to Uint8Array");
  } catch (error) {
    console.error(
      "🟦 [AudioUtils] Error converting audio to Uint8Array:",
      error
    );
    throw error;
  }
}

/**
 * Get the media type for audio based on URI or blob
 */
export function getAudioMediaType(audioData: AudioData): string {
  console.log("🟦 [AudioUtils] getAudioMediaType - Determining media type");

  if (audioData.blob && audioData.blob.type) {
    console.log("🟦 [AudioUtils] Using blob type:", audioData.blob.type);
    return audioData.blob.type;
  }

  if (audioData.uri) {
    console.log("🟦 [AudioUtils] Determining type from URI:", audioData.uri);
    if (audioData.uri.includes(".m4a")) {
      console.log("🟦 [AudioUtils] Detected M4A format");
      return "audio/m4a";
    }
    if (audioData.uri.includes(".mp3")) {
      console.log("🟦 [AudioUtils] Detected MP3 format");
      return "audio/mpeg";
    }
    if (audioData.uri.includes(".wav")) {
      console.log("🟦 [AudioUtils] Detected WAV format");
      return "audio/wav";
    }
    if (audioData.uri.includes(".aac")) {
      console.log("🟦 [AudioUtils] Detected AAC format");
      return "audio/aac";
    }
  }

  console.log("🟦 [AudioUtils] Using default media type: audio/m4a");
  return "audio/m4a"; // Default for React Native recordings
}

/**
 * Validate that audio data is usable for AI processing
 */
export function validateAudioData(audioData: AudioData): boolean {
  console.log("🟦 [AudioUtils] validateAudioData - Validating audio data");
  const isValid = !!(audioData.uri || audioData.blob || audioData.data);
  console.log("🟦 [AudioUtils] Audio data validation result:", {
    isValid,
    hasUri: !!audioData.uri,
    hasBlob: !!audioData.blob,
    hasData: !!audioData.data,
  });
  return isValid;
}
