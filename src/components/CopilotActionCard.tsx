import { Paper, Typography, Button, CircularProgress, Box } from "@mui/material";
import MarkdownRenderer from "./MarkdownRenderer";
import { usePatchRoster } from "../api/hooks";
import type { RosterPatchRequest } from "../api/types";

export type CopilotAction = {
  id: string;
  message: string;
  changeType: "swap" | "remove" | "assign" | "constraint";
  target: {
    staffId?: string;
    shift?: string;
    day?: number;
  };
  apiEndpoint: string;
  payload: {
    reason: string;
    confidence: number;
    status: "rejected" | "applied" | "optional";
    options: Array<{
      option_id: string;
      title: string;
      patches: Array<{
        op: "replace" | "add" | "remove";
        path: string;
        value: string;
      }>;
    }>;
    impact_score: number;
    constraints_violated: string[];
    notes: string;
  };
  rosterId?: string;
};

type Props = {
  action: CopilotAction;
  onResolve: (id: string, accepted: boolean) => void;
};

const CopilotActionCard = ({ action, onResolve }: Props) => {
  const patchRosterMutation = usePatchRoster();

  const handleOptionSelect = async (option: typeof action.payload.options[0]) => {
    if (action.rosterId && option.patches.length > 0) {
      try {
        const patchPayload: RosterPatchRequest = {
          patches: option.patches
        };

        await patchRosterMutation.mutateAsync({
          roster_id: action.rosterId,
          payload: patchPayload
        });
      } catch (err) {
        console.error("API call failed", err);
        // Still resolve the action even if API call fails
      }
    }
    onResolve(action.id, true);
  };

  const handleDismiss = () => {
    onResolve(action.id, false);
  };

  // Determine if this suggestion has options available
  const hasOptions = action.payload.options.length > 0;

  return (
    <Paper sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: "grey.50" }}>
      <Typography variant="body1" gutterBottom>
        {action.message}
      </Typography>
      
      {/* Show reason */}
      {action.payload.reason && (
        <Box sx={{ mb: 1 }}>
          <MarkdownRenderer content={action.payload.reason} />
        </Box>
      )}
      
      {/* Show confidence for actionable suggestions */}
      {action.payload.confidence && hasOptions && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          Confidence: {Math.round(action.payload.confidence * 100)}%
        </Typography>
      )}
      
      {/* Show options if available */}
      {hasOptions && (
        <Box sx={{ mb: 2 }}>
          {action.payload.options.map((option) => (
            <Box key={option.option_id} sx={{ mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 0.5 }}>
                {option.title}
              </Typography>
              <Button
                variant="contained"
                color="primary"
                size="small"
                onClick={() => handleOptionSelect(option)}
                disabled={patchRosterMutation.isPending}
                sx={{ mr: 1 }}
              >
                {patchRosterMutation.isPending ? <CircularProgress size={16} /> : "Apply"}
              </Button>
            </Box>
          ))}
        </Box>
      )}
      
      {/* Show notes if available */}
      {action.payload.notes && (
        <Box sx={{ mb: 1 }}>
          <MarkdownRenderer content={action.payload.notes} />
        </Box>
      )}
      
      {/* Always show dismiss button */}
      <Button
        variant="outlined"
        color="secondary"
        size="small"
        onClick={handleDismiss}
        disabled={patchRosterMutation.isPending}
      >
        Dismiss
      </Button>
    </Paper>
  );
};

export default CopilotActionCard;