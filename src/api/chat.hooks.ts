import { useMutation } from '@tanstack/react-query'
import { sendChatMessage } from './index'

export const useSendChatMessage = () =>
  useMutation<unknown, Error, { message: string; roster_id?: string }>({
    mutationFn: sendChatMessage,
  })
