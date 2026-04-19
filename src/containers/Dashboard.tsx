import { useState } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Chip,
  OutlinedInput,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Link,
} from "@mui/material";
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import {
  People,
  Bed,
  CalendarMonth,
  Refresh,
  TransferWithinAStation,
} from "@mui/icons-material";
import { useDashboardData } from "../api/dashboard.hooks";
import { useAuth } from "../contexts/AuthContext";
import WardTransferComponent from "../components/WardTransfer";
import { useWardTransfersByWard } from "../api/wardTransfer.hooks";
import { useStaffList } from "../api/hooks";
import type { Staff } from "../api/types";

const Dashboard = () => {
  const { user } = useAuth();
  // Get today's date in the format YYYY-MM-DD
  const today = new Date().toISOString().split('T')[0];

  // Filter state
  const [filters, setFilters] = useState({
    date: new Date(today),
    shift: "M", // Default to Morning shift
  });

  // Ward performance filter state - now multiselect
  const [wardPerformanceFilter, setWardPerformanceFilter] = useState<string[]>([]);
  
  // Ward transfer modal state
  const [wardTransferOpen, setWardTransferOpen] = useState(false);
  
  // Ward transfers modal state
  const [wardTransfersModalOpen, setWardTransfersModalOpen] = useState(false);
  const [selectedWardId, setSelectedWardId] = useState<string | null>(null);
  const [selectedWardName, setSelectedWardName] = useState<string>("");
  const [transferDirection, setTransferDirection] = useState<'in' | 'out' | 'all'>('all');

  // Use the dashboard API hook
  const { data: dashboardData, isLoading, error, refetch } = useDashboardData(
    user?.org_id || "",
    filters.date.toISOString().split('T')[0],
    filters.shift
  );

  // Fetch ward transfers when a ward is selected
  const { data: wardTransfersData, isLoading: loadingWardTransfers } = useWardTransfersByWard(
    selectedWardId || "",
    wardTransfersModalOpen && !!selectedWardId
  );

  // Fetch staff and wards for display
  const { data: staffData } = useStaffList(1, 1000); // Fetch first page with large limit for dashboard
  const staffList = staffData?.items || [];

  // Debug logging
  console.log('Dashboard Debug:', {
    isLoading,
    error,
    dashboardData,
    filters: {
      date: filters.date.toISOString().split('T')[0],
      shift: filters.shift
    }
  });

  const handleRefresh = () => {
    refetch();
  };

  // Helper function to format date as dd/mm/yyyy
  const formatDateDDMMYYYY = (date: Date): string => {
    return format(date, 'dd/MM/yyyy');
  };

  // Filter ward performance data based on selected wards
  const filteredWardPerformance = dashboardData?.ward_performance?.filter(ward => {
    if (wardPerformanceFilter.length === 0) return true;
    return wardPerformanceFilter.some(selectedWard => 
      ward.ward_name.toLowerCase().includes(selectedWard.toLowerCase())
    );
  }) || [];

  // Get unique ward names for the dropdown
  const uniqueWardNames = [...new Set(dashboardData?.ward_performance?.map(ward => ward.ward_name) || [])];

  const getStatusColor = (status: string) => {
    // Handle different status formats
    if (status.toLowerCase().includes('high') || status.toLowerCase().includes('over')) {
      return "#EF4444";
    } else if (status.toLowerCase().includes('medium') || status.toLowerCase().includes('moderate')) {
      return "#F59E0B";
    } else if (status.toLowerCase().includes('low') || status.toLowerCase().includes('under')) {
      return "#10B981";
    } else if (status.toLowerCase().includes('n/a') || status.toLowerCase().includes('na')) {
      return "#6B7280";
    }
    return "#6B7280";
  };

  const getDeficitSurplusColor = (deficitSurplus: string) => {
    const value = parseInt(deficitSurplus);
    if (value < 0) return "#EF4444"; // Red for deficit
    if (value > 0) return "#10B981"; // Green for surplus
    return "#6B7280"; // Gray for neutral
  };

  const getOccupancyColor = (occupancy: string) => {
    const occupancyLower = occupancy.toLowerCase();
    if (occupancyLower.includes('high') || occupancyLower.includes('over')) {
      return "#EF4444"; // Red for high occupancy
    } else if (occupancyLower.includes('medium') || occupancyLower.includes('moderate')) {
      return "#F59E0B"; // Orange for medium occupancy
    } else if (occupancyLower.includes('low') || occupancyLower.includes('under')) {
      return "#10B981"; // Green for low occupancy
    } else if (occupancyLower.includes('n/a') || occupancyLower.includes('na')) {
      return "#6B7280"; // Gray for N/A
    }
    return "#1F2937"; // Default color for other values
  };

  const handleWardTransfersClick = (wardId: string, wardName: string, direction: 'in' | 'out' | 'all' = 'all') => {
    setSelectedWardId(wardId);
    setSelectedWardName(wardName);
    setTransferDirection(direction);
    setWardTransfersModalOpen(true);
  };

  const getWardName = (wardId: string) => {
    // Try to find ward name from dashboard data
    const ward = dashboardData?.ward_performance?.find(w => w.ward_id === wardId);
    return ward?.ward_name || wardId;
  };

  const getStaffName = (staffId: string) => {
    const staff = staffList.find((s: Staff) => (s._id || s.id) === staffId);
    return staff ? `${staff.name} (${staff.emp_id}) - ${staff.grade}` : staffId;
  };

  const getShiftName = (code: string) => {
    const shiftMap: { [key: string]: string } = {
      M: "Morning",
      E: "Evening",
      N: "Night",
      ME: "Morning-Evening",
      G: "General",
    };
    return shiftMap[code] || code;
  };

  const getTransferStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "applied":
        return "success";
      case "pending":
        return "warning";
      case "rejected":
        return "error";
      default:
        return "default";
    }
  };

  return (
    <Box sx={{ 
      p: 3,
      backgroundColor: "#F9FAFB",
      minHeight: "100vh",
      width: "100%",
      position: "relative"
    }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight="bold" color="#1F2937">
          Dashboard
        </Typography>
        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="body2" color="#6B7280">
            Last updated: 1 min ago
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Refresh />}
            onClick={handleRefresh}
            sx={{
              borderColor: "#D1D5DB",
              color: "#6B7280",
              textTransform: "none",
              '&:hover': {
                borderColor: "#9CA3AF",
                backgroundColor: "#F9FAFB"
              }
            }}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Box sx={{ 
        backgroundColor: '#FFFFFF',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        borderRadius: 2,
        p: 3,
        mb: 3
      }}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Grid container spacing={3} alignItems="center">
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <DatePicker
                label="Select Date"
                value={filters.date}
                onChange={(newValue) => {
                  if (newValue) {
                    setFilters(prev => ({ ...prev, date: newValue }));
                  }
                }}
                format="dd/MM/yyyy"
                slotProps={{
                  textField: {
                    fullWidth: true,
                    size: "small",
                    sx: {
                      '& .MuiOutlinedInput-root': {
                        height: 40,
                        borderRadius: 2,
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#D1D5DB'
                        }
                      }
                    }
                  }
                }}
              />
            </Grid>
          
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Shift</InputLabel>
                <Select
                  value={filters.shift}
                  label="Shift"
                  onChange={(e) => setFilters(prev => ({ ...prev, shift: e.target.value }))}
                  sx={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 2,
                    height: 40,
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#D1D5DB'
                    }
                  }}
                >
                  <MenuItem value="M">Morning</MenuItem>
                  <MenuItem value="E">Evening</MenuItem>
                  <MenuItem value="N">Night</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </LocalizationProvider>
      </Box>

      {/* Content Area - Shows loading/error states or actual content */}
      {isLoading ? (
        <Box sx={{ 
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          py: 8,
          minHeight: 400
        }}>
          <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
            <CircularProgress />
            <Typography variant="body2" color="#6B7280">
              Loading dashboard data...
            </Typography>
            <Typography variant="caption" color="#9CA3AF">
              Fetching data for {formatDateDDMMYYYY(filters.date)} - {filters.shift} shift
            </Typography>
          </Box>
        </Box>
      ) : error ? (
        <Box sx={{ py: 4 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            Failed to load dashboard data. Please try again.
          </Alert>
          <Typography variant="body2" color="#6B7280" sx={{ mb: 2 }}>
            Error: {error.message}
          </Typography>
          <Button variant="contained" onClick={handleRefresh}>
            Retry
          </Button>
        </Box>
      ) : !dashboardData ? (
        <Box sx={{ py: 4 }}>
          <Typography variant="h6" color="#6B7280">
            No dashboard data available
          </Typography>
        </Box>
      ) : (
        <>
          {/* KPI Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Card sx={{ 
                height: '100%',
                backgroundColor: '#FFFFFF',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                borderRadius: 2
              }}>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="h4" fontWeight="bold" color="#1F2937">
                        {dashboardData.kpis.total_patients}
                      </Typography>
                      <Typography variant="body2" color="#6B7280">
                        No. of Patients
                      </Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: '#F3F4F6', width: 56, height: 56 }}>
                      <People sx={{ color: '#9CA3AF' }} />
                    </Avatar>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Card sx={{ 
                height: '100%',
                backgroundColor: '#FFFFFF',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                borderRadius: 2
              }}>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="h4" fontWeight="bold" color="#EF4444">
                        {dashboardData.kpis.bed_occupancy_percentage.toFixed(1)}%
                      </Typography>
                      <Typography variant="body2" color="#6B7280">
                        Bed Occupancy
                      </Typography>
                      <Typography variant="caption" color="#EF4444" sx={{ fontWeight: 500 }}>
                        {dashboardData.kpis.occupancy_status}
                      </Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: '#F3F4F6', width: 56, height: 56 }}>
                      <Bed sx={{ color: '#9CA3AF' }} />
                    </Avatar>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ 
                height: '100%',
                backgroundColor: '#FFFFFF',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                borderRadius: 2
              }}>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="h4" fontWeight="bold" color="#F59E0B">
                        {dashboardData.kpis.live_rosters}
                      </Typography>
                      <Typography variant="body2" color="#6B7280">
                        Live Rosters
                      </Typography>
                      <Typography variant="caption" color="#F59E0B" sx={{ fontWeight: 500 }}>
                        Active Rosters
                      </Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: '#F3F4F6', width: 56, height: 56 }}>
                      <LocalHospital sx={{ color: '#9CA3AF' }} />
                    </Avatar>
                  </Box>
                </CardContent>
              </Card>
            </Grid> */}

            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Card sx={{ 
                height: '100%',
                backgroundColor: '#FFFFFF',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                borderRadius: 2
              }}>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="h4" fontWeight="bold" color="#1F2937">
                        {dashboardData.kpis.active_wards} Wards
                      </Typography>
                      <Typography variant="body2" color="#6B7280">
                        Active Wards
                      </Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: '#F3F4F6', width: 56, height: 56 }}>
                      <CalendarMonth sx={{ color: '#9CA3AF' }} />
                    </Avatar>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Main Content - Full Width Ward Performance */}
          <Grid container spacing={3}>
            {/* Ward Performance - Full Width */}
            <Grid size={{ xs: 12 }}>
              <Card sx={{ 
                backgroundColor: '#FFFFFF',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                borderRadius: 2,
                height: '100%'
              }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                    <Box>
                      <Typography variant="h6" fontWeight="bold" color="#1F2937">
                        Ward Performance
                      </Typography>
                      <Typography variant="caption" color="#6B7280">
                        Showing {filteredWardPerformance.length} of {dashboardData?.ward_performance?.length || 0} wards
                      </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<TransferWithinAStation />}
                        onClick={() => setWardTransferOpen(true)}
                        sx={{
                          textTransform: "none",
                          backgroundColor: "#14B8A6",
                          '&:hover': {
                            backgroundColor: "#0F766E"
                          }
                        }}
                      >
                        Ward Transfer
                      </Button>
                      <FormControl size="small" sx={{ minWidth: 200 }}>
                      <InputLabel>Choose Wards</InputLabel>
                      <Select
                        multiple
                        value={wardPerformanceFilter}
                        label="Choose Wards"
                        onChange={(e) => setWardPerformanceFilter(e.target.value as string[])}
                        input={<OutlinedInput label="Choose Wards" />}
                        renderValue={(selected) => (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selected.map((value) => (
                              <Chip key={value} label={value} size="small" />
                            ))}
                          </Box>
                        )}
                        sx={{
                          backgroundColor: '#F9FAFB',
                          borderRadius: 2
                        }}
                      >
                        {uniqueWardNames.map((wardName, index) => (
                          <MenuItem key={index} value={wardName}>
                            {wardName}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    </Box>
                  </Box>
                  
                  <TableContainer sx={{ maxHeight: 500, overflow: 'auto' }}>
                    <Table stickyHeader>
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#F9FAFB' }}>
                          <TableCell sx={{ fontWeight: 'bold', color: '#1F2937' }}>WARD NAME</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', color: '#1F2937' }}>SHIFT PATIENTS</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', color: '#1F2937' }}>SHIFT NURSES</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', color: '#1F2937' }}>BEDS AVAILABLE</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', color: '#1F2937' }}>BED OCCUPANCY</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', color: '#1F2937' }}>IDEAL OCCUPANCY</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', color: '#1F2937' }}>NURSE UTILIZATION</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', color: '#1F2937' }}>DEFICIT/SURPLUS</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', color: '#1F2937' }}>TRANSFERS IN</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', color: '#1F2937' }}>TRANSFERS OUT</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredWardPerformance.length > 0 ? (
                          filteredWardPerformance.map((ward, index) => (
                            <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                              <TableCell sx={{ fontWeight: 500 }}>{ward.ward_name}</TableCell>
                              <TableCell>{ward.shift_patients}</TableCell>
                              <TableCell>{ward.shift_nurses}</TableCell>
                              <TableCell>
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    color: "#1F2937",
                                    fontWeight: 500 
                                  }}
                                >
                                  {ward.beds_available ?? 'N/A'}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    color: getOccupancyColor(ward.occupancy),
                                    fontWeight: 500 
                                  }}
                                >
                                  {ward.occupancy}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    color: "#1F2937",
                                    fontWeight: 500 
                                  }}
                                >
                                  {ward.ideal_ratio}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    color: getStatusColor(ward.nurse_utilization),
                                    fontWeight: 500 
                                  }}
                                >
                                  {ward.nurse_utilization}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    color: getDeficitSurplusColor(ward.deficit_surplus),
                                    fontWeight: 500 
                                  }}
                                >
                                  {ward.deficit_surplus}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                {ward.transfers_in !== undefined && ward.transfers_in > 0 ? (
                                  <Link
                                    component="button"
                                    variant="body2"
                                    onClick={() => handleWardTransfersClick(ward.ward_id, ward.ward_name, 'in')}
                                    sx={{
                                      color: '#14B8A6',
                                      fontWeight: 500,
                                      textDecoration: 'none',
                                      cursor: 'pointer',
                                      '&:hover': {
                                        textDecoration: 'underline',
                                        color: '#0F766E'
                                      }
                                    }}
                                  >
                                    {ward.transfers_in}
                                  </Link>
                                ) : (
                                  <Typography variant="body2" sx={{ color: '#9CA3AF' }}>
                                    {ward.transfers_in ?? 0}
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell>
                                {ward.transfers_out !== undefined && ward.transfers_out > 0 ? (
                                  <Link
                                    component="button"
                                    variant="body2"
                                    onClick={() => handleWardTransfersClick(ward.ward_id, ward.ward_name, 'out')}
                                    sx={{
                                      color: '#14B8A6',
                                      fontWeight: 500,
                                      textDecoration: 'none',
                                      cursor: 'pointer',
                                      '&:hover': {
                                        textDecoration: 'underline',
                                        color: '#0F766E'
                                      }
                                    }}
                                  >
                                    {ward.transfers_out}
                                  </Link>
                                ) : (
                                  <Typography variant="body2" sx={{ color: '#9CA3AF' }}>
                                    {ward.transfers_out ?? 0}
                                  </Typography>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={10} align="center" sx={{ color: '#9CA3AF', py: 4 }}>
                              {wardPerformanceFilter.length === 0 
                                ? "No ward performance data available" 
                                : `No wards found matching selected filters`
                              }
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>

          </Grid>
        </>
      )}
      
      {/* Ward Transfer Modal */}
      <WardTransferComponent
        open={wardTransferOpen}
        onClose={() => setWardTransferOpen(false)}
      />

      {/* Ward Transfers Modal */}
      <Dialog 
        open={wardTransfersModalOpen} 
        onClose={() => {
          setWardTransfersModalOpen(false);
          setSelectedWardId(null);
          setSelectedWardName("");
          setTransferDirection('all');
        }} 
        maxWidth="lg" 
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <TransferWithinAStation />
            <Typography variant="h6">
              {transferDirection === 'in' ? 'Transfers In' : transferDirection === 'out' ? 'Transfers Out' : 'Transfers'} for {selectedWardName}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {loadingWardTransfers ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : !wardTransfersData?.data?.transfers || wardTransfersData.data.transfers.length === 0 ? (
            <Alert severity="info">No transfers found for this ward</Alert>
          ) : (
            <TableContainer component={Paper} sx={{ maxHeight: 500 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold" }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Staff</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>From Ward</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>To Ward</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>From Shift</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>To Shift</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Remarks</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {wardTransfersData.data.transfers
                    .filter((transfer) => {
                      if (transferDirection === 'all') return true;
                      // For transfers_in, we want transfers where to_ward_id matches the selected ward
                      if (transferDirection === 'in') return transfer.to_ward_id === selectedWardId;
                      // For transfers_out, we want transfers where from_ward_id matches the selected ward
                      if (transferDirection === 'out') return transfer.from_ward_id === selectedWardId;
                      return true;
                    })
                    .map((transfer) => (
                    <TableRow key={transfer.id}>
                      <TableCell>
                        {format(new Date(transfer.transfer_date), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>{getStaffName(transfer.staff_id)}</TableCell>
                      <TableCell>{getWardName(transfer.from_ward_id)}</TableCell>
                      <TableCell>{getWardName(transfer.to_ward_id)}</TableCell>
                      <TableCell>{getShiftName(transfer.from_shift)}</TableCell>
                      <TableCell>{getShiftName(transfer.to_shift)}</TableCell>
                      <TableCell>
                        <Chip
                          label={transfer.status}
                          color={getTransferStatusColor(transfer.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {transfer.remarks || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setWardTransfersModalOpen(false);
            setSelectedWardId(null);
            setSelectedWardName("");
            setTransferDirection('all');
          }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Dashboard;
