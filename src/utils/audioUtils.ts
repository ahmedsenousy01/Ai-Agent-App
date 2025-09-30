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
  try {
    // If we already have the data as Uint8Array, use it
    if (audioData.data) {
      return audioData.data;
    }

    // If we have a blob, try to convert it
    if (audioData.blob) {
      if (typeof audioData.blob.arrayBuffer === "function") {
        const arrayBuffer = await audioData.blob.arrayBuffer();
        return new Uint8Array(arrayBuffer);
      } else if (typeof audioData.blob.stream === "function") {
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
        return result;
      }
    }

    // Fallback: try to fetch the URI and convert to Uint8Array
    if (audioData.uri) {
      try {
        const response = await fetch(audioData.uri);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          return new Uint8Array(arrayBuffer);
        }
      } catch (fetchError) {
        console.warn("Failed to fetch audio URI:", fetchError);
      }
    }

    throw new Error("Unable to convert audio data to Uint8Array");
  } catch (error) {
    console.error("Error converting audio to Uint8Array:", error);
    throw error;
  }
}

/**
 * Get the media type for audio based on URI or blob
 */
export function getAudioMediaType(audioData: AudioData): string {
  if (audioData.blob && audioData.blob.type) {
    return audioData.blob.type;
  }

  if (audioData.uri) {
    if (audioData.uri.includes(".m4a")) return "audio/m4a";
    if (audioData.uri.includes(".mp3")) return "audio/mpeg";
    if (audioData.uri.includes(".wav")) return "audio/wav";
    if (audioData.uri.includes(".aac")) return "audio/aac";
  }

  return "audio/m4a"; // Default for React Native recordings
}

/**
 * Validate that audio data is usable for AI processing
 */
export function validateAudioData(audioData: AudioData): boolean {
  return !!(audioData.uri || audioData.blob || audioData.data);
}
