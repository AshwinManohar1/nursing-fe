import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { ThemeProvider } from "@mui/material";
import theme from "../theme/theme";
import {
  Box,
  Typography,
  Button,
  Paper,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Collapse,
  IconButton,
  Tooltip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Grid,
} from "@mui/material";
import {
  Print,
  Download,
  AutoFixHigh,
  Warning,
  Summarize,
  CalendarMonth,
  FilterList,
  Bolt,
  Delete,
} from "@mui/icons-material";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { useRosters, usePatchRoster, useDeleteRoster } from "../api/hooks";
import { fetchWards as apiFetchWards } from "../api/index";
import type { RosterPatchRequest, TransferRecord } from "../api/types";
import { useAuth } from "../contexts/AuthContext";
import RosterCopilot from "../components/RosterCopilot";
import RosterInputOverlay from "../components/RosterInputOverlay";
import PrintPreview from "../components/PrintPreview";
import { exportRosterToExcel } from "../utils/excelExport";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

interface Shift {
  id: string;
  type: string; // human readable from API shifts map
  code: string; // raw shift code (M/E/N/G/ME/OFF)
  staffId: string;
  staffName: string;
}

interface DayShifts {
  [staffId: string]: Shift[];
}

interface WeekData {
  [dayKey: string]: DayShifts;
}

interface TransferRowMeta {
  transferId: string;
  dayIndex: number;
  date: string;
  shiftCode: string; // This is to_shift (the shift in destination ward)
  fromShift?: string;
  toShift?: string;
  fromWardId?: string;
  toWardId?: string;
}

interface TransferRow {
  rowId: string;
  empId: string;
  name: string;
  grade?: string;
  position?: string;
  contact_no?: string;
  email?: string | null;
  meta: TransferRowMeta;
}

