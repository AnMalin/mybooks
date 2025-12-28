
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { AspectRatio } from "../types";

// Helper for manual base64 decoding (required by guidelines)
function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Helper for manual raw PCM audio decoding (required by guidelines for Live and TTS)
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const getAiClient = () => {
    // Always create a fresh client instance to use the latest API_KEY
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// 1. General Intelligence & Thinking Mode
export const generateResponse = async (
    prompt: string,
    useThinking: boolean = false,
    useSearch: boolean = false
) => {
    const ai = getAiClient();
    
    // Select models based on task type as per guidelines
    let model = 'gemini-3-flash-preview';
    if (useThinking) {
        model = 'gemini-3-pro-preview';
    }

    const config: any = {};
    
    if (useThinking) {
        // Thinking budget for gemini-3-pro-preview
        config.thinkingConfig = { thinkingBudget: 32768 };
    }

    if (useSearch) {
        config.tools = [{ googleSearch: {} }];
    }

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config
        });
        
        let groundingUrls: {url: string, title: string}[] = [];
        
        // Always extract URLs from groundingChunks when using search
        if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
            response.candidates[0].groundingMetadata.groundingChunks.forEach((chunk: any) => {
                if (chunk.web?.uri) {
                    groundingUrls.push({
                        url: chunk.web.uri,
                        title: chunk.web.title || chunk.web.uri
                    });
                }
            });
        }

        return {
            text: response.text, // Access text property directly
            groundingUrls
        };
    } catch (error: any) {
        console.error("Gemini Generate Error:", error);
        throw error;
    }
};

// 2. Image Analysis
export const analyzeImage = async (base64Image: string, prompt: string) => {
    const ai = getAiClient();
    const model = 'gemini-3-pro-preview'; 

    try {
        const response = await ai.models.generateContent({
            model,
            contents: {
                parts: [
                    {
                        inlineData: {
                            mimeType: 'image/png',
                            data: base64Image
                        }
                    },
                    { text: prompt }
                ]
            }
        });
        return response.text;
    } catch (error) {
        console.error("Image Analysis Error:", error);
        throw error;
    }
};

// 3. Image Generation
export const generateImage = async (
    prompt: string, 
    aspectRatio: AspectRatio,
    usePro: boolean = false
) => {
    // Pro models require user to select their own API key
    if (usePro) {
        const win = window as any;
        if (win.aistudio && !await win.aistudio.hasSelectedApiKey()) {
            await win.aistudio.openSelectKey();
        }
    }
    
    const ai = getAiClient();
    const model = usePro ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';

    const config: any = {
        imageConfig: {
            aspectRatio: aspectRatio,
            imageSize: usePro ? '1K' : undefined // Defaulting to 1K for Pro
        }
    };

    try {
        const response = await ai.models.generateContent({
            model,
            contents: { parts: [{ text: prompt }] },
            config
        });

        // Iterate through all parts to find the image part
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
        throw new Error("No image generated");
    } catch (error: any) {
        if (error.message?.includes("Requested entity was not found.")) {
             const win = window as any;
             if (win.aistudio) await win.aistudio.openSelectKey();
        }
        console.error("Image Gen Error:", error);
        throw error;
    }
};

// 4. Image Editing
export const editImage = async (base64Image: string, prompt: string) => {
    const ai = getAiClient();
    const model = 'gemini-2.5-flash-image';

    try {
        const response = await ai.models.generateContent({
            model,
            contents: {
                parts: [
                    {
                        inlineData: {
                            mimeType: 'image/png',
                            data: base64Image
                        }
                    },
                    { text: prompt }
                ]
            }
        });

         for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
        throw new Error("No edited image returned");
    } catch (error) {
        console.error("Image Edit Error:", error);
        throw error;
    }
};

// 5. Veo Video Generation
export const generateVideo = async (prompt: string, aspectRatio: '16:9' | '9:16', imageBase64?: string) => {
    // Check for Paid Key Selection for Veo
    const win = window as any;
    if (win.aistudio && !await win.aistudio.hasSelectedApiKey()) {
        await win.aistudio.openSelectKey();
    }
    
    const ai = getAiClient();
    const model = 'veo-3.1-fast-generate-preview';
    
    try {
        const requestPayload: any = {
            model,
            prompt,
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio
            }
        };

        if (imageBase64) {
             requestPayload.image = {
                imageBytes: imageBase64,
                mimeType: 'image/png'
            };
        }

        let operation = await ai.models.generateVideos(requestPayload);

        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }

        const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!uri) throw new Error("No video URI returned");

        // Fetch using API key parameter as per guidelines
        const videoRes = await fetch(`${uri}&key=${process.env.API_KEY}`);
        const videoBlob = await videoRes.blob();
        return URL.createObjectURL(videoBlob);

    } catch (error: any) {
        if (error.message?.includes("Requested entity was not found.")) {
             const win = window as any;
             if (win.aistudio) await win.aistudio.openSelectKey();
        }
        console.error("Veo Error:", error);
        throw error;
    }
};

// 6. Text to Speech
export const generateSpeech = async (text: string) => {
    const ai = getAiClient();
    const model = 'gemini-2.5-flash-preview-tts';

    try {
        const response = await ai.models.generateContent({
            model,
            contents: [{ parts: [{ text: `Say clearly: ${text}` }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Puck' } 
                    }
                }
            }
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) throw new Error("No audio generated");
        
        // Decode and play raw PCM audio using the manual methods provided in guidelines
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const audioBuffer = await decodeAudioData(decodeBase64(base64Audio), audioContext, 24000, 1);
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start();
        
        return audioBuffer.duration; // Return duration to manage UI state
    } catch (error) {
        console.error("TTS Error:", error);
        throw error;
    }
};
