import { useState, useEffect, useMemo, Fragment } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  FormControl,
  FormControlLabel,
  Select,
  MenuItem,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
} from "@mui/material";
import {
  Edit,
  Delete,
  Add,
  ChevronLeft,
  ChevronRight,
  PersonOutline,
} from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { format } from "date-fns";
import { useStaffList, useGenerateRoster, useRosters } from "../api/hooks";
import { fetchWards, fetchRosters, fetchPreferencesByPreviousRoster } from "../api";
import type { GenerateRosterRequest } from "../api/types";
import { useAuth } from "../contexts/AuthContext";

interface LeaveEntry {
  id: string;
  employee: string;
  employeeId: string;
  dates: string[];
  leaveType: "LEAVE";
}

interface RosterInputOverlayProps {
  open: boolean;
  onClose: () => void;
  onGenerated?: (newRosterId?: string) => void;
}

const RosterInputOverlay = ({ open, onClose, onGenerated }: RosterInputOverlayProps) => {
  const { user } = useAuth();
  const { data: staffData } = useStaffList(1, 1000); // Fetch first page with large limit for roster input
  const staff = useMemo(() => staffData?.items || [], [staffData?.items]);
  const generateRosterMutation = useGenerateRoster();
  const { data: rosters } = useRosters();

  // Helper function to format date as dd/mm/yyyy
  const formatDateDDMMYYYY = (date: Date | null): string => {
    if (!date) return "";
    return format(date, 'dd/MM/yyyy');
  };

  // Roster input state
  const [rosterBaseName, setRosterBaseName] = useState("");
  const [schedulePeriod, setSchedulePeriod] = useState({
    start: null as Date | null,
    end: null as Date | null,
  });
  const [ward, setWard] = useState("");

  // Leave management state
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [leaveEntries, setLeaveEntries] = useState<LeaveEntry[]>([]);

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const shiftOptions = ["OFF", "M", "E", "N", "G", "ME"];

  // Update calendar month when schedule period changes
  useEffect(() => {
    if (schedulePeriod.start) {
      setCurrentMonth(schedulePeriod.start);
    }
  }, [schedulePeriod.start]);

  // Staff preferences (staff requested off-days)
  type StaffPreference = { id: string; staffId: string; date: Date | null; shift: string };
  const [preferences, setPreferences] = useState<StaffPreference[]>([
    { id: Date.now().toString(), staffId: "", date: null, shift: "OFF" },
  ]);

  // Toggle: derive preferences from last week's roster
  const [useLastWeekPreferences, setUseLastWeekPreferences] = useState(false);
  const [manualPreferencesBackup, setManualPreferencesBackup] = useState<StaffPreference[] | null>(null);

  // Coverage constraints for each shift
  const [coverageConstraints, setCoverageConstraints] = useState({
    M: 7, // Morning
    E: 7, // Evening
    N: 7, // Night
    G: 1, // General
    ME: 0, // Morning+Evening
  });

  // Wards from API
  const [wards, setWards] = useState<Array<{ id: string; name: string }>>([]);

  // Filter wards based on user role
  const userRole = user?.role?.toUpperCase();
  const isWardIncharge = userRole === 'WARD_INCHARGE';
  const userWardIds = useMemo(() => user?.ward_id || [], [user?.ward_id]);

  useEffect(() => {
    (async () => {
      try {
        const response = await fetchWards();
        // Handle both direct array response and object with wards array
        const wardsList = response.wards || response;
        const allWards = Array.isArray(wardsList) ? wardsList : [];

        // For ward_incharge, filter to only show assigned wards
        if (isWardIncharge && userWardIds.length > 0) {
          const filteredWards = allWards.filter((w: any) => {
            const wardId = w.id || w._id;
            return wardId && userWardIds.includes(String(wardId));
          });
          setWards(filteredWards.map((w: any) => ({
            id: w.id || w._id,
            name: w.name
          })));
        } else {
          setWards(allWards.map((w: any) => ({
            id: w.id || w._id,
            name: w.name
          })));
        }
      } catch (e) {
        // silently ignore for now
        setWards([]);
      }
    })();
  }, [isWardIncharge, userWardIds]);

  // Filter staff by selected ward
  const filteredStaff = useMemo(() => {
    if (!staff || !ward) {
      return [];
    }
    return staff.filter((s) => {
      const staffWardIds = s.ward_id || [];
      return staffWardIds.includes(ward);
    });
  }, [staff, ward]);

  // Get existing rosters for selected ward and create date ranges to block
  const blockedDateRanges = useMemo(() => {
    if (!ward || !rosters) return [];

    const wardRosters = rosters.filter(r => r?.roster_input?.ward_id === ward);
    return wardRosters.map(roster => {
      const meta = roster.roster_input?.meta;
      if (!meta || !meta.schedule_start_date || !meta.schedule_end_date) return null;

      return {
        start: new Date(meta.schedule_start_date),
        end: new Date(meta.schedule_end_date)
      };
    }).filter((range): range is { start: Date; end: Date } => range !== null);
  }, [ward, rosters]);

  // Function to check if a date should be disabled (is within any blocked range)
  const shouldDisableDate = (date: Date | null): boolean => {
    if (!date || !blockedDateRanges.length) return false;

    const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return blockedDateRanges.some(range => {
      if (!range?.start || !range?.end) return false;
      const rangeStart = new Date(range.start.getFullYear(), range.start.getMonth(), range.start.getDate());
      const rangeEnd = new Date(range.end.getFullYear(), range.end.getMonth(), range.end.getDate());
      return checkDate >= rangeStart && checkDate <= rangeEnd;
    });
  };

  const handleAddPreferenceRow = () => {
    setPreferences((prev) => [
      ...prev,
      { id: `${Date.now()}-${prev.length + 1}`, staffId: "", date: null, shift: "OFF" },
    ]);
  };

  const handleRemovePreferenceRow = (id: string) => {
    setPreferences((prev) => prev.filter((p) => p.id !== id));
  };

  const updatePreference = (
    id: string,
    field: "staffId" | "date" | "shift",
    value: string | Date | null
  ) => {
    setPreferences((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of the month, but only if they fall within the selected range
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day);
      // Only show dates that are within the selected schedule period
      if (schedulePeriod.start && schedulePeriod.end) {
        if (currentDate >= schedulePeriod.start && currentDate <= schedulePeriod.end) {
          days.push(currentDate);
        } else {
          days.push(null); // Show empty cell for dates outside range
        }
      } else {
        days.push(currentDate);
      }
    }

    return days;
  };

  const isDateSelected = (date: Date) => {
    return selectedDates.some(d =>
      d.getDate() === date.getDate() &&
      d.getMonth() === date.getMonth() &&
      d.getFullYear() === date.getFullYear()
    );
  };

  const isDateInRange = (date: Date) => {
    if (selectedDates.length < 2) return false;
    const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
    return date >= sortedDates[0] && date <= sortedDates[sortedDates.length - 1];
  };

  const isDateInScheduleRange = (date: Date) => {
    if (!schedulePeriod.start || !schedulePeriod.end) return false;
    return date >= schedulePeriod.start && date <= schedulePeriod.end;
  };

  const handleDateClick = (date: Date) => {
    if (isDateSelected(date)) {
      setSelectedDates(prev => prev.filter(d =>
        !(d.getDate() === date.getDate() &&
          d.getMonth() === date.getMonth() &&
          d.getFullYear() === date.getFullYear())
      ));
    } else {
      setSelectedDates(prev => [...prev, date]);
    }
  };

  const handleAddLeaveEntry = () => {
    if (!selectedEmployee || selectedDates.length === 0) {
      alert("Please select an employee and at least one date");
      return;
    }

    const employee = filteredStaff?.find(s => s._id === selectedEmployee || s.id === selectedEmployee);
    if (!employee) return;

    const newEntry: LeaveEntry = {
      id: Date.now().toString(),
      employee: employee?.name || 'Unknown',
      employeeId: employee?.emp_id || employee?._id || employee?.id || '',
      dates: selectedDates.map(d => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }),
      leaveType: "LEAVE",
    };

    setLeaveEntries(prev => [...prev, newEntry]);
    setSelectedEmployee("");
    setSelectedDates([]);
  };

  const handleRemoveLeaveEntry = (id: string) => {
    setLeaveEntries(prev => prev.filter(entry => entry.id !== id));
  };

  const handleEditLeaveEntry = (entry: LeaveEntry) => {
    // Find the staff member by employeeId (could be emp_id, _id, or id)
    const staffMember = filteredStaff?.find(
      s => s.emp_id === entry.employeeId || s._id === entry.employeeId || s.id === entry.employeeId
    );
    // Use _id or id for selectedEmployee (for Autocomplete matching)
    setSelectedEmployee(staffMember?._id || staffMember?.id || "");
    setSelectedDates(entry.dates.map(d => new Date(d)));
    handleRemoveLeaveEntry(entry.id);
  };

  // Helper functions to compute month and week from period
  const getMonthAbbreviation = (date: Date | null): string => {
    if (!date) return "";
    const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    return monthNames[date.getMonth()] || "";
  };

  const getWeekNumber = (date: Date | null): string => {
    if (!date) return "";
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const dayOfMonth = date.getDate();
    const weekNumber = Math.ceil((dayOfMonth + startOfMonth.getDay()) / 7);
    return `week-${weekNumber}`;
  };

  const getComputedRosterName = (): string => {
    if (!rosterBaseName || !schedulePeriod.start) return "";
    const month = getMonthAbbreviation(schedulePeriod.start);
    const week = getWeekNumber(schedulePeriod.start);
    if (!month || !week) return rosterBaseName;
    return `${rosterBaseName}-${month}-${week}`;
  };

  const resetForm = () => {
    setRosterBaseName("");
    setSchedulePeriod({ start: null, end: null });
    setWard("");
    setSelectedEmployee("");
    setSelectedDates([]);
    setLeaveEntries([]);
    setPreferences([{ id: Date.now().toString(), staffId: "", date: null, shift: "OFF" }]);
    setCoverageConstraints({ M: 7, E: 7, N: 7, G: 1, ME: 0 });
  };

  useEffect(() => {
    if (!open) {
      // reset when modal closes
      resetForm();
    }
  }, [open]);


  // Clear selected employees and preferences when ward changes
  useEffect(() => {
    if (!ward) {
      // Ward was cleared, clear all selections
      setSelectedEmployee("");
      setSelectedDates([]);
      setPreferences([{ id: Date.now().toString(), staffId: "", date: null, shift: "OFF" }]);
      setLeaveEntries([]);
      return;
    }

    // Use filteredStaff from the memoized value
    const currentFilteredStaff = filteredStaff;

    // Clear selected employee if they're not in the filtered staff
    setSelectedEmployee(prev => {
      if (!prev) return prev;
      const employeeStillAvailable = currentFilteredStaff?.some(
        s => s._id === prev || s.id === prev
      );
      if (!employeeStillAvailable) {
        // Clear dates when employee is removed
        setSelectedDates([]);
        return "";
      }
      return prev;
    });

    // Clear preferences for staff not in the filtered list
    setPreferences(prev => {
      const updated = prev.map(pref => {
        if (pref.staffId) {
          const staffStillAvailable = currentFilteredStaff?.some(
            s => s._id === pref.staffId || s.id === pref.staffId
          );
          if (!staffStillAvailable) {
            return { ...pref, staffId: "" };
          }
        }
        return pref;
      });
      // Only update if something changed
      const hasChanges = updated.some((pref, idx) => pref.staffId !== prev[idx]?.staffId);
      return hasChanges ? updated : prev;
    });

    // Remove leave entries for employees not in the filtered list
    setLeaveEntries(prev => {
      const filtered = prev.filter(entry => {
        return currentFilteredStaff?.some(
          s => (s.emp_id === entry.employeeId || s._id === entry.employeeId || s.id === entry.employeeId)
        );
      });
      // Only update if something was removed
      return filtered.length !== prev.length ? filtered : prev;
    });
  }, [ward]); // Only depend on ward, not staff or filteredStaff

  // When toggled on, pull previous roster and compute suggestions (Monday off for staff who had Night on the last day of previous roster)
  useEffect(() => {
    const computeFromPreviousRoster = async () => {
      if (!useLastWeekPreferences) return;
      if (!ward || !schedulePeriod.start || !schedulePeriod.end) return;

      try {
        // Backup current manual preferences only once per toggle-on
        if (manualPreferencesBackup === null) {
          setManualPreferencesBackup(preferences);
        }

        const rosters = await fetchRosters();
        // Filter by ward and rosters that end before the selected start date
        const startTime = new Date(schedulePeriod.start).getTime();
        const relevant = (rosters || []).filter((r: any) => {
          const rWard = r?.roster_input?.ward_id;
          const endStr = r?.roster_input?.meta?.schedule_end_date;
          if (!rWard || !endStr) return false;
          const endTime = new Date(endStr).getTime();
          return rWard === ward && endTime < startTime;
        });

        if (relevant.length === 0) {
          // No previous roster; keep current preferences but clear suggestions
          return;
        }

        // Pick the latest by end date
        relevant.sort((a: any, b: any) => {
          const aEnd = a?.roster_input?.meta?.schedule_end_date;
          const bEnd = b?.roster_input?.meta?.schedule_end_date;
          if (!aEnd || !bEnd) return 0;
          return new Date(bEnd).getTime() - new Date(aEnd).getTime();
        });
        const prev = relevant[0];

        // Use BE to compute preferences based on previous roster
        const prevRosterId: string = prev?.roster_id || prev?._id;
        if (!prevRosterId) return;

        const prefData = await fetchPreferencesByPreviousRoster(prevRosterId);
        // prefData is expected to be an array: [{ id, preferred_date_offs: [yyyy-mm-dd, ...], shift? }, ...]
        if (Array.isArray(prefData) && prefData.length > 0) {
          const rows: StaffPreference[] = [];
          const staffSource = (filteredStaff && filteredStaff.length > 0) ? filteredStaff : staff;
          const prevRosterStaffIds = Array.isArray(prev?.roster_input?.staff_details)
            ? new Set((prev.roster_input.staff_details as any[]).map((id: any) => String(id?.id || id)))
            : new Set<string>();

          const startNorm = schedulePeriod.start ? new Date(schedulePeriod.start) : null;
          const endNorm = schedulePeriod.end ? new Date(schedulePeriod.end) : null;
          if (startNorm) startNorm.setHours(0, 0, 0, 0);
          if (endNorm) endNorm.setHours(0, 0, 0, 0);

          prefData.forEach((item: any, idx: number) => {
            const staffIdKey = item?.id;
            if (!staffIdKey) return;
            const isInCurrentList = staffSource?.some((s) => (s._id || s.id) === staffIdKey);
            const isInPrevRoster = prevRosterStaffIds.has(String(staffIdKey));
            if (!isInCurrentList && !isInPrevRoster) {
              console.info("[prefs] skipping pref; staff not in current list or prev roster staff_details", { staffIdKey, idx });
              return;
            }

            const dates: string[] = Array.isArray(item?.preferred_date_offs) ? item.preferred_date_offs : [];
            dates.forEach((dStr) => {
              if (!dStr || !startNorm || !endNorm) return;
              const d = new Date(dStr);
              if (isNaN(d.getTime())) return;
              d.setHours(0, 0, 0, 0);
              // Only include dates inside selected schedule period
              if (d >= startNorm && d <= endNorm) {
                rows.push({ id: `${staffIdKey}-${d.getTime()}`, staffId: staffIdKey, date: d, shift: item?.shift || "OFF" });
              }
            });
          });
          if (rows.length > 0) {
            setPreferences(rows);
          } else {
            setPreferences([{ id: Date.now().toString(), staffId: "", date: null, shift: "OFF" }]);
          }
        }
      } catch (e) {
        // Fail silently; keep current preferences
      }
    };

    computeFromPreviousRoster();
  }, [useLastWeekPreferences, ward, schedulePeriod.start, schedulePeriod.end, staff]); // Use staff instead of filteredStaff

  // When toggled off, restore manual preferences if we backed them up
  useEffect(() => {
    if (!useLastWeekPreferences && manualPreferencesBackup !== null) {
      setPreferences(manualPreferencesBackup);
      setManualPreferencesBackup(null);
    }
  }, [useLastWeekPreferences]);

  const handleGenerateRoster = () => {
    if (!rosterBaseName || !schedulePeriod.start || !schedulePeriod.end) {
      alert("Please fill in all required fields");
      return;
    }

    if (!ward) {
      alert("Please select a ward");
      return;
    }

    if (!filteredStaff || filteredStaff.length === 0) {
      alert("No staff members available for the selected ward");
      return;
    }

    // Combine base name, month, and week
    const rosterName = getComputedRosterName();

    // Format dates to YYYY-MM-DD without timezone conversion
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const startDate = schedulePeriod.start!;
    const endDate = schedulePeriod.end!;
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const period = `${startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;

    // Process preferences - one per staff/date with selected shift
    const preferenceDedup = new Map<string, { id: string; date: string; shift: string }>();
    preferences.forEach(pref => {
      if (pref.staffId && pref.date && pref.shift) {
        const dateStr = formatDate(pref.date);
        const key = `${pref.staffId}-${dateStr}`;
        preferenceDedup.set(key, {
          id: pref.staffId,
          date: dateStr,
          shift: pref.shift,
        });
      }
    });

    const preferencesArray = Array.from(preferenceDedup.values());

    // Process leave requests - group by staff ID
    const leaveRequestsMap = new Map<string, Array<{ date: string, type: string }>>();
    leaveEntries.forEach(entry => {
      const staffMember = filteredStaff.find(s => s.emp_id === entry.employeeId || s._id === entry.employeeId || s.id === entry.employeeId);
      if (staffMember && (staffMember._id || staffMember.id)) {
        const staffId = staffMember._id || staffMember.id;
        if (!leaveRequestsMap.has(staffId)) {
          leaveRequestsMap.set(staffId, []);
        }
        entry.dates.forEach(date => {
          leaveRequestsMap.get(staffId!)!.push({
            date,
            type: "LEAVE"
          });
        });
      }
    });

    const leaveRequestsArray = Array.from(leaveRequestsMap.entries()).map(([staffId, leaves]) => ({
      id: staffId,
      leaves
    }));

    const payload: GenerateRosterRequest = {
      roster_input: {
        ward_id: ward,
        roster_name: rosterName,
        meta: {
          period: period,
          total_days: totalDays,
          schedule_start_date: formatDate(startDate),
          schedule_end_date: formatDate(endDate),
        },
        staff_details: filteredStaff.map(s => s._id || s.id).filter((id): id is string => id !== undefined),
        shift_definitions: {
          M: { name: "Morning", hours: 6 },
          E: { name: "Evening", hours: 6 },
          N: { name: "Night", hours: 12 },
          G: { name: "General", hours: 8 },
          ME: { name: "Morning+Evening", hours: 12 },
        },
        preferences: preferencesArray,
        leave_requests: leaveRequestsArray,
        constraints: {
          coverage: {
            per_shift: {
              M: { total: coverageConstraints.M },
              E: { total: coverageConstraints.E },
              N: { total: coverageConstraints.N },
              G: { total: coverageConstraints.G },
            },
            enforce_exact: false,
          },
          rules: {
            one_shift_per_day: true,
            n4_only_g: true,
            non_n4_pattern: true,
            rest_after_2n: true,
            n5_shift_coverage: true,
            skip_g_coverage_if_infeasible: true,
          }
        }
      },
      method: "pulp",
      seed: 42
    };

    generateRosterMutation.mutate(payload, {
      onSuccess: (response) => {
        // Extract roster_id from response
        // The response might be the Roster object directly or wrapped in a data object
        const responseAny = response as any;
        const newRosterId = response?.roster_id || responseAny?.data?.roster_id || responseAny?.data?.data?.roster_id || response?._id || responseAny?.data?._id;

        console.log('Roster generated successfully, new roster ID:', newRosterId, 'Full response:', response);
        onGenerated?.(newRosterId);
        resetForm();
        onClose();
      },
    });
  };

  const days = getDaysInMonth(currentMonth);
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog
        open={open}
        onClose={() => {
          resetForm();
          onClose();
        }}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            height: '90vh',
            maxHeight: '90vh',
            borderRadius: 3,
          }
        }}
      >
        <DialogTitle component="div" sx={{ pb: 1 }}>
          <Typography variant="h4" component="h2" fontWeight="bold" color="#1F2937">
            Roster Input
          </Typography>
          <Typography variant="body1" color="#6B7280" sx={{ mt: 1 }}>
            Manage schedules and leave requests with ease.
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ p: 3, overflow: 'auto' }}>
          <Grid container spacing={3}>
            {/* Left Section: Roster Input */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" fontWeight="bold" color="#1F2937" gutterBottom>
                  Roster Input
                </Typography>

                {/* Step 1: Ward */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" color="#6B7280" gutterBottom>
                    Ward
                  </Typography>
                  <FormControl fullWidth>
                    <Select
                      value={ward}
                      onChange={(e) => setWard(e.target.value)}
                      displayEmpty
                      sx={{ borderRadius: 2 }}
                    >
                      <MenuItem value="" disabled>
                        Select Ward
                      </MenuItem>
                      {wards.map((wardOption) => (
                        <MenuItem key={wardOption.id} value={wardOption.id}>
                          {wardOption.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                {/* Step 2: Schedule Period */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" color="#6B7280" gutterBottom>
                    Schedule Period
                  </Typography>
                  <Box display="flex" gap={2}>
                    <DatePicker
                      label="Start Date"
                      value={schedulePeriod.start}
                      onChange={(date) => {
                        if (date) {
                          // Auto-set end date to 1 week after start date
                          const endDate = new Date(date);
                          endDate.setDate(endDate.getDate() + 6); // 6 days after start date = 1 week total
                          setSchedulePeriod({ start: date, end: endDate });
                        } else {
                          setSchedulePeriod(prev => ({ ...prev, start: date }));
                        }
                      }}
                      format="dd/MM/yyyy"
                      shouldDisableDate={shouldDisableDate}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          sx: { '& .MuiOutlinedInput-root': { borderRadius: 2 } }
                        }
                      }}
                    />
                    <DatePicker
                      label="End Date"
                      value={schedulePeriod.end}
                      onChange={(date) => setSchedulePeriod(prev => ({ ...prev, end: date }))}
                      format="dd/MM/yyyy"
                      minDate={schedulePeriod.start || undefined}
                      maxDate={schedulePeriod.start ? new Date(schedulePeriod.start.getTime() + 6 * 24 * 60 * 60 * 1000) : undefined}
                      shouldDisableDate={shouldDisableDate}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          sx: { '& .MuiOutlinedInput-root': { borderRadius: 2 } }
                        }
                      }}
                    />
                  </Box>
                </Box>

                {/* Step 3: Roster Name - Split into Base, Month, Week */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" color="#6B7280" gutterBottom>
                    Roster Name
                  </Typography>
                  <Box display="flex" gap={2} alignItems="flex-start">
                    <TextField
                      fullWidth
                      placeholder="e.g., roster"
                      value={rosterBaseName}
                      onChange={(e) => setRosterBaseName(e.target.value)}
                      label="Base Name"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                        }
                      }}
                    />
                    <TextField
                      fullWidth
                      value={schedulePeriod.start ? getMonthAbbreviation(schedulePeriod.start) : ""}
                      label="Month"
                      disabled
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                        },
                        flex: '0 0 100px'
                      }}
                    />
                    <TextField
                      fullWidth
                      value={schedulePeriod.start ? getWeekNumber(schedulePeriod.start) : ""}
                      label="Week"
                      disabled
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                        },
                        flex: '0 0 120px'
                      }}
                    />
                  </Box>
                  {rosterBaseName && schedulePeriod.start && (
                    <Typography variant="caption" color="#14B8A6" sx={{ mt: 1, display: 'block', fontWeight: 'bold' }}>
                      Final Name: {getComputedRosterName()}
                    </Typography>
                  )}
                </Box>

                {/* Coverage Constraints */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" color="#6B7280" gutterBottom>
                    Coverage Constraints
                  </Typography>
                  <Typography variant="caption" color="#9CA3AF" sx={{ mb: 2, display: 'block' }}>
                    Set minimum staff required for each shift type
                  </Typography>

                  <Grid container spacing={2}>
                    {Object.entries(coverageConstraints).map(([shiftCode, count]) => (
                      <Grid size={{ xs: 6, md: 4 }} key={shiftCode}>
                        <Box sx={{
                          p: 2,
                          border: '1px solid #E2E8F0',
                          borderRadius: 2,
                          backgroundColor: '#F9FAFB'
                        }}>
                          <Typography variant="subtitle2" fontWeight="bold" color="#1F2937" gutterBottom>
                            {shiftCode === 'M' ? 'Morning' :
                              shiftCode === 'E' ? 'Evening' :
                                shiftCode === 'N' ? 'Night' :
                                  shiftCode === 'G' ? 'General' :
                                    'Morning+Evening'}
                          </Typography>
                          <TextField
                            type="number"
                            value={count}
                            onChange={(e) => setCoverageConstraints(prev => ({
                              ...prev,
                              [shiftCode]: parseInt(e.target.value) || 0
                            }))}
                            inputProps={{ min: 0 }}
                            size="small"
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                borderRadius: 1,
                              }
                            }}
                          />
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Box>

                {/* Staff Preferences - Off-day requests */}
                <Box sx={{ mt: 3 }}>
                  <Paper
                    sx={{
                      p: 2,
                      backgroundColor: 'white',
                      border: '1px solid #E2E8F0',
                      borderRadius: 2,
                    }}
                  >
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <PersonOutline sx={{ color: '#0F766E' }} />
                        <Typography variant="h6" fontWeight="bold" color="#1F2937">
                          Staff Preferences
                        </Typography>
                      </Box>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={useLastWeekPreferences}
                            onChange={() => setUseLastWeekPreferences((v) => !v)}
                            size="small"
                          />
                        }
                        label="Use last week preferences"
                        sx={{ m: 0, '& .MuiFormControlLabel-label': { fontSize: 13, color: '#374151' } }}
                        disabled={!ward || !schedulePeriod.start || !schedulePeriod.end}
                      />
                    </Box>
                    <Typography variant="body2" color="#6B7280" sx={{ mb: 2 }}>
                      Add staff requests for preferred shifts or days off. These will be considered high-priority
                      constraints during roster generation.
                    </Typography>
                    {useLastWeekPreferences && (
                      <Typography variant="caption" color="#14B8A6" sx={{ mb: 2, display: 'block', fontWeight: 'bold' }}>
                        Auto-applied: Monday off for staff with Night on last day of previous roster
                      </Typography>
                    )}
                    {schedulePeriod.start && schedulePeriod.end && (
                      <Typography variant="caption" color="#14B8A6" sx={{ mb: 2, display: 'block', fontWeight: 'bold' }}>
                        Only dates within the selected schedule period ({formatDateDDMMYYYY(schedulePeriod.start)} - {formatDateDDMMYYYY(schedulePeriod.end)}) are selectable
                      </Typography>
                    )}

                    <Grid container spacing={2} alignItems="center">
                      <Grid size={{ xs: 12, md: 4 }}>
                        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                          Staff Member
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                          Preferred Date
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 12, md: 3 }}>
                        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                          Preferred Shift
                        </Typography>
                      </Grid>
                      {preferences.map((pref) => (
                        <Fragment key={pref.id}>
                          <Grid size={{ xs: 12, md: 4 }}>
                            <Autocomplete
                              options={filteredStaff || []}
                              getOptionLabel={(option) => `${option.name} (${option.emp_id})`}
                              value={filteredStaff?.find(s => s._id === pref.staffId || s.id === pref.staffId) || null}
                              onChange={(_, newValue) => updatePreference(pref.id, 'staffId', newValue?._id || newValue?.id || "")}
                              isOptionEqualToValue={(option, value) => option._id === value?._id || option.id === value?.id}
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  placeholder="Search and select staff"
                                  size="small"
                                  sx={{
                                    '& .MuiOutlinedInput-root': {
                                      borderRadius: 2,
                                    }
                                  }}
                                />
                              )}
                              renderOption={(props, option) => (
                                <Box component="li" {...props}>
                                  <Box>
                                    <Typography variant="body2" fontWeight="bold">
                                      {option.name}
                                    </Typography>
                                    <Typography variant="caption" color="#6B7280">
                                      {option.emp_id} • {option.position}
                                    </Typography>
                                  </Box>
                                </Box>
                              )}
                              noOptionsText={ward ? "No staff found for selected ward" : "No staff found"}
                              clearOnEscape
                              selectOnFocus
                              handleHomeEndKeys
                              disabled={!ward}
                            />
                          </Grid>
                          <Grid size={{ xs: 12, md: 4 }}>
                            <DatePicker
                              value={pref.date}
                              onChange={(date) => updatePreference(pref.id, 'date', date)}
                              format="dd/MM/yyyy"
                              minDate={schedulePeriod.start || undefined}
                              maxDate={schedulePeriod.end || undefined}
                              slotProps={{
                                textField: {
                                  fullWidth: true,
                                  placeholder: 'dd/mm/yyyy',
                                  sx: { '& .MuiOutlinedInput-root': { borderRadius: 2 } }
                                }
                              }}
                            />
                          </Grid>
                          <Grid size={{ xs: 12, md: 3 }}>
                            <TextField
                              select
                              fullWidth
                              label="Shift"
                              size="small"
                              value={pref.shift || "OFF"}
                              onChange={(e) => updatePreference(pref.id, 'shift', e.target.value)}
                              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                            >
                              {shiftOptions.map((opt) => (
                                <MenuItem key={opt} value={opt}>
                                  {opt}
                                </MenuItem>
                              ))}
                            </TextField>
                          </Grid>
                          <Grid size={{ xs: 12, md: 1 }}>
                            <IconButton
                              aria-label="remove preference"
                              onClick={() => handleRemovePreferenceRow(pref.id)}
                              sx={{
                                backgroundColor: 'transparent',
                                '&:hover': { backgroundColor: '#F3F4F6' }
                              }}
                            >
                              <Delete />
                            </IconButton>
                          </Grid>
                        </Fragment>
                      ))}
                    </Grid>

                    <Box mt={2}>
                      <Button
                        variant="outlined"
                        startIcon={<Add />}
                        onClick={handleAddPreferenceRow}
                        sx={{ textTransform: 'none', borderRadius: 2 }}
                      >
                        Add Preference
                      </Button>
                    </Box>
                  </Paper>
                </Box>
              </Paper>
            </Grid>

            {/* Right Section: Leave Management */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" fontWeight="bold" color="#1F2937" gutterBottom>
                  Leave Management
                </Typography>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" color="#6B7280" gutterBottom>
                    Employee
                  </Typography>
                  <Autocomplete
                    options={filteredStaff || []}
                    getOptionLabel={(option) => `${option.name} (${option.emp_id})`}
                    value={filteredStaff?.find(s => s._id === selectedEmployee || s.id === selectedEmployee) || null}
                    onChange={(_, newValue) => setSelectedEmployee(newValue?._id || newValue?.id || "")}
                    isOptionEqualToValue={(option, value) => option._id === value?._id || option.id === value?.id}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder="Search and select employee"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                          }
                        }}
                      />
                    )}
                    renderOption={(props, option) => (
                      <Box component="li" {...props}>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {option.name}
                          </Typography>
                          <Typography variant="caption" color="#6B7280">
                            {option.emp_id} • {option.position}
                          </Typography>
                        </Box>
                      </Box>
                    )}
                    noOptionsText={ward ? "No employees found for selected ward" : "No employees found"}
                    clearOnEscape
                    selectOnFocus
                    handleHomeEndKeys
                    disabled={!ward}
                  />
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" color="#6B7280" gutterBottom>
                    Leave Dates
                  </Typography>
                  {schedulePeriod.start && schedulePeriod.end && (
                    <Typography variant="caption" color="#14B8A6" sx={{ mb: 1, display: 'block', fontWeight: 'bold' }}>
                      Only dates within the selected schedule period ({formatDateDDMMYYYY(schedulePeriod.start)} - {formatDateDDMMYYYY(schedulePeriod.end)}) are selectable
                    </Typography>
                  )}

                  {/* Calendar Header */}
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <IconButton onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}>
                      <ChevronLeft />
                    </IconButton>
                    <Typography variant="h6" fontWeight="bold">
                      {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                    </Typography>
                    <IconButton onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}>
                      <ChevronRight />
                    </IconButton>
                  </Box>

                  {/* Calendar Grid */}
                  <Box sx={{ border: '1px solid #E5E7EB', borderRadius: 2, overflow: 'hidden' }}>
                    {/* Days of week header */}
                    <Box display="flex" sx={{ backgroundColor: '#F9FAFB' }}>
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day) => (
                        <Box key={day} sx={{ flex: 1, p: 1, textAlign: 'center', fontWeight: 'bold', fontSize: '0.875rem' }}>
                          {day}
                        </Box>
                      ))}
                    </Box>

                    {/* Calendar days */}
                    <Box display="flex" flexWrap="wrap">
                      {days.map((day, index) => (
                        <Box
                          key={index}
                          sx={{
                            width: '14.28%',
                            height: 40,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: day ? 'pointer' : 'default',
                            backgroundColor: day ? (
                              isDateSelected(day) ? '#14B8A6' :
                                isDateInRange(day) ? '#CCFBF1' :
                                  isDateInScheduleRange(day) ? '#F0F9FF' : '#F9FAFB'
                            ) : '#F9FAFB',
                            color: day ? (
                              isDateSelected(day) ? 'white' :
                                isDateInScheduleRange(day) ? '#1F2937' : '#9CA3AF'
                            ) : '#9CA3AF',
                            border: '1px solid #E5E7EB',
                            '&:hover': day && isDateInScheduleRange(day) ? {
                              backgroundColor: isDateSelected(day) ? '#0F766E' : '#F3F4F6'
                            } : {},
                            opacity: day && !isDateInScheduleRange(day) ? 0.3 : 1,
                          }}
                          onClick={() => day && isDateInScheduleRange(day) && handleDateClick(day)}
                        >
                          {day?.getDate()}
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </Box>

                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<Add />}
                  onClick={handleAddLeaveEntry}
                  sx={{
                    backgroundColor: '#14B8A6',
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 500,
                    '&:hover': { backgroundColor: '#0F766E' }
                  }}
                >
                  Add Leave Entry
                </Button>
              </Paper>
            </Grid>
          </Grid>

          {/* Summary of Added Leaves */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" fontWeight="bold" color="#1F2937" gutterBottom>
              Summary of Added Leaves
            </Typography>

            <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#F9FAFB' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>EMPLOYEE</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>DATES</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>LEAVE TYPE</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>ACTIONS</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {leaveEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{entry.employee}</TableCell>
                      <TableCell>
                        {entry.dates.map(date => formatDateDDMMYYYY(new Date(date))).join(', ')}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={entry.leaveType}
                          size="small"
                          color="primary"
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => handleEditLeaveEntry(entry)}>
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleRemoveLeaveEntry(entry.id)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {leaveEntries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ color: '#9CA3AF', py: 4 }}>
                        No leave entries added yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button
            onClick={onClose}
            sx={{
              color: '#6B7280',
              textTransform: 'none',
              fontWeight: 500,
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleGenerateRoster}
            disabled={generateRosterMutation.isPending}
            sx={{
              backgroundColor: '#14B8A6',
              '&:hover': { backgroundColor: '#0F766E' },
              textTransform: 'none',
              fontWeight: 500,
              px: 4,
            }}
          >
            {generateRosterMutation.isPending ? 'Generating...' : 'Generate Roster'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default RosterInputOverlay;