const RosterPage = () => {
  const { user } = useAuth();
  const { data: rosters, refetch: refetchRosters } = useRosters();
  const patchRosterMutation = usePatchRoster();
  const deleteRosterMutation = useDeleteRoster();
  const [selectedWardId, setSelectedWardId] = useState<string>("");
  const [selectedRosterId, setSelectedRosterId] = useState<string>("");
  const [weekData, setWeekData] = useState<WeekData>({});
  const [suggestions, setSuggestions] = useState<Shift[]>([]);
  const [showCopilot, setShowCopilot] = useState(true);
  const [openOverlay, setOpenOverlay] = useState(false);
  const [showShiftSelector, setShowShiftSelector] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{dayKey: string, staffId: string} | null>(null);
  const [showSummaryRow, setShowSummaryRow] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [gradeFilter, setGradeFilter] = useState<string>("ALL");
  const [shiftFilter, setShiftFilter] = useState<string>("ALL");
  const [dayFilter, setDayFilter] = useState<string>("ALL");
  const [nameFilter, setNameFilter] = useState<string>("");
  const [wards, setWards] = useState<Array<{ _id?: string; id?: string; name: string }>>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [excelDateRangeOpen, setExcelDateRangeOpen] = useState(false);
  const [excelStartDate, setExcelStartDate] = useState<Date | null>(null);
  const [excelEndDate, setExcelEndDate] = useState<Date | null>(null);

  // Filter rosters based on user role
  const userRole = user?.role?.toUpperCase();
  const isWardIncharge = userRole === 'WARD_INCHARGE';
  const userWardIds = useMemo(() => user?.ward_id || [], [user?.ward_id]);
  
  // For ward_incharge, only show rosters for their assigned wards
  const filteredRosters = useMemo(() => {
    if (isWardIncharge && userWardIds.length > 0) {
      return (rosters || []).filter(r => {
        const rosterWardId = r?.roster_input?.ward_id;
        return rosterWardId && userWardIds.includes(rosterWardId);
      });
    }
    return rosters || [];
  }, [isWardIncharge, rosters, userWardIds]);

  const selectedRoster = filteredRosters.find(roster => roster.roster_id === selectedRosterId);
  const wardsById = useMemo(() => {
    const map = new Map<string, string>();
    wards.forEach((ward) => {
      const wardId = ward._id || ward.id;
      if (wardId) {
        map.set(wardId, ward.name);
      }
    });
    return map;
  }, [wards]);

  const selectedWardName: string | undefined = selectedWardId ? wardsById.get(selectedWardId) : undefined;
  const rostersForWard = useMemo(() => {
    if (!selectedWardId) return [];
    return filteredRosters.filter(r => r?.roster_input?.ward_id === selectedWardId);
  }, [filteredRosters, selectedWardId]);

  const rosterDays: Date[] = useMemo(() => {
    if (!selectedRoster?.roster_input?.meta) return [];
    const rosterStartDate = new Date(selectedRoster.roster_input.meta.schedule_start_date);
    const rosterEndDate = new Date(selectedRoster.roster_input.meta.schedule_end_date);
    const days: Date[] = [];
    const currentDate = new Date(rosterStartDate);
    while (currentDate <= rosterEndDate) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return days;
  }, [selectedRoster?.roster_input?.meta]);

  const transferRows = useMemo<TransferRow[]>(() => {
    if (!selectedRoster?.transfers?.length) return [];
    return selectedRoster.transfers
      .filter((transfer: TransferRecord) => transfer.direction === 'in')
      .map((transfer) => {
        const snapshot = transfer.staff_snapshot || {};
        const rowId = `transfer-${transfer.transfer_id || transfer.employee_id}-${transfer.day_index}`;
        return {
          rowId,
          empId: transfer.employee_id,
          name: snapshot.name || `Employee ${transfer.employee_id}`,
          grade: snapshot.grade,
          position: snapshot.position,
          contact_no: snapshot.contact_no,
          email: snapshot.email,
          meta: {
            transferId: transfer.transfer_id || rowId,
            dayIndex: Number(transfer.day_index),
            date: transfer.transfer_date,
            shiftCode: transfer.to_shift, // Use to_shift as that's the shift in the destination ward
            fromShift: transfer.from_shift,
            toShift: transfer.to_shift,
            fromWardId: transfer.from_ward_id,
            toWardId: transfer.to_ward_id,
          }
        };
      });
  }, [selectedRoster?.transfers]);

  const transferRowMap = useMemo(() => {
    const map = new Map<string, TransferRow>();
    transferRows.forEach((row) => map.set(row.rowId, row));
    return map;
  }, [transferRows]);

  const resolveWardName = (wardId?: string) => {
    if (!wardId) return undefined;
    const match = wards.find((w) => (w._id || w.id) === wardId);
    return match?.name || wardId;
  };

  const printTransfers = useMemo(() => {
    return transferRows.map(row => ({
      ...row,
      meta: {
        ...row.meta,
        fromWardName: resolveWardName(row.meta.fromWardId)
      }
    }));
  }, [transferRows, wards]);
  
  // Clear selectedRosterId if it doesn't match any available roster
  useEffect(() => {
    if (filteredRosters && filteredRosters.length > 0 && selectedRosterId && !selectedRoster) {
      console.warn('Selected roster ID not found in available rosters, clearing selection');
      setSelectedRosterId("");
    }
  }, [filteredRosters, selectedRosterId, selectedRoster]);

  // Auto-select latest roster only when needed (do not override explicit user choice)
  useEffect(() => {
    if (!filteredRosters || filteredRosters.length === 0) return;

    // Sort rosters by creation date to ensure we get the truly latest one
    const sortedRosters = [...filteredRosters].sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return dateB.getTime() - dateA.getTime();
    });
    const latestRoster = sortedRosters[0];

    // Initialize ward from latest roster if none selected
    if (!selectedWardId && latestRoster?.roster_input?.ward_id) {
      setSelectedWardId(latestRoster.roster_input.ward_id);
      return; // will re-run after ward is set
    }

    // If we have a ward selected but no roster selected, pick most recent roster for that ward
    if (selectedWardId && !selectedRosterId) {
      const wardRosters = sortedRosters.filter(r => r?.roster_input?.ward_id === selectedWardId);
      const latestForWard = wardRosters[0];
      if (latestForWard?.roster_id) {
        setSelectedRosterId(latestForWard.roster_id);
      }
    }
  }, [filteredRosters, selectedWardId, selectedRosterId]);

  // Load wards list to resolve ward names
  useEffect(() => {
    const load = async () => {
      try {
        const response = await apiFetchWards();
        const wardsList = (response as any).wards || response;
        const allWards = Array.isArray(wardsList) ? wardsList : [];
        
        // For ward_incharge, filter to only show assigned wards
        if (isWardIncharge && userWardIds.length > 0) {
          const filteredWards = allWards.filter((w: any) => {
            const wardId = w._id || w.id;
            return wardId && userWardIds.includes(String(wardId));
          });
          setWards(filteredWards);
        } else {
          setWards(allWards);
        }
      } catch (e) {
        // fail silently for header label
        setWards([]);
      }
    };
    load();
  }, [isWardIncharge, userWardIds]);

  // Generate week data from roster (including transfer rows)
  useEffect(() => {
    if (!selectedRoster?.roster_input?.meta || rosterDays.length === 0) {
      setWeekData({});
      setSuggestions([]);
      return;
    }

    const newWeekData: WeekData = {};
    const staffDetails = selectedRoster.roster_input.staff_details || [];

    rosterDays.forEach(day => {
      const dayKey = day.toISOString().split('T')[0];
      newWeekData[dayKey] = {};

      staffDetails.forEach(staff => {
        if (staff && staff.id) {
          newWeekData[dayKey][staff.id] = [];
        }
      });

      transferRows.forEach(transfer => {
        newWeekData[dayKey][transfer.rowId] = [];
      });
    });

    staffDetails.forEach(staff => {
      if (!staff || !staff.emp_id) return;
      const staffRoster = selectedRoster.roster?.[staff.emp_id] || {};

      rosterDays.forEach((day, dayIndex) => {
        const dayKey = day.toISOString().split('T')[0];

        const shiftCodes = staffRoster[dayIndex.toString()] || [];

        shiftCodes.forEach((shiftCode, shiftIndex) => {
          if (shiftCode) {
            const shiftType = getShiftType(shiftCode);
            const shift: Shift = {
              id: `${staff.emp_id}-${dayKey}-${shiftCode}-${dayIndex}-${shiftIndex}`,
              type: shiftType,
              code: shiftCode,
              staffId: staff.id,
              staffName: staff.name,
            };

            if (staff.id) {
              newWeekData[dayKey][staff.id].push(shift);
            }
          }
        });
      });
    });

    transferRows.forEach((transferRow) => {
      const targetDay = rosterDays[transferRow.meta.dayIndex];
      if (!targetDay) return;
      const dayKey = targetDay.toISOString().split('T')[0];
      const shiftCode = transferRow.meta.shiftCode || 'M';
      const shiftType = getShiftType(shiftCode);
      const shift: Shift = {
        id: `${transferRow.rowId}-${dayKey}-${shiftCode}`,
        type: shiftType,
        code: shiftCode,
        staffId: transferRow.rowId,
        staffName: transferRow.name,
      };
      newWeekData[dayKey][transferRow.rowId].push(shift);
    });

    setWeekData(newWeekData);

    const availableShiftCodes = Object.keys(selectedRoster.roster_input.shift_definitions || {});
    const desiredCount = 4;
    const selectedCodes: string[] = [];
    if (availableShiftCodes.includes('ME')) {
      selectedCodes.push('ME');
    }
    for (const code of availableShiftCodes) {
      if (selectedCodes.length >= desiredCount) break;
      if (!selectedCodes.includes(code)) {
        selectedCodes.push(code);
      }
    }
    const suggestionShifts: Shift[] = selectedCodes.map((code, index) => ({
      id: `suggestion-${code}-${index + 1}`,
      type: getShiftType(code),
      code,
      staffId: '',
      staffName: 'Available'
    }));
    setSuggestions(suggestionShifts);
  }, [selectedRoster, rosterDays, transferRows]);


  const getShiftType = (code: string): string => {
    if (!selectedRoster || !selectedRoster.roster_input || !selectedRoster.roster_input.shift_definitions) return code;
    return selectedRoster.roster_input.shift_definitions[code]?.name || code;
  };

  const getShiftColor = (code: string) => {
    // Light colors to match the design
    const colors: { [key: string]: { bg: string; text: string } } = {
      'M': { bg: '#D1FAE5', text: '#065F46' }, // Morning - Light Green
      'E': { bg: '#DBEAFE', text: '#1E40AF' }, // Evening - Light Blue
      'N': { bg: '#E9D5FF', text: '#6B21A8' }, // Night - Light Purple
      'G': { bg: '#FEF3C7', text: '#92400E' }, // General - Light Yellow
      'ME': { bg: '#FED7D7', text: '#C53030' }, // Morning+Evening - Light Red
      'OFF': { bg: '#F3F4F6', text: '#6B7280' }, // Off - Light Grey
    };
    return colors[code] || { bg: '#F3F4F6', text: '#6B7280' };
  };


  // Calculate weekly shift counts for a staff member across the roster period (includes OFF)
  // G is split into M+E, G is not shown separately
  const getWeeklyShiftCounts = (staffId: string) => {
    if (!selectedRoster || !selectedRoster.roster_input || !selectedRoster.roster_input.shift_definitions) return {} as Record<string, number>;
    const counts: Record<string, number> = {
      M: 0,
      E: 0,
      N: 0,
      OFF: 0
    };

    // Treat these codes as OFF-equivalent (leave types, preferences, etc.)
    const offEquivalentCodes = new Set<string>([
      'OFF', 'PREF', 'PL', 'CL', 'SL', 'LWP'
    ]);

    rosterDays.forEach((day) => {
      const dayKey = day.toISOString().split('T')[0];
      const shiftsForDay = weekData[dayKey]?.[staffId] || [];
      if (shiftsForDay.length === 0) {
        counts['OFF'] = (counts['OFF'] || 0) + 1;
      } else {
        shiftsForDay.forEach((shift) => {
          const code = shift.code;
          // Count any leave-like code as OFF
          if (offEquivalentCodes.has(code)) {
            counts['OFF'] = (counts['OFF'] || 0) + 1;
          }
          else if (code === 'ME') {
            // ME contributes to both Morning and Evening counts
            counts['M'] = (counts['M'] || 0) + 1;
            counts['E'] = (counts['E'] || 0) + 1;
          }
          else if (code === 'G') {
            // G (General) splits into both M and E
            counts['M'] = (counts['M'] || 0) + 1;
            counts['E'] = (counts['E'] || 0) + 1;
          }
          else if (code === 'M') {
            counts['M'] = (counts['M'] || 0) + 1;
          }
          else if (code === 'E') {
            counts['E'] = (counts['E'] || 0) + 1;
          }
          else if (code === 'N') {
            counts['N'] = (counts['N'] || 0) + 1;
          }
        });
      }
    });

    return counts;
  };

  // Calculate total hours for a staff member across the roster period
  const getWeeklyTotalHours = (staffId: string) => {
    if (!selectedRoster || !selectedRoster.roster_input || !selectedRoster.roster_input.shift_definitions) return 0;

    const shiftDefs = selectedRoster.roster_input.shift_definitions;
    const offEquivalentCodes = new Set<string>([
      'OFF', 'PREF', 'PL', 'CL', 'SL', 'LWP'
    ]);

    let total = 0;
    rosterDays.forEach((day) => {
      const dayKey = day.toISOString().split('T')[0];
      const shiftsForDay = weekData[dayKey]?.[staffId] || [];
      shiftsForDay.forEach((shift) => {
        const code = shift.code;
        if (offEquivalentCodes.has(code)) {
          return; // leaves/off count as 0 hours
        }
        const hours = shiftDefs[code]?.hours ?? 0;
        total += typeof hours === 'number' ? hours : 0;
      });
    });
    return total;
  };

  

  // Calculate HN vs ON counts for each day and shift
  const getDayShiftCounts = (dayKey: string) => {
    if (!selectedRoster || !selectedRoster.roster_input || !selectedRoster.roster_input.staff_details) return { M: { HN: 0, ON: 0 }, E: { HN: 0, ON: 0 }, N: { HN: 0, ON: 0 } };
      
    const dayShifts = weekData[dayKey] || {};
    const counts = { M: { HN: 0, ON: 0 }, E: { HN: 0, ON: 0 }, N: { HN: 0, ON: 0 } };
    
    // Iterate through all staff for this day
    Object.entries(dayShifts).forEach(([staffId, shifts]) => {
      const staff = selectedRoster.roster_input.staff_details.find(s => s && s.id === staffId);
      const transfer = staff ? undefined : transferRowMap.get(staffId);
      if (!staff && !transfer) return;
      
      // Determine if staff is HN (N5, N4) or ON (all other grades)
      const gradeValue = staff?.grade || transfer?.grade || '';
      const isHN = gradeValue === 'N5' || gradeValue === 'N4';
      
      // Count shifts for this staff member
      shifts.forEach(shift => {
        const shiftCode = shift.code;
        
        // Map shift codes to shift types
        if (shiftCode === 'M') {
          counts.M[isHN ? 'HN' : 'ON']++;
        } else if (shiftCode === 'E') {
          counts.E[isHN ? 'HN' : 'ON']++;
        } else if (shiftCode === 'N') {
          counts.N[isHN ? 'HN' : 'ON']++;
        } else if (shiftCode === 'G') {
          // General shifts count in both M and E
          counts.M[isHN ? 'HN' : 'ON']++;
          counts.E[isHN ? 'HN' : 'ON']++;
        }
        // ME shifts count in both M and E
        else if (shiftCode === 'ME') {
          counts.M[isHN ? 'HN' : 'ON']++;
          counts.E[isHN ? 'HN' : 'ON']++;
        }
      });
    });
    
    return counts;
  };

  // Date-based styling removed per design



  // Simple violation detection - in a real app this would be more sophisticated
  const hasViolation = (staffId: string, dayKey: string) => {
    // Mock violation for demonstration - in real app this would check actual constraints
    const mockViolations = [
      { staffId: 'mock-staff-1', dayKey: '2024-06-05' },
      { staffId: 'mock-staff-2', dayKey: '2024-06-06' },
    ];
    return mockViolations.some(v => v.staffId === staffId && v.dayKey === dayKey);
  };

  const handleDragEnd = (result: any) => {
    console.log('handleDragEnd called with result:', result);
    const { destination, source } = result;

    if (!destination || !selectedRosterId) {
      console.log('Early return - no destination or selectedRosterId:', { destination, selectedRosterId });
      return;
    }

    const { droppableId: sourceDroppableId, index: sourceIndex } = source;
    const { droppableId: destDroppableId, index: destIndex } = destination;
    
    console.log('Drag details:', { sourceDroppableId, destDroppableId, sourceIndex, destIndex });

    // If dropped in the same position, do nothing
    if (sourceDroppableId === destDroppableId && sourceIndex === destIndex) {
      return;
    }

    // Handle moving from suggestions to roster
    if (sourceDroppableId === 'suggestions') {
      console.log('Moving from suggestions to roster');
      const shift = suggestions[sourceIndex];
      const newShift = { ...shift, id: `${Date.now()}-${destDroppableId}` };
      
      setSuggestions(prev => prev.filter((_, index) => index !== sourceIndex));
      
      if (destDroppableId.startsWith('day-')) {
        // Parse droppableId format: "day-YYYY-MM-DD-staffId"
        const destParts = destDroppableId.replace('day-', '').split('-');
        const dayKey = `${destParts[0]}-${destParts[1]}-${destParts[2]}`;
        const staffId = destParts.slice(3).join('-'); // Join remaining parts for staff ID
        
        console.log('Parsed dayKey and staffId:', { dayKey, staffId });
        
        setWeekData(prev => ({
          ...prev,
          [dayKey]: {
            ...prev[dayKey],
            [staffId]: [...(prev[dayKey]?.[staffId] || []), newShift]
          }
        }));

        // Send patch to API
        console.log('Calling sendRosterPatch for suggestions->roster');
        sendRosterPatch(dayKey, staffId, shift.code, 'add');
      }
      return;
    }

    // Handle moving within roster
    if (sourceDroppableId.startsWith('day-') && destDroppableId.startsWith('day-')) {
      console.log('Moving within roster');
      
      // Parse droppableId format: "day-YYYY-MM-DD-staffId"
      const sourceParts = sourceDroppableId.replace('day-', '').split('-');
      const destParts = destDroppableId.replace('day-', '').split('-');
      
      // Reconstruct date from parts (YYYY-MM-DD)
      const sourceDayKey = `${sourceParts[0]}-${sourceParts[1]}-${sourceParts[2]}`;
      const sourceStaffId = sourceParts.slice(3).join('-'); // Join remaining parts for staff ID
      
      const destDayKey = `${destParts[0]}-${destParts[1]}-${destParts[2]}`;
      const destStaffId = destParts.slice(3).join('-'); // Join remaining parts for staff ID

      console.log('Parsed roster move details:', { sourceDayKey, sourceStaffId, destDayKey, destStaffId });

      const sourceShifts = weekData[sourceDayKey]?.[sourceStaffId] || [];
      let shift: Shift | undefined = sourceShifts[sourceIndex];

      console.log('Source shifts array:', sourceShifts);
      console.log('Source index:', sourceIndex);
      console.log('Found shift to move:', shift);

      // Fallback: if shift is not found by index, try to find it by draggableId
      if (!shift && result.draggableId) {
        console.log('Shift not found by index, trying to find by draggableId:', result.draggableId);
        shift = sourceShifts.find(s => s.id === result.draggableId);
        console.log('Found shift by draggableId:', shift);
      }

      if (!shift) {
        console.error('No shift found at index', sourceIndex, 'or by draggableId', result.draggableId, 'in array:', sourceShifts);
        return;
      }

      // Remove from source
      setWeekData(prev => ({
        ...prev,
        [sourceDayKey]: {
          ...prev[sourceDayKey],
          [sourceStaffId]: sourceShifts.filter(s => s.id !== shift.id)
        }
      }));

      // Add to destination
      setWeekData(prev => ({
        ...prev,
        [destDayKey]: {
          ...prev[destDayKey],
          [destStaffId]: [...(prev[destDayKey]?.[destStaffId] || []), shift]
        }
      }));

      // Send patches to API
      console.log('Calling sendRosterPatch for roster->roster move');
      
      // Check if source will be empty after move - use the updated state
      const currentSourceShifts = weekData[sourceDayKey]?.[sourceStaffId] || [];
      const remainingSourceShifts = currentSourceShifts.filter(s => s.id !== shift.id);
      
      if (remainingSourceShifts.length === 0) {
        // If source becomes empty, set to OFF
        sendRosterPatch(sourceDayKey, sourceStaffId, 'OFF', 'replace');
      } else {
        // If source still has shifts, just remove the moved shift
        sendRosterPatch(sourceDayKey, sourceStaffId, shift.code, 'remove');
      }
      
      sendRosterPatch(destDayKey, destStaffId, shift.code, 'add');
    }
  };

  const handleRemoveShift = (dayKey: string, staffId: string, shiftCode: string) => {
    console.log('Removing shift:', { dayKey, staffId, shiftCode });
    
    // Update local state immediately
    setWeekData(prev => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        [staffId]: prev[dayKey]?.[staffId]?.filter(shift => shift.code !== shiftCode) || []
      }
    }));
    
    // Send API call
    sendRosterPatch(dayKey, staffId, shiftCode, 'remove');
  };

  const handleAddShift = (dayKey: string, staffId: string) => {
    console.log('Adding shift to:', { dayKey, staffId });
    
    if (!selectedRoster || !selectedRoster.roster_input.shift_definitions) {
      console.log('No roster or shifts available');
      return;
    }
    
    // Check if cell already has too many shifts (prevent UI overflow)
    const existingShifts = weekData[dayKey]?.[staffId] || [];
    if (existingShifts.length >= 3) {
      console.log('Cell already has maximum shifts');
      return;
    }
    
    setSelectedCell({ dayKey, staffId });
    setShowShiftSelector(true);
  };

  const handleShiftSelected = (shiftCode: string) => {
    if (!selectedCell || !selectedRoster) return;
    
    const { dayKey, staffId } = selectedCell;
    
    // Check if shift already exists to prevent duplicates
    const existingShifts = weekData[dayKey]?.[staffId] || [];
    const shiftExists = existingShifts.some(shift => shift.code === shiftCode);
    
    if (shiftExists) {
      console.log('Shift already exists, not adding duplicate');
      setShowShiftSelector(false);
      setSelectedCell(null);
      return;
    }
    
    const shiftType = getShiftType(shiftCode);
    
    // Create new shift object
    const newShift: Shift = {
      id: `${staffId}-${dayKey}-${shiftCode}-${Date.now()}`,
      type: shiftType,
      code: shiftCode,
      staffId: staffId,
      staffName: selectedRoster.roster_input.staff_details.find(s => s.id === staffId)?.name || '',
    };
    
    // Update local state immediately
    setWeekData(prev => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        [staffId]: [...(prev[dayKey]?.[staffId] || []), newShift]
      }
    }));
    
    // Send API call
    sendRosterPatch(dayKey, staffId, shiftCode, 'add');
    
    // Close selector
    setShowShiftSelector(false);
    setSelectedCell(null);
  };

  const sendRosterPatch = (dayKey: string, staffId: string, shiftCode: string, operation: 'add' | 'remove' | 'replace') => {
    console.log('sendRosterPatch called with:', { dayKey, staffId, shiftCode, operation, selectedRoster: !!selectedRoster });
    if (!selectedRoster) {
      console.log('No selectedRoster, returning early');
      return;
    }

    // Find the staff member by ID to get their emp_id
    const staffMember = selectedRoster.roster_input.staff_details?.find(s => s && s.id === staffId);
    console.log('Looking for staff member with ID:', staffId, 'Found:', staffMember);
    if (!staffMember || !staffMember.emp_id) {
      console.log('Staff member not found or missing emp_id, returning early');
      return;
    }

    // Find the day index for this date
    if (!selectedRoster.roster_input.meta || !selectedRoster.roster_input.meta.schedule_start_date) {
      console.log('Missing roster meta data, returning early');
      return;
    }
    const rosterStartDate = new Date(selectedRoster.roster_input.meta.schedule_start_date);
    const targetDate = new Date(dayKey);
    const dayIndex = Math.floor((targetDate.getTime() - rosterStartDate.getTime()) / (1000 * 60 * 60 * 24));

    // Get current shifts for this staff/day
    const currentShifts = selectedRoster.roster?.[staffMember.emp_id]?.[dayIndex.toString()] || [];
    let newShifts: string[] = [...currentShifts];

    if (operation === 'add') {
      // Add the new shift to the array
      if (!newShifts.includes(shiftCode)) {
        newShifts.push(shiftCode);
      }
    } else if (operation === 'remove') {
      // Remove the specific shift from the array
      newShifts = newShifts.filter(shift => shift !== shiftCode);
      // If no shifts left, set to ["OFF"]
      if (newShifts.length === 0) {
        newShifts = ['OFF'];
      }
    } else if (operation === 'replace') {
      // Replace with the new value (e.g., "OFF")
      newShifts = [shiftCode];
    }

    const patches: RosterPatchRequest = {
      patches: [
        {
          op: 'replace',
          path: `/roster/${staffMember.emp_id}/${dayIndex}`,
          value: newShifts
        }
      ]
    };

    console.log('Sending roster patch:', {
      rosterId: selectedRosterId,
      patches,
      operation,
      dayKey,
      staffId,
      shiftCode,
      currentShifts,
      newShifts
    });

    patchRosterMutation.mutate(
      { roster_id: selectedRosterId, payload: patches },
      {
        onSuccess: (response) => {
          console.log('Roster updated successfully:', response);
        },
        onError: (error) => {
          console.error('Failed to update roster:', error);
          // Revert the UI change on API failure
          // Note: In a production app, you might want to show a toast notification
          // and implement proper error recovery
        }
      }
    );
  };

  // Handle roster deletion
  const handleDeleteRoster = () => {
    if (!selectedRosterId) return;
    
    deleteRosterMutation.mutate(selectedRosterId, {
      onSuccess: () => {
        setDeleteConfirmOpen(false);
        // Clear selection or auto-select next available roster
        const remainingRosters = rostersForWard.filter(r => r.roster_id !== selectedRosterId);
        if (remainingRosters.length > 0) {
          // Select the first available roster (or most recent)
          const sorted = remainingRosters
            .slice()
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          setSelectedRosterId(sorted[0].roster_id);
        } else {
          // No rosters left, clear selection
          setSelectedRosterId("");
        }
      },
      onError: (error) => {
        console.error("Failed to delete roster:", error);
        // Keep dialog open on error so user can retry or cancel
      },
    });
  };

  // Calculate summary counts for print (M, E, N, G, OFF/LEAVE per day)
  const getPrintSummaryCounts = () => {
    if (!selectedRoster || !rosterDays.length) return {};
    
    const summary: { [dayKey: string]: { M: number; E: number; N: number; G: number; OFF_LEAVE: number } } = {};
    
    rosterDays.forEach((day) => {
      const dayKey = day.toISOString().split('T')[0];
      const counts = { M: 0, E: 0, N: 0, G: 0, OFF_LEAVE: 0 };
      
      selectedRoster.roster_input.staff_details?.forEach((staff) => {
        if (!staff || !staff.emp_id) return;
        const staffRoster = selectedRoster.roster?.[staff.emp_id] || {};
        const rosterStartDate = new Date(selectedRoster.roster_input.meta.schedule_start_date);
        const targetDate = new Date(dayKey);
        const dayIndex = Math.floor((targetDate.getTime() - rosterStartDate.getTime()) / (1000 * 60 * 60 * 24));
        
        const shiftCodes = staffRoster[dayIndex.toString()] || [];
        
        if (shiftCodes.length === 0 || shiftCodes.includes('OFF')) {
          counts.OFF_LEAVE++;
        } else {
          // Check for leave types
          const leaveCodes = ['L', 'PL', 'CL', 'SL', 'LWP', 'PREF'];
          const hasLeave = shiftCodes.some(code => leaveCodes.includes(code));
          
          if (hasLeave) {
            counts.OFF_LEAVE++;
          } else {
            // Count shift types (simple totals, no HN/ON breakdown)
            shiftCodes.forEach(code => {
              if (code === 'M') counts.M++;
              else if (code === 'E') counts.E++;
              else if (code === 'N') counts.N++;
              else if (code === 'G') {
                // G is kept as a separate count
                counts.G++;
              } else if (code === 'ME') {
                // ME counts as both M and E
                counts.M++;
                counts.E++;
              }
            });
          }
        }
      });
      
      summary[dayKey] = counts;
    });
    
    return summary;
  };

  // Handle print
  const handlePrint = () => {
    if (!selectedRoster) return;
    window.print();
  };

  // Handle download as Excel
  const handleDownload = async () => {
    if (!selectedRoster) return;
    
    // If no date range is set, use the full roster period
    let startDate = excelStartDate || rosterDays[0];
    let endDate = excelEndDate || rosterDays[rosterDays.length - 1];
    
    // Validate date range
    if (!startDate || !endDate) {
      // Open date range picker if dates not set
      setExcelDateRangeOpen(true);
      return;
    }
    
    // Ensure startDate <= endDate
    if (startDate > endDate) {
      [startDate, endDate] = [endDate, startDate];
    }
    
    // Filter roster days to the selected range
    const filteredDays = rosterDays.filter(day => {
      const dayTime = day.getTime();
      return dayTime >= startDate.getTime() && dayTime <= endDate.getTime();
    });
    
    if (filteredDays.length === 0) {
      alert('No days in the selected date range.');
      return;
    }
    
    try {
      await exportRosterToExcel({
        roster: selectedRoster,
        wardName: selectedWardName || 'roster',
        filteredDays,
        startDate,
        endDate,
      });
      
      // Close date range dialog if open
      setExcelDateRangeOpen(false);
    } catch (error) {
      console.error('Error generating Excel:', error);
      alert('Failed to generate Excel file. Please try again.');
    }
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      height: 'calc(100vh - 64px)', // Account for header height
      backgroundColor: '#F8FAFC',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Main Content Area */}
      <Box sx={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column',
        marginRight: showCopilot ? '400px' : 0,
        transition: 'margin-right 0.3s ease',
        overflow: 'hidden'
      }}>
        {/* Header / Toolbar */}
        <Paper sx={{ 
          p: 2, 
          mb: 1.5,
          borderRadius: 0,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}>
          <Grid container spacing={2} alignItems="center">
            {/* Left Section: Title and Controls */}
            <Grid size={{ xs: 12, md: 8 }}>
              <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} gap={{ xs: 2, sm: 3 }} flexWrap="wrap">
                <Typography variant="h4" fontWeight="bold" sx={{ flexShrink: 0 }}>
                  Roster
                </Typography>
                
                {/* Controls: Ward first, then Roster selector, then period */}
                <Box display="flex" alignItems="center" gap={2} flexWrap="wrap" sx={{ flex: 1, minWidth: 0 }}>
                  <FormControl sx={{ minWidth: { xs: '100%', sm: 180, md: 220 }, width: { xs: '100%', sm: 'auto' } }} size="small">
                    <InputLabel>Ward</InputLabel>
                    <Select
                      value={selectedWardId}
                      label="Ward"
                      onChange={(e) => {
                        const wardId = String(e.target.value || "");
                        setSelectedWardId(wardId);
                        // Reset roster selection when ward changes
                        setSelectedRosterId("");
                      }}
                    >
                      {wards.map((w) => (
                        <MenuItem key={w._id || w.id} value={w._id || w.id}>{w.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl sx={{ minWidth: { xs: '100%', sm: 160, md: 200 }, width: { xs: '100%', sm: 'auto' } }} size="small" disabled={!selectedWardId || rostersForWard.length === 0}>
                    <InputLabel>Select Roster</InputLabel>
                    <Select
                      value={selectedRosterId}
                      onChange={(e) => setSelectedRosterId(String(e.target.value))}
                      label="Select Roster"
                    >
                      {rostersForWard.map((roster) => (
                        <MenuItem key={roster.roster_id} value={roster.roster_id}>
                          {(roster.roster_input as any)?.roster_name || roster.roster_input?.meta?.period}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {selectedRoster?.roster_input?.meta && (
                    <Box 
                      display="flex" 
                      alignItems="center" 
                      gap={1} 
                      sx={{ 
                        pl: { xs: 0, sm: 1 }, 
                        borderLeft: { xs: 'none', sm: '1px solid #E5E7EB' },
                        width: { xs: '100%', sm: 'auto' },
                        mt: { xs: 1, sm: 0 }
                      }}
                    >
                      <CalendarMonth sx={{ fontSize: 18, color: '#6B7280' }} />
                      <Typography variant="body2" color="#6B7280" sx={{ fontWeight: 500 }}>
                        {new Date(selectedRoster.roster_input.meta.schedule_start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {` - `}
                        {new Date(selectedRoster.roster_input.meta.schedule_end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </Grid>
            
            {/* Right Section: Action Buttons */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Box display="flex" gap={1} alignItems="center" justifyContent={{ xs: 'flex-start', md: 'flex-end' }} flexWrap="wrap">
                <Tooltip title={showFilters ? 'Hide Filters' : 'Show Filters'} arrow>
                  <IconButton aria-label="toggle-filters" size="small" onClick={() => setShowFilters(v => !v)}>
                    <FilterList />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Print Roster" arrow>
                  <IconButton 
                    aria-label="print" 
                    size="small"
                    onClick={handlePrint}
                    disabled={!selectedRoster}
                  >
                    <Print />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Download Excel" arrow>
                  <IconButton 
                    aria-label="download" 
                    size="small"
                    onClick={handleDownload}
                    disabled={!selectedRoster}
                  >
                    <Download />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Delete Roster" arrow>
                  <span>
                    <IconButton 
                      aria-label="delete-roster" 
                      size="small"
                      onClick={() => setDeleteConfirmOpen(true)}
                      disabled={!selectedRosterId || deleteRosterMutation.isPending}
                      sx={{ color: '#DC2626' }}
                    >
                      <Delete />
                    </IconButton>
                  </span>
                </Tooltip>

                <Tooltip title={showCopilot ? 'Hide Copilot' : 'Show Copilot'} arrow>
                  <IconButton
                    aria-label="toggle-copilot"
                    size="small"
                    onClick={() => setShowCopilot(!showCopilot)}
                    sx={{ color: showCopilot ? '#14B8A6' : undefined }}
                  >
                    <AutoFixHigh />
                  </IconButton>
                </Tooltip>

                <Tooltip title={showSummaryRow ? 'Hide Coverage Summary' : 'Show Coverage Summary'} arrow>
                  <IconButton
                    aria-label="toggle-summary"
                    size="small"
                    onClick={() => setShowSummaryRow(!showSummaryRow)}
                    sx={{ color: showSummaryRow ? '#0EA5E9' : undefined }}
                  >
                    <Summarize />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Next week / Create roster" arrow>
                  <span>
                    <IconButton
                      aria-label="next-week-or-create"
                      size="small"
                      onClick={() => {
                        if (!selectedWardId) {
                          setOpenOverlay(true);
                          return;
                        }
                        // try to find next roster for ward; if not found, open create modal
                        const wardRosters = rostersForWard
                          .slice()
                          .sort((a, b) => new Date(a.roster_input.meta.schedule_start_date).getTime() - new Date(b.roster_input.meta.schedule_start_date).getTime());
                        const currentIndex = wardRosters.findIndex(r => r.roster_id === selectedRosterId);
                        const next = currentIndex >= 0 ? wardRosters[currentIndex + 1] : wardRosters[0];
                        if (next) setSelectedRosterId(next.roster_id);
                        else setOpenOverlay(true);
                      }}
                      disabled={!selectedWardId}
                      sx={{
                        backgroundColor: '#14B8A6',
                        color: 'white',
                        '&:hover': { backgroundColor: '#0F766E' },
                        '&:disabled': { backgroundColor: '#9CA3AF', color: 'white' }
                      }}
                    >
                      <Bolt />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Filters Bar */}
        <Collapse in={showFilters}>
          <Paper sx={{ px: 2, py: 1, mb: 1.5, borderRadius: 0, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" sx={{ color: '#6B7280', mr: 1 }}>
              Filters
            </Typography>
            <TextField
              size="small"
              placeholder="Search name…"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              sx={{ minWidth: 220 }}
            />
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Staff Level</InputLabel>
              <Select value={gradeFilter} label="Staff Level" onChange={(e) => setGradeFilter(e.target.value)}>
                <MenuItem value="ALL">All Levels</MenuItem>
                <MenuItem value="N4">N4</MenuItem>
                <MenuItem value="N5">N5</MenuItem>
                <MenuItem value="N6">N6</MenuItem>
                <MenuItem value="N7">N7</MenuItem>
                <MenuItem value="N8">N8</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Shift</InputLabel>
              <Select value={shiftFilter} label="Shift" onChange={(e) => setShiftFilter(e.target.value)}>
                <MenuItem value="ALL">All Shifts</MenuItem>
                <MenuItem value="M">Morning</MenuItem>
                <MenuItem value="E">Evening</MenuItem>
                <MenuItem value="N">Night</MenuItem>
                <MenuItem value="G">General</MenuItem>
                <MenuItem value="ME">M+E</MenuItem>
                <MenuItem value="OFF">Off</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Day</InputLabel>
              <Select value={dayFilter} label="Day" onChange={(e) => setDayFilter(e.target.value)}>
                <MenuItem value="ALL">All Days</MenuItem>
                {rosterDays.map((d) => {
                  const key = d.toISOString().split('T')[0];
                  const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                  return (
                    <MenuItem key={key} value={key}>{label}</MenuItem>
                  );
                })}
              </Select>
            </FormControl>
            <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
              <Button size="small" onClick={() => { setGradeFilter('ALL'); setShiftFilter('ALL'); setDayFilter('ALL'); setNameFilter(''); }}>
                Reset
              </Button>
            </Box>
          </Paper>
        </Collapse>


        {/* Main Roster View or Empty State */}
        {(!selectedWardId || (selectedWardId && rostersForWard.length === 0) || !selectedRoster) ? (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
            <Paper
              elevation={0}
              sx={{
                maxWidth: 720,
                width: '100%',
                mx: 'auto',
                p: 5,
                textAlign: 'center',
                borderRadius: 3,
                border: '1px solid #E5E7EB',
                background: 'linear-gradient(180deg, #FFFFFF 0%, #FAFAFA 100%)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#E0F2FE',
                    border: '1px solid #BFDBFE',
                  }}
                >
                  <CalendarMonth sx={{ fontSize: 28, color: '#0369A1' }} />
                </Box>
              </Box>
              <Typography variant="h6" sx={{ color: '#0F172A', fontWeight: 700, mb: 0.5 }}>
                {selectedWardId ? 'No roster for this ward yet' : 'Select a ward to view rosters'}
              </Typography>
              {selectedWardId && (
                <Typography variant="body2" sx={{ color: '#6B7280', mb: 3 }}>
                  Create a roster for {selectedWardName || 'this ward'} to get started.
                </Typography>
              )}
              {selectedWardId && (
                <Button
                  variant="contained"
                  onClick={() => setOpenOverlay(true)}
                  sx={{
                    backgroundColor: '#14B8A6',
                    '&:hover': { backgroundColor: '#0F766E' },
                    px: 3,
                    borderRadius: 2,
                    fontWeight: 600,
                  }}
                >
                  Generate Roster
                </Button>
              )}
            </Paper>
          </Box>
        ) : (
        <Box sx={{ 
          flex: 1, 
          overflow: 'hidden', 
          p: 2,
          pb: 6
        }}>
          <DragDropContext onDragEnd={handleDragEnd}>
            {/* Roster Grid */}
            <Paper sx={{ mb: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ overflow: 'auto', flex: 1 }}>
                <Box sx={{ minWidth: 800 }}>
              {/* Header Row */}
              <Box display="flex" sx={{ borderBottom: '2px solid #E5E7EB', position: 'sticky', top: 0, zIndex: 5, backgroundColor: '#F9FAFB' }}>
                <Box sx={{ width: 200, p: 1.5, borderRight: '1px solid #E5E7EB', backgroundColor: '#F9FAFB', position: 'sticky', left: 0, zIndex: 6 }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    Staff
                  </Typography>
                </Box>
                {rosterDays
                  .filter((d) => dayFilter === 'ALL' ? true : d.toISOString().split('T')[0] === dayFilter)
                  .map((day, index) => (
                  <Box
                    key={index}
                    sx={{
                      flex: 1,
                      p: 1.5,
                      textAlign: 'center',
                      borderRight: '1px solid #E5E7EB',
                      backgroundColor: '#F9FAFB',
                      color: '#1F2937',
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight="bold">
                      {day.toLocaleDateString('en-US', { weekday: 'short' })}
                    </Typography>
                    <Typography variant="body2">
                      {day.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Typography>
                  </Box>
                  ))}
              </Box>

              {/* Collapsible Summary Row */}
              {showSummaryRow && selectedRoster && (
                <Box display="flex" sx={{ borderBottom: '1px solid #E5E7EB', backgroundColor: '#F0F9FF' }}>
                  <Box sx={{ width: 200, p: 1, borderRight: '1px solid #E5E7EB', backgroundColor: '#F0F9FF', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'sticky', left: 0, zIndex: 4 }}>
                    <Typography variant="caption" fontWeight="bold" color="#1E40AF">
                      Coverage
                    </Typography>
                  </Box>
                  {rosterDays.map((day) => {
                    const dayKey = day.toISOString().split('T')[0];
                    const counts = getDayShiftCounts(dayKey);
                    
                    return (
                      <Box
                        key={dayKey}
                        sx={{
                          flex: 1,
                          p: 1,
                          borderRight: '1px solid #E5E7EB',
                          backgroundColor: '#F0F9FF',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 0.5,
                        }}
                      >
                        {/* M Shift */}
                        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', mb: 0.5 }}>
                          <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#1E40AF' }}>
                            M:
                          </Typography>
                          <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#059669' }}>
                            {counts.M.HN}
                          </Typography>
                          <Typography variant="caption" sx={{ fontSize: '0.6rem', color: '#6B7280' }}>
                            |
                          </Typography>
                          <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#7C3AED' }}>
                            {counts.M.ON}
                          </Typography>
                        </Box>
                        
                        {/* E Shift */}
                        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', mb: 0.5 }}>
                          <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#1E40AF' }}>
                            E:
                          </Typography>
                          <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#059669' }}>
                            {counts.E.HN}
                          </Typography>
                          <Typography variant="caption" sx={{ fontSize: '0.6rem', color: '#6B7280' }}>
                            |
                          </Typography>
                          <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#7C3AED' }}>
                            {counts.E.ON}
                          </Typography>
                        </Box>
                        
                        {/* N Shift */}
                        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                          <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#1E40AF' }}>
                            N:
                          </Typography>
                          <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#059669' }}>
                            {counts.N.HN}
                          </Typography>
                          <Typography variant="caption" sx={{ fontSize: '0.6rem', color: '#6B7280' }}>
                            |
                          </Typography>
                          <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#7C3AED' }}>
                            {counts.N.ON}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              )}

              {/* Staff Rows */}
              {selectedRoster?.roster_input?.staff_details
                ?.filter((s) => gradeFilter === 'ALL' ? true : s?.grade === gradeFilter)
                ?.filter((s) => (nameFilter || '').trim() === '' ? true : (s?.name || '').toLowerCase().includes(nameFilter.trim().toLowerCase()))
                .map((staff) => {
                if (!staff) return null;
                return (
                  <Box key={staff.id} display="flex" sx={{ borderBottom: '1px solid #E5E7EB' }}>
                    <Box sx={{ width: 200, p: 1.5, borderRight: '1px solid #E5E7EB', backgroundColor: '#F9FAFB', position: 'sticky', left: 0, zIndex: 3 }}>
                      <Typography variant="body2" fontWeight="500">
                        {staff.name || 'Unknown'}
                      </Typography>
                      <Typography variant="caption" color="#6B7280" sx={{ mb: 1, display: 'block' }}>
                        {staff.position || 'Unknown'} • {staff.grade || 'Unknown'}
                      </Typography>
                      
                      {/* Weekly Shift Counts */}
                      <Box sx={{ mb: 1 }}>
                        {(() => {
                          const counts = getWeeklyShiftCounts(staff.id || '');
                          const displayOrder = ['M', 'E', 'N', 'OFF'];
                          return (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {displayOrder
                                .filter(code => counts[code] !== undefined)
                                .map((code) => {
                                  const value = counts[code] || 0;
                                  const colors = getShiftColor(code);
                                  const isOverNormal = code !== 'OFF' && value > 2; // Highlight if > 2
                                  return (
                                    <Box
                                      key={`${staff.id}-${code}`}
                                      sx={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 0.5,
                                        px: 0.5,
                                        py: 0.2,
                                        borderRadius: 12,
                                        backgroundColor: isOverNormal ? '#FEE2E2' : colors.bg,
                                        color: isOverNormal ? '#DC2626' : colors.text,
                                        border: isOverNormal ? '1px solid #DC2626' : '1px solid rgba(0,0,0,0.06)',
                                        fontWeight: isOverNormal ? 'bold' : 'normal',
                                        boxShadow: isOverNormal ? '0 0 0 2px rgba(220, 38, 38, 0.2)' : 'none'
                                      }}
                                    >
                                      <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.65rem' }}>
                                        {code}
                                      </Typography>
                                      <Typography variant="caption" sx={{ fontSize: '0.65rem', opacity: 0.9, fontWeight: isOverNormal ? 'bold' : 'normal' }}>
                                        {value}
                                      </Typography>
                                    </Box>
                                  );
                                })}
                              {/* Total Hours Pill */}
                              {(() => {
                                const totalHours = getWeeklyTotalHours(staff.id || '');
                                return (
                                  <Box
                                    key={`${staff.id}-HRS`}
                                    sx={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 0.5,
                                      px: 0.5,
                                      py: 0.2,
                                      borderRadius: 12,
                                      backgroundColor: '#E0E7FF',
                                      color: '#3730A3',
                                      border: '1px solid rgba(0,0,0,0.06)'
                                    }}
                                  >
                                    <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.65rem' }}>
                                      HRS
                                    </Typography>
                                    <Typography variant="caption" sx={{ fontSize: '0.65rem', opacity: 0.9 }}>
                                      {totalHours}
                                    </Typography>
                                  </Box>
                                );
                              })()}
                            </Box>
                          );
                        })()}
                      </Box>
                    </Box>
                    {rosterDays
                      .filter((d) => dayFilter === 'ALL' ? true : d.toISOString().split('T')[0] === dayFilter)
                      .map((day) => {
                      const dayKey = day.toISOString().split('T')[0];
                      let shifts = weekData[dayKey]?.[staff.id || ''] || [];
                      if (shiftFilter !== 'ALL') {
                        shifts = shifts.filter(s => s.code === shiftFilter || (s.code === 'G' && (shiftFilter === 'M' || shiftFilter === 'E')) || (s.code === 'ME' && (shiftFilter === 'M' || shiftFilter === 'E')));
                        if (shiftFilter === 'OFF' && shifts.length > 0) {
                          shifts = [];
                        }
                        if (shiftFilter === 'OFF' && (weekData[dayKey]?.[staff.id || ''] || []).length === 0) {
                          // leave as empty cell to represent OFF match
                        }
                      }
                      
                      return (
                        <Droppable
                          key={`${dayKey}-${staff.id}`}
                          droppableId={`day-${dayKey}-${staff.id}`}
                          direction="vertical"
                          isDropDisabled={false}
                        >
                          {(provided, snapshot) => (
                            <Box
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              sx={{
                                flex: 1,
                                minHeight: 64,
                                p: 0.75,
                                borderRight: '1px solid #E5E7EB',
                                backgroundColor: snapshot.isDraggingOver ? '#E0F2FE' : 'white',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 0.5,
                                position: 'relative',
                                '&:hover .add-shift-button': {
                                  opacity: 1,
                                },
                              }}
                            >
                              {shifts.map((shift: Shift, index: number) => {
                                const violation = hasViolation(shift.staffId, dayKey);
                                const colors = getShiftColor(shift.code);
                                
                                return (
                                  <Draggable
                                    key={shift.id}
                                    draggableId={shift.id}
                                    index={index}
                                  >
                                    {(provided, snapshot) => (
                                      <Box sx={{ position: 'relative' }}>
                                        <Chip
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          {...provided.dragHandleProps}
                                          label={shift.code === 'ME' ? 'ME' : shift.type}
                                          size="small"
                                          onDelete={(e) => {
                                            e.stopPropagation();
                                            handleRemoveShift(dayKey, shift.staffId, shift.code);
                                          }}
                                          deleteIcon={
                                            <Box
                                              sx={{
                                                fontSize: '12px',
                                                fontWeight: 'bold',
                                                color: 'inherit',
                                                '&:hover': {
                                                  backgroundColor: 'rgba(0,0,0,0.1)',
                                                  borderRadius: '50%',
                                                }
                                              }}
                                            >
                                              ×
                                            </Box>
                                          }
                                          sx={{
                                            backgroundColor: violation ? '#FF5252' : colors.bg,
                                            color: colors.text,
                                            fontWeight: 'bold',
                                          fontSize: '0.72rem',
                                          height: 22,
                                            '&:hover': {
                                              backgroundColor: violation ? '#FF5252' : colors.bg,
                                              opacity: 0.8,
                                            },
                                            transform: snapshot.isDragging ? 'rotate(5deg)' : 'none',
                                            boxShadow: snapshot.isDragging ? '0 4px 8px rgba(0,0,0,0.2)' : 'none',
                                            '& .MuiChip-deleteIcon': {
                                              color: 'inherit',
                                              fontSize: '14px',
                                              '&:hover': {
                                                color: 'inherit',
                                              }
                                            }
                                          }}
                                        />
                                        {violation && (
                                          <Box
                                            sx={{
                                              position: 'absolute',
                                              top: -8,
                                              right: -8,
                                              backgroundColor: '#FF5252',
                                              borderRadius: '50%',
                                              width: 16,
                                              height: 16,
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                            }}
                                          >
                                            <Warning sx={{ fontSize: 10, color: 'white' }} />
                                          </Box>
                                        )}
                                      </Box>
                                    )}
                                  </Draggable>
                                );
                              })}
                              
                              {/* Add Shift Button - only show if cell has less than 3 shifts */}
                              {shifts.length < 3 && (
                                <Box
                                  className="add-shift-button"
                                  sx={{
                                    position: 'absolute',
                                    top: 4,
                                    right: 4,
                                    opacity: 0,
                                    transition: 'opacity 0.2s',
                                  }}
                                >
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (selectedRoster && selectedRoster.roster_input.shift_definitions) {
                                      handleAddShift(dayKey, staff.id || '');
                                    }
                                  }}
                                  sx={{
                                    width: 18,
                                    height: 18,
                                    backgroundColor: '#14B8A6',
                                    color: 'white',
                                    '&:hover': {
                                      backgroundColor: '#0F766E',
                                      transform: 'scale(1.1)',
                                    },
                                    fontSize: '10px',
                                    fontWeight: 'bold',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                    transition: 'all 0.2s',
                                  }}
                                >
                                  +
                                </IconButton>
                                </Box>
                              )}
                              
                              {provided.placeholder}
                            </Box>
                          )}
                        </Droppable>
                      );
                    })}
                  </Box>
                );
              })}

              {/* Transfer Rows */}
              {transferRows
                ?.filter((row) => gradeFilter === 'ALL' ? true : (row.grade || 'UNKNOWN') === gradeFilter)
                ?.filter((row) => (nameFilter || '').trim() === '' ? true : (row.name || '').toLowerCase().includes(nameFilter.trim().toLowerCase()))
                .map((row) => {
                  const fromWardLabel = resolveWardName(row.meta.fromWardId);
                  return (
                    <Box 
                      key={row.rowId} 
                      display="flex" 
                      sx={{ 
                        borderBottom: '1px solid #E5E7EB',
                        backgroundColor: '#E0F2FE'
                      }}
                    >
                      <Box sx={{ width: 200, p: 1.5, borderRight: '1px solid #E5E7EB', backgroundColor: '#F9FAFB', position: 'sticky', left: 0, zIndex: 3 }}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body2" fontWeight="500">
                            {row.name || 'Unknown'}
                          </Typography>
                          <Chip 
                            label="Transfer In" 
                            size="small" 
                            sx={{ backgroundColor: '#0EA5E9', color: 'white', height: 20, fontSize: '0.65rem' }}
                          />
                        </Box>
                        <Typography variant="caption" color="#6B7280" sx={{ mb: 0.5, display: 'block' }}>
                          {row.position || 'Unknown'} • {row.grade || 'Unknown'}
                        </Typography>
                        <Typography variant="caption" color="#0369A1" sx={{ mb: 1, display: 'block', fontStyle: 'italic' }}>
                          From {fromWardLabel || row.meta.fromWardId || 'Unknown'} • {new Date(row.meta.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • Shift {row.meta.shiftCode}
                        </Typography>

                        <Box sx={{ mb: 1 }}>
                          {(() => {
                            const counts = getWeeklyShiftCounts(row.rowId);
                            const displayOrder = ['M', 'E', 'N', 'OFF'];
                            return (
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {displayOrder
                                  .filter(code => counts[code] !== undefined)
                                  .map((code) => {
                                    const value = counts[code] || 0;
                                    const colors = getShiftColor(code);
                                    const isOverNormal = code !== 'OFF' && value > 2;
                                    return (
                                      <Box
                                        key={`${row.rowId}-${code}`}
                                        sx={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: 0.5,
                                          px: 0.5,
                                          py: 0.2,
                                          borderRadius: 12,
                                          backgroundColor: isOverNormal ? '#FEE2E2' : colors.bg,
                                          color: isOverNormal ? '#DC2626' : colors.text,
                                          border: isOverNormal ? '1px solid #DC2626' : '1px solid rgba(0,0,0,0.06)',
                                          fontWeight: isOverNormal ? 'bold' : 'normal',
                                          boxShadow: isOverNormal ? '0 0 0 2px rgba(220, 38, 38, 0.2)' : 'none'
                                        }}
                                      >
                                        <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.65rem' }}>
                                          {code}
                                        </Typography>
                                        <Typography variant="caption" sx={{ fontSize: '0.65rem', opacity: 0.9, fontWeight: isOverNormal ? 'bold' : 'normal' }}>
                                          {value}
                                        </Typography>
                                      </Box>
                                    );
                                  })}
                                {(() => {
                                  const totalHours = getWeeklyTotalHours(row.rowId);
                                  return (
                                    <Box
                                      key={`${row.rowId}-HRS`}
                                      sx={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 0.5,
                                        px: 0.5,
                                        py: 0.2,
                                        borderRadius: 12,
                                        backgroundColor: '#E0E7FF',
                                        color: '#3730A3',
                                        border: '1px solid rgba(0,0,0,0.06)'
                                      }}
                                    >
                                      <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.65rem' }}>
                                        HRS
                                      </Typography>
                                      <Typography variant="caption" sx={{ fontSize: '0.65rem', opacity: 0.9 }}>
                                        {totalHours}
                                      </Typography>
                                    </Box>
                                  );
                                })()}
                              </Box>
                            );
                          })()}
                        </Box>
                      </Box>
                      {rosterDays
                        .filter((d) => dayFilter === 'ALL' ? true : d.toISOString().split('T')[0] === dayFilter)
                        .map((day) => {
                          const dayKey = day.toISOString().split('T')[0];
                          let shifts = weekData[dayKey]?.[row.rowId] || [];
                          if (shiftFilter !== 'ALL') {
                            shifts = shifts.filter(s => s.code === shiftFilter || (s.code === 'G' && (shiftFilter === 'M' || shiftFilter === 'E')) || (s.code === 'ME' && (shiftFilter === 'M' || shiftFilter === 'E')));
                            if (shiftFilter === 'OFF' && shifts.length > 0) {
                              shifts = [];
                            }
                            if (shiftFilter === 'OFF' && (weekData[dayKey]?.[row.rowId] || []).length === 0) {
                              // leave empty cell
                            }
                          }

                          return (
                            <Droppable
                              key={`${dayKey}-${row.rowId}`}
                              droppableId={`day-${dayKey}-${row.rowId}`}
                              direction="vertical"
                              isDropDisabled
                            >
                              {(provided, snapshot) => (
                                <Box
                                  ref={provided.innerRef}
                                  {...provided.droppableProps}
                                  sx={{
                                    flex: 1,
                                    minHeight: 64,
                                    p: 0.75,
                                    borderRight: '1px solid #E5E7EB',
                                    backgroundColor: snapshot.isDraggingOver ? '#E0F2FE' : 'white',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 0.5,
                                    position: 'relative',
                                  }}
                                >
                                  {shifts.map((shift: Shift) => {
                                    const violation = hasViolation(shift.staffId, dayKey);
                                    const colors = getShiftColor(shift.code);

                                    return (
                                      <Box key={shift.id} sx={{ position: 'relative' }}>
                                        <Chip
                                          label={shift.code === 'ME' ? 'ME' : shift.type}
                                          size="small"
                                          sx={{
                                            backgroundColor: violation ? '#FF5252' : colors.bg,
                                            color: colors.text,
                                            fontWeight: 'bold',
                                            fontSize: '0.72rem',
                                            height: 22,
                                          }}
                                        />
                                        {violation && (
                                          <Box
                                            sx={{
                                              position: 'absolute',
                                              top: -8,
                                              right: -8,
                                              backgroundColor: '#FF5252',
                                              borderRadius: '50%',
                                              width: 16,
                                              height: 16,
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                            }}
                                          >
                                            <Warning sx={{ fontSize: 10, color: 'white' }} />
                                          </Box>
                                        )}
                                      </Box>
                                    );
                                  })}

                                  {provided.placeholder}
                                </Box>
                              )}
                            </Droppable>
                          );
                        })}
                    </Box>
                  );
                })}
            </Box>
          </Box>
        </Paper>

        {/* Suggestions Section */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight="bold" color="#1F2937" gutterBottom>
            Suggestions
          </Typography>
          <Droppable droppableId="suggestions" direction="horizontal" isDropDisabled={false}>
            {(provided, snapshot) => (
              <Box
                ref={provided.innerRef}
                {...provided.droppableProps}
                display="flex"
                gap={2}
                flexWrap="wrap"
                sx={{
                  minHeight: 60,
                  p: 2,
                  backgroundColor: snapshot.isDraggingOver ? '#F0F9FF' : '#F9FAFB',
                  borderRadius: 2,
                  border: '2px dashed #D1D5DB',
                }}
              >
                {suggestions.map((shift: Shift, index: number) => {
                  const colors = getShiftColor(shift.code);
                  
                  return (
                    <Draggable
                      key={shift.id}
                      draggableId={shift.id}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <Chip
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          label={shift.code === 'ME' ? 'ME' : shift.type}
                          size="medium"
                          sx={{
                            backgroundColor: colors.bg,
                            color: colors.text,
                            fontWeight: 'bold',
                            height: 32,
                            '&:hover': {
                              backgroundColor: colors.bg,
                              opacity: 0.8,
                            },
                            transform: snapshot.isDragging ? 'rotate(5deg)' : 'none',
                            boxShadow: snapshot.isDragging ? '0 4px 8px rgba(0,0,0,0.2)' : 'none',
                          }}
                        />
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </Box>
            )}
          </Droppable>
            </Paper>
          </DragDropContext>
        </Box>
        )}
      </Box>

      {/* Collapsible AI Copilot */}
      <Collapse 
        in={showCopilot} 
        orientation="horizontal"
        sx={{ 
          position: 'absolute',
          right: 0,
          top: 0,
          height: '100%',
          zIndex: 1000
        }}
      >
        <Box sx={{ 
          width: '400px',
          height: '100%',
          backgroundColor: 'white',
          borderLeft: '1px solid #E2E8F0',
          boxShadow: '-4px 0 8px rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <RosterCopilot
            selectedRosterId={selectedRosterId}
            onClose={() => setShowCopilot(false)}
          />
        </Box>
      </Collapse>

      {/* Input Overlay */}
      <RosterInputOverlay
        open={openOverlay}
        onClose={() => setOpenOverlay(false)}
        onGenerated={async (newRosterId?: string) => {
          setOpenOverlay(false);
          // Refetch rosters to get the newly created one
          const { data: updatedRosters } = await refetchRosters();
          // If we have a new roster ID, select it
          if (newRosterId) {
            // Check if the new roster exists in the updated list and matches the selected ward
            const newRoster = updatedRosters?.find(r => r.roster_id === newRosterId);
            if (newRoster && newRoster.roster_input?.ward_id === selectedWardId) {
              setSelectedRosterId(newRosterId);
            } else if (newRoster && !selectedWardId) {
              // If no ward is selected, select the ward and then the roster
              setSelectedWardId(newRoster.roster_input?.ward_id || "");
              // The useEffect will handle selecting the roster after ward is set
            } else if (newRoster) {
              // Roster exists but for different ward - just select it anyway
              setSelectedRosterId(newRosterId);
            }
          } else {
            // If no roster ID provided, let the auto-select logic handle it
            // The useEffect will pick the latest roster for the selected ward
          }
        }}
      />

      {/* Shift Selector Modal */}
      {showShiftSelector && selectedRoster && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => {
            setShowShiftSelector(false);
            setSelectedCell(null);
          }}
        >
          <Paper
            sx={{
              p: 3,
              minWidth: 300,
              maxWidth: 400,
              borderRadius: 2,
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Typography variant="h6" sx={{ mb: 2, textAlign: 'center' }}>
              Select Shift Type
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
              Choose which shift to add to this slot
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {!selectedRoster.roster_input.shift_definitions || Object.entries(selectedRoster.roster_input.shift_definitions).length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  No shifts available
                </Typography>
              ) : (
                Object.entries(selectedRoster.roster_input.shift_definitions).map(([code, shift]) => {
                  if (!shift) return null;
                const colors = getShiftColor(code);
                return (
                  <Button
                    key={code}
                    variant="outlined"
                    onClick={() => handleShiftSelected(code)}
                    sx={{
                      justifyContent: 'flex-start',
                      p: 2,
                      borderColor: colors.bg,
                      color: colors.text,
                      backgroundColor: colors.bg,
                      '&:hover': {
                        backgroundColor: colors.bg,
                        opacity: 0.8,
                        borderColor: colors.text,
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          backgroundColor: colors.text,
                        }}
                      />
                      <Typography variant="body2" fontWeight="500">
                        {shift.name}
                      </Typography>
                      <Typography variant="caption" sx={{ ml: 'auto', opacity: 0.7 }}>
                        {shift.hours}h
                      </Typography>
                    </Box>
                  </Button>
                );
              })
              )}
            </Box>
            
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
              <Button
                variant="text"
                onClick={() => {
                  setShowShiftSelector(false);
                  setSelectedCell(null);
                }}
                sx={{ color: '#6B7280' }}
              >
                Cancel
              </Button>
            </Box>
          </Paper>
        </Box>
      )}

      {/* Print Content - Portaled to #print-root */}
      {selectedRoster && createPortal(
        <ThemeProvider theme={theme}>
          <PrintPreview
            roster={selectedRoster}
            wardName={selectedWardName || ''}
            weekData={weekData}
            rosterDays={rosterDays}
            summaryCounts={getPrintSummaryCounts()}
            transfers={printTransfers}
          />
        </ThemeProvider>,
        document.getElementById('print-root')!
      )}

      {/* Excel Date Range Picker Dialog */}
      <Dialog
        open={excelDateRangeOpen}
        onClose={() => setExcelDateRangeOpen(false)}
        aria-labelledby="excel-date-range-dialog-title"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="excel-date-range-dialog-title">
          Select Date Range for Excel Export
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 3 }}>
            Choose the start and end dates for the Excel export. Leave empty to use the full roster period.
          </DialogContentText>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
              <DatePicker
                label="Start Date"
                value={excelStartDate}
                onChange={(newValue) => setExcelStartDate(newValue)}
                minDate={rosterDays[0] || undefined}
                maxDate={rosterDays[rosterDays.length - 1] || undefined}
                slotProps={{ textField: { fullWidth: true } }}
              />
              <DatePicker
                label="End Date"
                value={excelEndDate}
                onChange={(newValue) => setExcelEndDate(newValue)}
                minDate={rosterDays[0] || undefined}
                maxDate={rosterDays[rosterDays.length - 1] || undefined}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Box>
          </LocalizationProvider>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setExcelStartDate(null);
              setExcelEndDate(null);
              setExcelDateRangeOpen(false);
            }}
            sx={{ color: '#6B7280' }}
          >
            Use Full Period
          </Button>
          <Button
            onClick={() => {
              setExcelDateRangeOpen(false);
              // Trigger download after closing
              setTimeout(() => handleDownload(), 100);
            }}
            variant="contained"
            sx={{
              backgroundColor: '#14B8A6',
              '&:hover': { backgroundColor: '#0F766E' },
            }}
          >
            Export
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => !deleteRosterMutation.isPending && setDeleteConfirmOpen(false)}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Delete Roster
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete this roster? This action cannot be undone.
            {selectedRoster && (
              <Box component="span" display="block" sx={{ mt: 1, fontWeight: 500, color: '#1F2937' }}>
                {(selectedRoster.roster_input as any)?.roster_name || selectedRoster.roster_input?.meta?.period}
              </Box>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteConfirmOpen(false)} 
            disabled={deleteRosterMutation.isPending}
            sx={{ color: '#6B7280' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteRoster}
            disabled={deleteRosterMutation.isPending}
            variant="contained"
            color="error"
            sx={{
              backgroundColor: '#DC2626',
              '&:hover': { backgroundColor: '#B91C1C' },
            }}
          >
            {deleteRosterMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RosterPage;
