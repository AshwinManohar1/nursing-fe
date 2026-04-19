import { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  InputAdornment,
  CircularProgress,
} from "@mui/material";
import {
  AutoFixHigh,
  Send,
  CheckCircle,
} from "@mui/icons-material";
import { useSendChatMessage, usePatchRoster } from "../api/hooks";
import type { RosterModificationWidgetData, RosterPatch } from "../api/types";
import RosterSuggestionCard from "./RosterSuggestionCard";

interface ViolationCard {
  id: string;
  type: string;
  description: string;
  suggestion: string;
  suggestionDetail: string;
  resolvesCount: number;
}

interface ChatMessage {
  message: string;
  response: string;
  timestamp: string;
}


interface RosterCopilotProps {
  selectedRosterId?: string;
}

const RosterCopilot = ({ selectedRosterId }: RosterCopilotProps) => {
  const [prompt, setPrompt] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      message: "hi",
      response: "I can help with roster modifications or insights. Try asking me about shift changes or coverage gaps.",
      timestamp: new Date().toISOString()
    }
  ]);
  const [violations, setViolations] = useState<ViolationCard[]>([]);
  const [showViolations, setShowViolations] = useState(false);
  const [widgetData, setWidgetData] = useState<RosterModificationWidgetData | null>(null);
  
  // API hooks
  const sendChatMutation = useSendChatMessage();
  const patchRosterMutation = usePatchRoster();

  // Mock violation data - in real app this would come from API
  const mockViolations: ViolationCard[] = [
    {
      id: "1",
      type: "Consecutive Night Shifts",
      description: "Dr. Jones is scheduled for 6 consecutive night shifts (June 8-13), exceeding the 5-shift limit.",
      suggestion: "Swap June 11th shift",
      suggestionDetail: "Swap Dr. Jones' Night shift on June 11th with Dr. Carter's day off.",
      resolvesCount: 1
    },
    {
      id: "2", 
      type: "Insufficient Rest Period",
      description: "Dr. Davis has an Evening shift on June 5th followed by a Morning shift on June 6th, leaving only 8 hours of rest.",
      suggestion: "Assign different nurse",
      suggestionDetail: "Assign Dr. Lee to the Morning shift on June 6th instead of Dr. Davis.",
      resolvesCount: 1
    }
  ];

  const handleSend = async () => {
    if (!prompt || !prompt.trim()) return;
    
    const userMessage = prompt.trim();
    setPrompt("");
    
    // Add user message to chat history immediately
    setChatHistory(prev => {
      if (!prev || !Array.isArray(prev)) {
        return [{
          message: userMessage, 
          response: "", 
          timestamp: new Date().toISOString() 
        }];
      }
      return [
        ...prev,
        { 
          message: userMessage, 
          response: "", 
          timestamp: new Date().toISOString() 
        }
      ];
    });
    
    try {
      // Call the real API
      const response = await sendChatMutation.mutateAsync({
        message: userMessage,
        roster_id: selectedRosterId
      });
      
      // Process the response with null checks
      if (response && response.success && response.data) {
        const assistantResponse = response.data?.response || "";
        const widgetData = response.data?.widget_data;
        
        // Update chat history with response
        setChatHistory(prev => {
          if (!prev || !Array.isArray(prev) || prev.length === 0) {
            return [{
              message: userMessage,
              response: assistantResponse,
              timestamp: new Date().toISOString()
            }];
          }
          const updated = [...prev];
          const lastIndex = updated.length - 1;
          if (lastIndex >= 0 && updated[lastIndex]) {
            updated[lastIndex] = {
              ...updated[lastIndex],
              response: assistantResponse
            };
          }
          return updated;
        });
        
        // Check if response contains widget data
        if (widgetData && typeof widgetData === 'object') {
          if (widgetData.type === 'roster_modification') {
            setWidgetData(widgetData);
            setShowViolations(false);
          } else if (widgetData.violations && Array.isArray(widgetData.violations)) {
            setViolations(widgetData.violations);
            setShowViolations(true);
            setWidgetData(null);
          }
        } else if (userMessage.toLowerCase().includes('analyze') || 
                   userMessage.toLowerCase().includes('violation') || 
                   userMessage.toLowerCase().includes('issue')) {
          // Fallback to mock violations for analysis requests
          setViolations(mockViolations);
          setShowViolations(true);
          setWidgetData(null);
        }
      } else {
        // Handle case where response is not successful or missing data
        setChatHistory(prev => {
          if (!prev || !Array.isArray(prev) || prev.length === 0) {
            return [{
              message: userMessage,
              response: "I received an unexpected response. Please try again.",
              timestamp: new Date().toISOString()
            }];
          }
          const updated = [...prev];
          const lastIndex = updated.length - 1;
          if (lastIndex >= 0 && updated[lastIndex]) {
            updated[lastIndex] = {
              ...updated[lastIndex],
              response: "I received an unexpected response. Please try again."
            };
          }
          return updated;
        });
      }
    } catch (error) {
      console.error('Chat API error:', error);
      
      // Fallback response on error
      setChatHistory(prev => {
        if (!prev || !Array.isArray(prev) || prev.length === 0) {
          return [{
            message: userMessage,
            response: "I'm sorry, I'm having trouble connecting right now. Please try again later.",
            timestamp: new Date().toISOString()
          }];
        }
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        if (lastIndex >= 0 && updated[lastIndex]) {
          updated[lastIndex] = {
            ...updated[lastIndex],
            response: "I'm sorry, I'm having trouble connecting right now. Please try again later."
          };
        }
        return updated;
      });
    }
  };

  const handleApplySuggestion = (violationId: string) => {
    if (!violationId || typeof violationId !== 'string') {
      console.error('Invalid violation ID provided');
      return;
    }
    console.log(`Applying suggestion for violation ${violationId}`);
    // In real app, this would call an API to apply the suggestion
  };

  const handleApplyOption = async (patches: RosterPatch[]) => {
    if (!selectedRosterId) {
      console.error('No roster selected');
      return;
    }

    if (!patches || !Array.isArray(patches) || patches.length === 0) {
      console.error('No patches provided');
      return;
    }

    try {
      await patchRosterMutation.mutateAsync({
        roster_id: selectedRosterId,
        payload: { patches }
      });
      
      // Clear the widget data after successful application
      setWidgetData(null);
      
      // Add a success message to chat
      setChatHistory(prev => {
        if (!prev || !Array.isArray(prev)) {
          return [{
            message: "",
            response: "Successfully applied the changes. The roster has been updated.",
            timestamp: new Date().toISOString()
          }];
        }
        return [
          ...prev,
          {
            message: "",
            response: "Successfully applied the changes. The roster has been updated.",
            timestamp: new Date().toISOString()
          }
        ];
      });
    } catch (error) {
      console.error('Failed to apply patches:', error);
      // Add an error message to chat
      setChatHistory(prev => {
        if (!prev || !Array.isArray(prev)) {
          return [{
            message: "",
            response: "Failed to apply the changes. Please try again.",
            timestamp: new Date().toISOString()
          }];
        }
        return [
          ...prev,
          {
            message: "",
            response: "Failed to apply the changes. Please try again.",
            timestamp: new Date().toISOString()
          }
        ];
      });
    }
  };

  const handleCancelSuggestion = () => {
    setWidgetData(null);
  };

  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: 'white'
    }}>
      {/* Header */}
      <Box sx={{ 
        p: 3, 
        borderBottom: '1px solid #E2E8F0',
        backgroundColor: '#F9FAFB'
      }}>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <AutoFixHigh sx={{ color: '#14B8A6', fontSize: 20 }} />
          <Typography variant="h6" fontWeight="bold" color="#1F2937">
            Copilot
          </Typography>
          {widgetData && (
            <Chip 
              label="Suggestion Available"
              size="small" 
              sx={{ 
                backgroundColor: '#D1FAE5', 
                color: '#065F46',
                fontWeight: 'bold',
                ml: 'auto'
              }} 
            />
          )}
          {showViolations && violations && Array.isArray(violations) && violations.length > 0 && !widgetData && (
            <Chip 
              label={`${violations.length} Violations`}
              size="small" 
              sx={{ 
                backgroundColor: '#FEE2E2', 
                color: '#DC2626',
                fontWeight: 'bold',
                ml: 'auto'
              }} 
            />
          )}
        </Box>
        <Typography variant="body2" color="#6B7280">
          {widgetData ? "Review and apply the suggested changes." : 
           showViolations ? "Showing insights for current roster." : 
           "Ask me about roster modifications or insights."}
        </Typography>
      </Box>

      {/* Chat History and Violations Section */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
        {/* Chat History */}
        {chatHistory && Array.isArray(chatHistory) && chatHistory.length > 1 && (
          <Box sx={{ mb: 3 }}>
            {chatHistory.slice(1).map((chat, index) => {
              if (!chat || typeof chat !== 'object') {
                return null;
              }
              return (
                <Box key={index} sx={{ mb: 3 }}>
                  {/* User Message */}
                  {chat.message && (
                    <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
                      <Box sx={{ 
                        backgroundColor: '#14B8A6', 
                        color: 'white', 
                        p: 2, 
                        borderRadius: 2, 
                        maxWidth: '80%',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                      }}>
                        <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                          You
                        </Typography>
                        <Typography variant="body2">
                          {chat.message}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                  
                  {/* AI Assistant Message - only show if there's a response */}
                  {chat.response && (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                      <Box sx={{ 
                        backgroundColor: '#F3F4F6', 
                        color: '#1F2937', 
                        p: 2, 
                        borderRadius: 2, 
                        maxWidth: '80%',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                      }}>
                        <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5, color: '#14B8A6' }}>
                          AI Assistant
                        </Typography>
                        <Typography variant="body2">
                          {chat.response}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                </Box>
              );
            })}
          </Box>
        )}
        
        {/* Loading State */}
        {sendChatMutation.isPending && (
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-start' }}>
            <Box sx={{ 
              backgroundColor: '#F3F4F6', 
              color: '#1F2937', 
              p: 2, 
              borderRadius: 2, 
              maxWidth: '80%',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
              <CircularProgress 
                size={16} 
                sx={{ 
                  color: '#14B8A6',
                  '& .MuiCircularProgress-circle': {
                    strokeLinecap: 'round',
                  }
                }} 
              />
              <Typography variant="body2" sx={{ color: '#6B7280' }}>
                Thinking...
              </Typography>
            </Box>
          </Box>
        )}
        
        {/* Suggestion Card */}
        {widgetData && (
          <RosterSuggestionCard
            widgetData={widgetData}
            onApplyOption={handleApplyOption}
            onCancel={handleCancelSuggestion}
          />
        )}

        {/* Violations Section */}
        {showViolations && violations && Array.isArray(violations) && violations.length > 0 && !widgetData ? (
          violations.map((violation) => {
            if (!violation || typeof violation !== 'object' || !violation.id) {
              return null;
            }
            return (
              <Card 
                key={violation.id}
                sx={{ 
                  mb: 2, 
                  border: '1px solid #FEE2E2',
                  borderRadius: 2,
                  backgroundColor: '#FEFEFE'
                }}
              >
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="subtitle2" fontWeight="bold" color="#DC2626" gutterBottom>
                    {violation.type || 'Unknown Violation'}
                  </Typography>
                  
                  <Typography variant="body2" color="#374151" sx={{ mb: 2 }}>
                    {violation.description || 'No description available'}
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" fontWeight="bold" color="#1F2937" gutterBottom>
                      {violation.suggestion || 'No suggestion available'}
                    </Typography>
                    <Typography variant="body2" color="#6B7280">
                      {violation.suggestionDetail || 'No details available'}
                    </Typography>
                  </Box>
                  
                  <Box display="flex" gap={1} alignItems="center">
                    <Chip 
                      icon={<CheckCircle />}
                      label={`Resolves ${violation.resolvesCount || 0} violation`}
                      size="small"
                      sx={{ 
                        backgroundColor: '#D1FAE5', 
                        color: '#065F46',
                        fontWeight: 'bold'
                      }} 
                    />
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => handleApplySuggestion(violation.id)}
                      sx={{
                        backgroundColor: '#14B8A6',
                        '&:hover': { backgroundColor: '#0F766E' },
                        textTransform: 'none',
                        fontWeight: 'bold'
                      }}
                    >
                      Apply Suggestion
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            );
          })
        ) : !widgetData && chatHistory && Array.isArray(chatHistory) && chatHistory.length <= 1 ? (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%',
            textAlign: 'center',
            color: '#6B7280'
          }}>
            <AutoFixHigh sx={{ fontSize: 48, color: '#D1D5DB', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No violations detected
            </Typography>
            <Typography variant="body2">
              Your roster looks good! Ask me to analyze it for potential issues.
            </Typography>
          </Box>
        ) : null}
      </Box>

      {/* Chat Input */}
      <Box sx={{ 
        p: 3, 
        borderTop: '1px solid #E2E8F0',
        backgroundColor: '#F9FAFB'
      }}>
        <TextField
          fullWidth
          placeholder="Ask Copilot..."
          value={prompt || ''}
          onChange={(e) => {
            if (e && e.target) {
              setPrompt(e.target.value || '');
            }
          }}
          onKeyPress={(e) => {
            if (e && e.key === 'Enter') {
              handleSend();
            }
          }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton 
                  onClick={handleSend}
                  disabled={!prompt || !prompt.trim() || sendChatMutation.isPending}
                  sx={{ 
                    color: sendChatMutation.isPending ? '#9CA3AF' : '#14B8A6',
                    '&:hover': { 
                      backgroundColor: sendChatMutation.isPending ? 'transparent' : '#E0F2FE' 
                    },
                    '&:disabled': {
                      color: '#9CA3AF'
                    }
                  }}
                >
                  {sendChatMutation.isPending ? (
                    <CircularProgress 
                      size={20} 
                      sx={{ 
                        color: '#14B8A6',
                        '& .MuiCircularProgress-circle': {
                          strokeLinecap: 'round',
                        }
                      }} 
                    />
                  ) : (
                    <Send />
                  )}
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              backgroundColor: 'white',
            }
          }}
        />
      </Box>
    </Box>
  );
};

export default RosterCopilot;
