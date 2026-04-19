import { useMutation } from "@tanstack/react-query";
import { sendChatMessage } from "./index";
import type { ChatRequest } from "./types";

export const useSendChatMessage = () => {
  return useMutation<any, Error, ChatRequest>({
    mutationFn: sendChatMessage,
    onError: (error) => {
      console.error("Failed to send chat message:", error);
    },
  });
};