import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Chip,
  Grid,
  Tabs,
  Tab,
  TextField,
} from "@mui/material";
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, subDays, isWithinInterval, parseISO } from 'date-fns';
import { TransferWithinAStation } from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { useWardTransfers, useCreateWardTransfer } from "../api/hooks";
import { useStaffList } from "../api/hooks";
import { fetchWards } from "../api";
import { useRosters } from "../api/hooks";
import type { CreateWardTransferRequest, Roster, Staff } from "../api/types";

interface WardTransferProps {
  open: boolean;
  onClose: () => void;
}

interface Ward {
  _id?: string;
  id?: string;
  name: string;
}

const LEAVE_CODES = new Set(['OFF', 'PL', 'CL', 'LWP', 'SL', 'PREF']);

const WardTransferComponent = ({ open, onClose }: WardTransferProps) => {
  const { user } = useAuth();
  const hospitalId = user?.org_id || "";

  // Form state
  const [formData, setFormData] = useState<CreateWardTransferRequest>({
    staff_id: "",
    hospital_id: hospitalId,
    transfer_date: "",
    from_shift: "",
    to_shift: "",
    from_ward_id: "",
    to_ward_id: "",
    created_by: user?.id || "",
    remarks: "",
  });

  const [transferDate, setTransferDate] = useState<Date | null>(null);
  const [wards, setWards] = useState<Ward[]>([]);
  const [loadingWards, setLoadingWards] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);

  // Fetch data
  const { data: transfersData, isLoading: loadingTransfers, refetch: refetchTransfers } = useWardTransfers(hospitalId);
  const { data: staffData } = useStaffList(1, 1000); // Fetch first page with large limit for ward transfer
  const staffList = staffData?.items || [];
  const { data: rosters } = useRosters();
  const createTransferMutation = useCreateWardTransfer();

  const rostersByWard = useMemo(() => {
    const map = new Map<string, Roster[]>();
    (rosters || []).forEach((roster) => {
      const wardId = roster?.roster_input?.ward_id;
      if (!wardId) return;
      if (!map.has(wardId)) {
        map.set(wardId, []);
      }
      map.get(wardId)!.push(roster);
    });
    return map;
  }, [rosters]);

  // Filter wards that have active rosters
  const wardsWithActiveRosters = useMemo(() => {
    if (!wards.length) return [];
    return wards.filter((ward) => {
      const wardId = ward._id || ward.id;
      return !!(wardId && rostersByWard.has(wardId));
    });
  }, [wards, rostersByWard]);

  const transferDateObj = useMemo(() => {
    if (!formData.transfer_date) return null;
    return new Date(`${formData.transfer_date}T00:00:00`);
  }, [formData.transfer_date]);

  const fromWardRosterContext = useMemo(() => {
    if (!formData.from_ward_id || !transferDateObj) return null;
    const wardRosters = rostersByWard.get(formData.from_ward_id) || [];
    if (wardRosters.length === 0) return null;

    const rosterForDate = wardRosters.find((roster) => {
      const startDateStr = roster?.roster_input?.meta?.schedule_start_date;
      const endDateStr = roster?.roster_input?.meta?.schedule_end_date;
      if (!startDateStr || !endDateStr) return false;
      const startDate = new Date(`${startDateStr}T00:00:00`);
      const endDate = new Date(`${endDateStr}T00:00:00`);
      return transferDateObj >= startDate && transferDateObj <= endDate;
    });
    if (!rosterForDate) return null;

    const rosterStartDateStr = rosterForDate.roster_input?.meta?.schedule_start_date;
    if (!rosterStartDateStr) return null;

    const rosterStartDate = new Date(`${rosterStartDateStr}T00:00:00`);
    const totalDays =
      rosterForDate.roster_input?.meta?.total_days ??
      (() => {
        const endStr = rosterForDate.roster_input?.meta?.schedule_end_date;
        if (!endStr) return 0;
        const endDate = new Date(`${endStr}T00:00:00`);
        return Math.round((endDate.getTime() - rosterStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      })();

    if (!totalDays) return null;

    const dayIndex = Math.floor((transferDateObj.getTime() - rosterStartDate.getTime()) / (1000 * 60 * 60 * 24));
    if (dayIndex < 0 || dayIndex >= totalDays) return null;

    return {
      roster: rosterForDate,
      dayIndex,
      dayKey: dayIndex.toString(),
    };
  }, [formData.from_ward_id, transferDateObj, rostersByWard]);

  const staffAssignedToFromWard = useMemo(() => {
    if (!formData.from_ward_id || !staffList) return [];
    return staffList.filter((staff: Staff) => (staff.ward_id || []).includes(formData.from_ward_id));
  }, [formData.from_ward_id, staffList]);

  // Filter staff by selected from_ward and check if they're active on the selected date
  const filteredStaff = useMemo(() => {
    if (!formData.from_ward_id || !staffList) return [];
    if (!transferDateObj || !fromWardRosterContext) {
      return staffAssignedToFromWard;
    }

    const { roster, dayKey } = fromWardRosterContext;
    return staffAssignedToFromWard.filter((staff: Staff) => {
      const staffRoster = roster.roster?.[staff.emp_id];
      if (!staffRoster) return false;
      const dayShifts = staffRoster[dayKey] || [];
      if (dayShifts.length === 0) return false;
      return dayShifts.every((shiftCode) => !LEAVE_CODES.has(shiftCode));
    });
  }, [formData.from_ward_id, staffAssignedToFromWard, fromWardRosterContext, staffList, transferDateObj]);

  // Get available dates where both wards have rosters
  const availableDates = useMemo(() => {
    if (!formData.from_ward_id || !formData.to_ward_id) return null;

    const fromWardRosters = rostersByWard.get(formData.from_ward_id) || [];
    const toWardRosters = rostersByWard.get(formData.to_ward_id) || [];

    if (!fromWardRosters.length || !toWardRosters.length) return null;

    const buildDateRanges = (rosterList: Roster[]) =>
      rosterList
        .map((roster) => {
          const startDate = roster?.roster_input?.meta?.schedule_start_date;
          const endDate = roster?.roster_input?.meta?.schedule_end_date;
          if (!startDate || !endDate) return null;
          return {
            start: parseISO(startDate),
            end: parseISO(endDate),
          };
        })
        .filter((range): range is { start: Date; end: Date } => !!range);

    const fromRanges = buildDateRanges(fromWardRosters);
    const toRanges = buildDateRanges(toWardRosters);

    const overlappingRanges: Array<{ start: Date; end: Date }> = [];
    fromRanges.forEach((fromRange) => {
      toRanges.forEach((toRange) => {
        const overlapStart = fromRange.start > toRange.start ? fromRange.start : toRange.start;
        const overlapEnd = fromRange.end < toRange.end ? fromRange.end : toRange.end;
        if (overlapStart <= overlapEnd) {
          overlappingRanges.push({ start: overlapStart, end: overlapEnd });
        }
      });
    });

    return overlappingRanges.length ? overlappingRanges : null;
  }, [formData.from_ward_id, formData.to_ward_id, rostersByWard]);

  // Function to check if a date is available (within overlapping roster dates)
  const isDateAvailable = (date: Date | null): boolean => {
    if (!date || !availableDates) return false;
    
    return availableDates.some((range) =>
      isWithinInterval(date, { start: range.start, end: range.end })
    );
  };

  // Filter transfers to last 30 days
  const recentTransfers = useMemo(() => {
    if (!transfersData?.data?.transfers) return [];
    
    const thirtyDaysAgo = subDays(new Date(), 30);
    return transfersData.data.transfers.filter((transfer) => {
      const transferDate = new Date(transfer.transfer_date);
      return transferDate >= thirtyDaysAgo;
    });
  }, [transfersData]);

  // Load wards
  useEffect(() => {
    const loadWards = async () => {
      if (!hospitalId) return;
      setLoadingWards(true);
      setError(null);
      try {
        const response = await fetchWards();
        const wardsList = (response as any).wards || response;
        setWards(Array.isArray(wardsList) ? wardsList : []);
      } catch (e: any) {
        setError(e?.response?.data?.message || "Failed to load wards");
      } finally {
        setLoadingWards(false);
      }
    };
    loadWards();
  }, [hospitalId]);

  const resetShiftSelection = useCallback(() => {
    setFormData((prev) => {
      if (!prev.from_shift && !prev.to_shift) return prev;
      return { ...prev, from_shift: "", to_shift: "" };
    });
  }, []);

  // Auto-populate from_shift when staff, date, and from_ward are selected
  useEffect(() => {
    if (!formData.staff_id || !fromWardRosterContext) {
      resetShiftSelection();
      return;
    }

    const { roster, dayKey } = fromWardRosterContext;

    let selectedStaff =
      roster.roster_input?.staff_details?.find((staff: Staff) => (staff._id || staff.id) === formData.staff_id) ||
      staffList.find((staff: Staff) => (staff._id || staff.id) === formData.staff_id);

    if (!selectedStaff?.emp_id) {
      resetShiftSelection();
      return;
    }

    const staffRoster = roster.roster?.[selectedStaff.emp_id];
    if (!staffRoster) {
      resetShiftSelection();
      return;
    }

    const dayShifts = staffRoster[dayKey] || [];
    const activeShift = dayShifts.find((shiftCode) => !LEAVE_CODES.has(shiftCode));

    if (!activeShift) {
      resetShiftSelection();
      return;
    }

    setFormData((prev) => {
      if (prev.from_shift === activeShift && prev.to_shift === activeShift) {
        return prev;
      }
      return {
        ...prev,
        from_shift: activeShift,
        to_shift: activeShift,
      };
    });
  }, [formData.staff_id, fromWardRosterContext, resetShiftSelection, staffList]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setFormData({
        staff_id: "",
        hospital_id: hospitalId,
        transfer_date: "",
        from_shift: "",
        to_shift: "",
        from_ward_id: "",
        to_ward_id: "",
        created_by: user?.id || "",
        remarks: "",
      });
      setTransferDate(null);
      setError(null);
      setTabValue(0);
    }
  }, [open, hospitalId, user?.id]);

  // Clear staff selection when from_ward or transfer_date changes
  useEffect(() => {
    setFormData((prev) => ({ ...prev, staff_id: "", from_shift: "", to_shift: "" }));
  }, [formData.from_ward_id, formData.transfer_date]);

  // Clear transfer date when from_ward or to_ward changes
  useEffect(() => {
    setTransferDate(null);
    setFormData((prev) => ({ ...prev, transfer_date: "", from_shift: "", to_shift: "" }));
  }, [formData.from_ward_id, formData.to_ward_id]);

  const handleSubmit = async () => {
    // Validation
    if (!formData.staff_id) {
      setError("Please select a staff member");
      return;
    }
    if (!formData.from_ward_id) {
      setError("Please select a from ward");
      return;
    }
    if (!formData.to_ward_id) {
      setError("Please select a to ward");
      return;
    }
    if (formData.from_ward_id === formData.to_ward_id) {
      setError("From ward and To ward cannot be the same");
      return;
    }
    if (!formData.transfer_date) {
      setError("Please select a transfer date");
      return;
    }
    if (!formData.from_shift) {
      setError("From shift is required");
      return;
    }
    if (!formData.to_shift) {
      setError("Please select a to shift");
      return;
    }

    setError(null);
    try {
      await createTransferMutation.mutateAsync(formData);
      // Reset form
      setFormData({
        staff_id: "",
        hospital_id: hospitalId,
        transfer_date: "",
        from_shift: "",
        to_shift: "",
        from_ward_id: "",
        to_ward_id: "",
        created_by: user?.id || "",
        remarks: "",
      });
      setTransferDate(null);
      // Refetch transfers
      refetchTransfers();
      // Switch to Show tab after successful creation
      setTabValue(1);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to create ward transfer");
    }
  };

  const getWardName = (wardId: string) => {
    const ward = wards.find((w) => (w._id || w.id) === wardId);
    return ward?.name || wardId;
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

  const getStatusColor = (status: string) => {
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
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <TransferWithinAStation />
          <Typography variant="h6">Ward Transfer</Typography>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ mb: 3 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
              <Tab label="Create Transfer" />
              <Tab label="Recent Transfers" />
            </Tabs>
          </Box>

          {/* Create Transfer Tab */}
          {tabValue === 0 && (
          <Box sx={{ minHeight: 500 }}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Box sx={{ 
              backgroundColor: '#F9FAFB', 
              borderRadius: 2, 
              p: 3,
              border: '1px solid #E5E7EB'
            }}>
              <Typography variant="subtitle2" fontWeight="600" color="#374151" sx={{ mb: 2.5 }}>
                Transfer Details
              </Typography>
              <Grid container spacing={3}>
                {/* From Ward - First */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel sx={{ backgroundColor: '#F9FAFB', px: 1 }}>From Ward</InputLabel>
                    <Select
                      value={formData.from_ward_id}
                      label="From Ward"
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, from_ward_id: e.target.value }))
                      }
                      disabled={loadingWards}
                      sx={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: 2,
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#D1D5DB',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#9CA3AF',
                        },
                      }}
                    >
                      {wardsWithActiveRosters.map((ward) => (
                        <MenuItem key={ward._id || ward.id} value={ward._id || ward.id}>
                          {ward.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* To Ward - Second */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel sx={{ backgroundColor: '#F9FAFB', px: 1 }}>To Ward</InputLabel>
                    <Select
                      value={formData.to_ward_id}
                      label="To Ward"
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, to_ward_id: e.target.value }))
                      }
                      disabled={loadingWards}
                      sx={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: 2,
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#D1D5DB',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#9CA3AF',
                        },
                      }}
                    >
                      {wardsWithActiveRosters
                        .filter((ward) => {
                          const wardId = ward._id || ward.id;
                          return wardId !== formData.from_ward_id;
                        })
                        .map((ward) => (
                          <MenuItem key={ward._id || ward.id} value={ward._id || ward.id}>
                            {ward.name}
                          </MenuItem>
                        ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Transfer Date - Third (needed to filter staff) */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <DatePicker
                    label="Transfer Date"
                    value={transferDate}
                    onChange={(newValue) => {
                      setTransferDate(newValue);
                      if (newValue) {
                        setFormData((prev) => ({
                          ...prev,
                          transfer_date: format(newValue, "yyyy-MM-dd"),
                        }));
                      }
                    }}
                    format="dd/MM/yyyy"
                    shouldDisableDate={(date) => !isDateAvailable(date)}
                    disabled={!formData.from_ward_id || !formData.to_ward_id}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        sx: {
                          backgroundColor: '#FFFFFF',
                          borderRadius: 2,
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#D1D5DB',
                            },
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#9CA3AF',
                            },
                          },
                        },
                        helperText: !formData.from_ward_id || !formData.to_ward_id
                          ? "Please select From Ward and To Ward first"
                          : availableDates
                          ? "Only dates with rosters for both wards are available"
                          : "No overlapping roster dates found",
                      },
                    }}
                  />
                </Grid>

                {/* Staff - Fourth (filtered by from_ward and date) */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel sx={{ backgroundColor: '#F9FAFB', px: 1 }}>Staff</InputLabel>
                    <Select
                      value={formData.staff_id}
                      label="Staff"
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, staff_id: e.target.value }))
                      }
                      disabled={!formData.from_ward_id || !formData.transfer_date}
                      sx={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: 2,
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#D1D5DB',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#9CA3AF',
                        },
                      }}
                    >
                      {filteredStaff.length > 0 ? (
                        filteredStaff.map((staff: Staff) => (
                          <MenuItem key={staff._id || staff.id} value={staff._id || staff.id}>
                            {staff.name} ({staff.emp_id}) - {staff.grade}
                          </MenuItem>
                        ))
                      ) : (
                        <MenuItem disabled>
                          {!formData.from_ward_id
                            ? "Please select From Ward first"
                            : !formData.transfer_date
                            ? "Please select Transfer Date first"
                            : "No active staff found for this ward on the selected date"}
                        </MenuItem>
                      )}
                    </Select>
                  </FormControl>
                </Grid>

                {/* From Shift - Fifth (auto-populated, read-only) */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel sx={{ backgroundColor: '#F9FAFB', px: 1 }}>From Shift</InputLabel>
                    <Select
                      value={formData.from_shift}
                      label="From Shift"
                      disabled
                      sx={{
                        backgroundColor: '#F3F4F6',
                        borderRadius: 2,
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#D1D5DB',
                        },
                        '& .MuiInputBase-input': {
                          color: '#6B7280',
                          cursor: 'not-allowed',
                        },
                      }}
                    >
                      {formData.from_shift ? (
                        <MenuItem value={formData.from_shift}>
                          {formData.from_shift === 'M' ? 'M (Morning)' :
                           formData.from_shift === 'E' ? 'E (Evening)' :
                           formData.from_shift === 'N' ? 'N (Night)' :
                           formData.from_shift === 'ME' ? 'ME (Morning-Evening)' :
                           formData.from_shift === 'G' ? 'G (General)' :
                           formData.from_shift}
                        </MenuItem>
                      ) : (
                        <MenuItem disabled>Select staff and date to see shift</MenuItem>
                      )}
                    </Select>
                  </FormControl>
                </Grid>

                {/* To Shift - Sixth (user selectable, defaults to from_shift) */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel sx={{ backgroundColor: '#F9FAFB', px: 1 }}>To Shift</InputLabel>
                    <Select
                      value={formData.to_shift}
                      label="To Shift"
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, to_shift: e.target.value }))
                      }
                      disabled={!formData.from_shift}
                      sx={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: 2,
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#D1D5DB',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#9CA3AF',
                        },
                      }}
                    >
                      <MenuItem value="M">M (Morning)</MenuItem>
                      <MenuItem value="E">E (Evening)</MenuItem>
                      <MenuItem value="N">N (Night)</MenuItem>
                      <MenuItem value="ME">ME (Morning-Evening)</MenuItem>
                      <MenuItem value="G">G (General)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* Remarks - Seventh */}
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Remarks"
                    multiline
                    rows={3}
                    value={formData.remarks || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, remarks: e.target.value }))
                    }
                    placeholder="Enter any additional remarks or notes about this transfer..."
                    sx={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: 2,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#D1D5DB',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#9CA3AF',
                        },
                      },
                    }}
                  />
                </Grid>
              </Grid>
            </Box>
          </LocalizationProvider>
          </Box>
          )}

          {/* Recent Transfers Tab */}
          {tabValue === 1 && (
        <Box sx={{ minHeight: 500 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Recent Transfers (Last 30 Days)
          </Typography>
          {loadingTransfers ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : recentTransfers.length === 0 ? (
            <Alert severity="info">No transfers found in the last 30 days</Alert>
          ) : (
            <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
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
                  {recentTransfers.map((transfer) => (
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
                          color={getStatusColor(transfer.status) as any}
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
        </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {tabValue === 0 && (
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={createTransferMutation.isPending}
            sx={{
              backgroundColor: "#14B8A6",
              '&:hover': {
                backgroundColor: "#0F766E"
              }
            }}
          >
            {createTransferMutation.isPending ? "Creating..." : "Create Transfer"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default WardTransferComponent;

