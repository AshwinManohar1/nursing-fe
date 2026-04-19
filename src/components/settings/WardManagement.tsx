import { Alert, Box, Button, Chip, CircularProgress, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, IconButton } from "@mui/material";
import { Add, Delete, Edit } from "@mui/icons-material";

export interface Ward {
  _id: string;
  id?: string; // For backward compatibility
  name: string;
  description?: string;
  total_beds: number;
  no_of_beds?: number; // For backward compatibility
  bed_nurse_ratio: number | string; // Can be number or "X:1" format
  bed_to_nurse_ratio?: number | string; // For backward compatibility
  created_at?: string;
  hospital_id?: string;
  updated_at?: string;
}

interface WardManagementProps {
  wardError: string | null;
  onAddWard: () => void;
  wards: Ward[];
  isLoadingWards: boolean;
  formatRatio: (value: number | string) => string;
  onEditWard: (ward: Ward) => void;
  onDeleteWard: (id: string) => void;
}

const WardManagement = ({ wardError, onAddWard, wards, isLoadingWards, formatRatio, onEditWard, onDeleteWard }: WardManagementProps) => {
  return (
    <>
      {wardError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {wardError}
        </Alert>
      )}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold" color="#1F2937">
          Ward Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={onAddWard}
          sx={{
            backgroundColor: '#14B8A6',
            '&:hover': { backgroundColor: '#0F766E' }
          }}
        >
          Add Ward
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#F9FAFB' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>Ward Name</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Description</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Beds</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Bed:Nurse</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoadingWards ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            ) : wards.map((ward) => (
              <TableRow key={ward._id || ward.id} hover>
                <TableCell>{ward.name}</TableCell>
                <TableCell>{ward.description}</TableCell>
                <TableCell>
                  <Chip 
                    label={ward.total_beds || ward.no_of_beds} 
                    size="small" 
                    sx={{ backgroundColor: '#E0F2FE', color: '#14B8A6' }}
                  />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={formatRatio(ward.bed_nurse_ratio || ward.bed_to_nurse_ratio || 0)}
                    size="small" 
                    sx={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}
                  />
                </TableCell>
                <TableCell>
                  <IconButton 
                    size="small" 
                    onClick={() => onEditWard(ward)}
                    sx={{ color: '#14B8A6' }}
                  >
                    <Edit />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    onClick={() => onDeleteWard(ward._id || ward.id || '')}
                    sx={{ color: '#EF4444' }}
                  >
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
};

export default WardManagement;


