import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import {
  ExpandMore,
  CheckCircle,
  Warning,
  Cancel,
  RadioButtonUnchecked,
  RadioButtonChecked,
} from "@mui/icons-material";
import { useState } from "react";
import type { RosterModificationWidgetData, RosterPatch, RosterSuggestion } from "../api/types";

interface RosterSuggestionCardProps {
  widgetData: RosterModificationWidgetData;
  onApplyOption: (patches: RosterPatch[]) => void;
  onCancel: () => void;
}

const RosterSuggestionCard = ({ 
  widgetData, 
  onApplyOption, 
  onCancel
}: RosterSuggestionCardProps) => {
  const { primary_action, alternatives, metadata } = widgetData;
  const [selectedAlternative, setSelectedAlternative] = useState<RosterSuggestion | null>(null);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return '#10B981'; // Green
    if (confidence >= 0.6) return '#F59E0B'; // Orange
    return '#EF4444'; // Red
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  const handleApplyPrimary = () => {
    if (!primary_action || !primary_action.patches || primary_action.patches.length === 0) {
      onCancel();
      return;
    }
    onApplyOption(primary_action.patches);
  };

  const handleApplyAlternative = (alternative: RosterSuggestion) => {
    if (!alternative || !alternative.patches || alternative.patches.length === 0) {
      return;
    }
    // Combine primary action patches with selected alternative patches
    const combinedPatches = [
      ...(primary_action?.patches || []),
      ...alternative.patches
    ];
    onApplyOption(combinedPatches);
  };

  if (!primary_action) {
    return null;
  }

  return (
    <Card sx={{ 
      mb: 2, 
      border: '1px solid #E5E7EB',
      borderRadius: 2,
      backgroundColor: '#FEFEFE',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <CardContent sx={{ p: 2.5 }}>
        {/* Primary Action Header */}
        <Box sx={{ mb: 2 }}>
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <Typography variant="subtitle1" fontWeight="bold" color="#1F2937">
              {primary_action.title}
            </Typography>
            <Chip
              label={`${getConfidenceLabel(primary_action.confidence)}`}
              size="small"
              sx={{
                backgroundColor: getConfidenceColor(primary_action.confidence),
                color: 'white',
                fontWeight: 'bold',
                fontSize: '0.7rem',
                height: 20,
                ml: 'auto'
              }}
            />
          </Box>
          
          <Typography variant="body2" color="#6B7280" sx={{ mb: 1.5, fontSize: '0.85rem' }}>
            {primary_action.description}
          </Typography>
        </Box>

        {/* Constraints Violated Dropdown */}
        {metadata?.constraints_violated && metadata.constraints_violated.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Accordion sx={{ 
              boxShadow: 'none', 
              border: '1px solid #FEE2E2',
              borderRadius: 1,
              '&:before': { display: 'none' },
              '&.Mui-expanded': {
                margin: 0
              }
            }}>
              <AccordionSummary
                expandIcon={<ExpandMore sx={{ fontSize: 16 }} />}
                sx={{ 
                  backgroundColor: '#FEFEFE',
                  minHeight: 'auto',
                  '& .MuiAccordionSummary-content': { 
                    margin: '8px 0',
                    alignItems: 'center'
                  }
                }}
              >
                <Box display="flex" alignItems="center" gap={1}>
                  <Warning sx={{ color: '#DC2626', fontSize: 16 }} />
                  <Typography variant="caption" fontWeight="bold" color="#DC2626">
                    Constraints Violated ({metadata.constraints_violated.length})
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ 
                backgroundColor: '#FEFEFE',
                pt: 0,
                pb: 1.5
              }}>
                <List dense>
                  {metadata.constraints_violated.map((constraint, index) => (
                    <ListItem key={index} sx={{ px: 0, py: 0.25 }}>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Box
                              sx={{
                                width: 3,
                                height: 3,
                                borderRadius: '50%',
                                backgroundColor: '#DC2626'
                              }}
                            />
                            <Typography variant="caption" color="#374151">
                              {constraint}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          </Box>
        )}

        {/* Alternatives Section */}
        {alternatives && alternatives.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" fontWeight="bold" color="#1F2937" sx={{ mb: 1.5 }}>
              Coverage Alternatives ({alternatives.length} options):
            </Typography>
            {alternatives.map((alternative, index) => {
              const isSelected = selectedAlternative === alternative;
              return (
                <Card 
                  key={index}
                  sx={{ 
                    mb: 1.5, 
                    border: isSelected ? '2px solid #14B8A6' : '1px solid #E5E7EB',
                    borderRadius: 1.5,
                    backgroundColor: isSelected ? '#F0FDFA' : '#FEFEFE',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: isSelected ? '#14B8A6' : '#9CA3AF',
                      backgroundColor: isSelected ? '#F0FDFA' : '#F9FAFB'
                    }
                  }}
                  onClick={() => {
                    // Toggle selection: if clicking the same alternative, deselect it
                    if (isSelected) {
                      setSelectedAlternative(null);
                    } else {
                      setSelectedAlternative(alternative);
                    }
                  }}
                >
                <CardContent sx={{ p: 2 }}>
                  <Box display="flex" alignItems="flex-start" gap={1.5}>
                    <Box sx={{ mt: 0.5 }}>
                      {isSelected ? (
                        <RadioButtonChecked sx={{ color: '#14B8A6', fontSize: 20 }} />
                      ) : (
                        <RadioButtonUnchecked sx={{ color: '#9CA3AF', fontSize: 20 }} />
                      )}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <Typography variant="subtitle2" fontWeight="bold" color="#1F2937">
                          {alternative.title}
                        </Typography>
                        <Chip
                          label={`${getConfidenceLabel(alternative.confidence)}`}
                          size="small"
                          sx={{
                            backgroundColor: getConfidenceColor(alternative.confidence),
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '0.65rem',
                            height: 18
                          }}
                        />
                      </Box>
                      <Typography variant="body2" color="#6B7280" sx={{ mb: 1.5, fontSize: '0.8rem' }}>
                        {alternative.description}
                      </Typography>
                      {alternative.constraints_violated && alternative.constraints_violated.length > 0 && (
                        <Box sx={{ mb: 1 }}>
                          <Typography variant="caption" color="#DC2626" fontWeight="bold">
                            Constraints Violated: {alternative.constraints_violated.join(', ')}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
              );
            })}
          </Box>
        )}

        {/* Action Buttons */}
        <Box display="flex" gap={1.5} justifyContent="flex-end">
          <Button
            variant="outlined"
            onClick={onCancel}
            startIcon={<Cancel sx={{ fontSize: 16 }} />}
            size="small"
            sx={{
              borderColor: '#D1D5DB',
              color: '#6B7280',
              '&:hover': {
                borderColor: '#9CA3AF',
                backgroundColor: '#F9FAFB'
              },
              textTransform: 'none',
              fontWeight: 'bold',
              fontSize: '0.8rem',
              px: 2
            }}
          >
            Cancel
          </Button>
          
          {/* Primary Action Button */}
          <Button
            variant="contained"
            onClick={handleApplyPrimary}
            startIcon={<CheckCircle sx={{ fontSize: 16 }} />}
            size="small"
            sx={{
              backgroundColor: metadata?.override_allowed ? '#EF4444' : '#14B8A6',
              '&:hover': { 
                backgroundColor: metadata?.override_allowed ? '#DC2626' : '#0F766E' 
              },
              textTransform: 'none',
              fontWeight: 'bold',
              fontSize: '0.8rem',
              px: 2
            }}
          >
            {primary_action.button_text}
          </Button>

          {/* Selected Alternative Apply Button */}
          {selectedAlternative && (
            <Button
              variant="contained"
              onClick={() => handleApplyAlternative(selectedAlternative)}
              startIcon={<CheckCircle sx={{ fontSize: 16 }} />}
              size="small"
              sx={{
                backgroundColor: '#059669',
                '&:hover': { 
                  backgroundColor: '#047857' 
                },
                textTransform: 'none',
                fontWeight: 'bold',
                fontSize: '0.8rem',
                px: 2
              }}
            >
              {selectedAlternative.button_text || 'Apply Alternative'}
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default RosterSuggestionCard;
