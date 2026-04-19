import { useState } from "react";
import {
  Typography,
  TextField,
  Button,
  Stack,
  Box,
  CircularProgress,
} from "@mui/material";
import CopilotActionCard, { type CopilotAction } from "./CopilotActionCard";
import MarkdownRenderer from "./MarkdownRenderer";
import { useSendChatMessage } from "../api/hooks";
import type { RosterModificationWidgetData } from "../api/types";

interface ChatMessage {
  message: string;
  response: string;
  timestamp: string;
}

interface ChatApiResponse {
  success: boolean;
  message: string;
  data: {
    response: string;
    widget_data: RosterModificationWidgetData | any;
  };
  timestamp: string;
}

interface CopilotSidebarProps {
  selectedRosterId?: string;
}

const CopilotSidebar = ({ selectedRosterId }: CopilotSidebarProps) => {
  const [actions, setActions] = useState<CopilotAction[]>([]);
  const [prompt, setPrompt] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  
  // API hook
  const sendChatMutation = useSendChatMessage();

  const handleResolve = (id: string, accepted: boolean) => {
    setActions((prev) => prev.filter((a) => a.id !== id));
    console.log(`Action ${id} ${accepted ? "accepted" : "rejected"}`);
  };

  const handleSend = async () => {
    if (!prompt.trim()) return;
    
    const userMessage = prompt;
    setPrompt("");

    // Add user message to history
    const newHistory = [...chatHistory, { 
      message: userMessage, 
      response: "", 
      timestamp: new Date().toISOString() 
    }];
    setChatHistory(newHistory);

    try {
      const response = await sendChatMutation.mutateAsync({
        message: userMessage,
        roster_id: selectedRosterId || undefined
      }) as ChatApiResponse;

      // Update the last message with the response
      setChatHistory(prev => 
        prev.map((item, index) => 
          index === prev.length - 1 
            ? { ...item, response: response.data.response }
            : item
        )
      );

      // Check if widget_data has content and update suggestions
      if (response.data.widget_data && response.data.widget_data.type === "roster_modification") {
        const widgetData = response.data.widget_data;
        const suggestion = widgetData.suggestion;
        
        // Convert widget_data to CopilotAction format
        const newAction: CopilotAction = {
          id: suggestion.suggestion_id || Date.now().toString(),
          message: suggestion.title || response.data.response,
          changeType: suggestion.status === "rejected" ? "constraint" : "assign",
          target: {
            staffId: suggestion.options?.[0]?.patches?.[0]?.path?.split('/')?.[2], // Extract staff ID from patch path
            shift: suggestion.options?.[0]?.patches?.[0]?.value,
            day: suggestion.options?.[0]?.patches?.[0]?.path?.split('/')?.[3] // Extract day from patch path
          },
          apiEndpoint: "", // Not needed since we use the patch API directly
          payload: {
            reason: suggestion.reason,
            confidence: suggestion.confidence,
            status: suggestion.status,
            options: suggestion.options || [],
            impact_score: suggestion.impact_score,
            constraints_violated: suggestion.constraints_violated || [],
            notes: suggestion.notes
          },
          rosterId: selectedRosterId
        };
        setActions(prev => [...prev, newAction]);
      }

    } catch (error) {
      console.error("Chat API Error:", error);
      // Update the last message with error
      setChatHistory(prev => 
        prev.map((item, index) => 
          index === prev.length - 1 
            ? { ...item, response: "Sorry, I encountered an error. Please try again." }
            : item
        )
      );
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        right: 0,
        top: '64px', // Start below the header (assuming header height is 64px)
        height: 'calc(100vh - 64px)', // Full height minus header height
        width: '400px',
        p: 2,
        display: "flex",
        flexDirection: "column",
        backgroundColor: 'background.paper',
        borderLeft: '1px solid',
        borderColor: 'divider',
        zIndex: 1000,
        overflow: 'hidden'
      }}
    >
      {/* Copilot Title */}
      <Typography variant="h6" sx={{ mb: 2 }}>
        AI Copilot
      </Typography>

      {/* Chat History */}
      <Box sx={{ flex: 1, overflowY: "auto", mb: 2, p: 1, border: "1px solid #e0e0e0", borderRadius: 1, minHeight: 200 }}>
        {chatHistory.length === 0 ? (
          <Typography color="text.secondary" sx={{ fontStyle: 'italic', fontSize: '0.875rem' }}>
            Start a conversation with the AI assistant. Ask questions about roster optimization, staff scheduling, or any other roster-related topics.
          </Typography>
        ) : (
          chatHistory.map((chat, index) => (
            <Box key={index} sx={{ mb: 2 }}>
              <Box sx={{ mb: 1 }}>
                <Typography variant="body2" color="primary" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>
                  You:
                </Typography>
                <Typography variant="body2" sx={{ ml: 1, fontSize: '0.875rem' }}>
                  {chat.message}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="secondary" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>
                  AI Assistant:
                </Typography>
                <Box sx={{ ml: 1 }}>
                  {chat.response ? (
                    <MarkdownRenderer content={chat.response} />
                  ) : (sendChatMutation.isPending && index === chatHistory.length - 1 ? (
                    <Box display="flex" alignItems="center" gap={1}>
                      <CircularProgress size={12} />
                      <span>Thinking...</span>
                    </Box>
                  ) : null)}
                </Box>
              </Box>
            </Box>
          ))
        )}
      </Box>

      {/* Suggestions - Only show when actions exist */}
      {actions.length > 0 && (
        <Box sx={{ flex: 1, overflowY: "auto", mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
            Suggestions
          </Typography>
          {actions.map((action) => (
            <CopilotActionCard
              key={action.id}
              action={action}
              onResolve={handleResolve}
            />
          ))}
        </Box>
      )}

      {/* Free-text prompt input */}
      <Stack
        direction="row"
        spacing={1}
        sx={{ mt: 2, pt: 1, borderTop: "1px solid #eee" }}
      >
        <TextField
          fullWidth
          size="small"
          placeholder="Ask or build anything..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={sendChatMutation.isPending}
        />
        <Button
          variant="contained"
          onClick={handleSend}
          disabled={!prompt.trim() || sendChatMutation.isPending}
          sx={{ whiteSpace: "nowrap" }}
        >
          {sendChatMutation.isPending ? <CircularProgress size={16} /> : "Send"}
        </Button>
      </Stack>
    </Box>
  );
};

export default CopilotSidebar;