import { Box, Chip, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";

interface ShiftTemplate {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  department: string;
  maxStaff: number;
}

interface ShiftTemplatesProps {
  shifts: ShiftTemplate[];
}

const ShiftTemplates = ({ shifts }: ShiftTemplatesProps) => {
  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold" color="#1F2937">
          Shift Templates
        </Typography>
        <Box />
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#F9FAFB' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>Shift Name</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Start Time</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>End Time</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Department</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Max Staff</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {shifts.map((shift) => (
              <TableRow key={shift.id} hover>
                <TableCell>{shift.name}</TableCell>
                <TableCell>{shift.startTime}</TableCell>
                <TableCell>{shift.endTime}</TableCell>
                <TableCell>{shift.department}</TableCell>
                <TableCell>
                  <Chip 
                    label={shift.maxStaff} 
                    size="small" 
                    sx={{ backgroundColor: '#E0F2FE', color: '#14B8A6' }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
};

export default ShiftTemplates;


