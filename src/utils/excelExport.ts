import ExcelJS from "exceljs";

// Map shift codes to Excel format
const mapShiftCodeToExcel = (code: string): string => {
  const mapping: { [key: string]: string } = {
    'M': 'M4',
    'E': 'E6',
    'N': 'N1',
    'G': 'G0',
    'ME': 'M4', // ME shows both M4 and E6
  };
  return mapping[code] || code;
};

// Check if a code is a leave code (case-insensitive)
const isLeaveCode = (code: string): boolean => {
  const upperCode = code.toUpperCase();
  return ['OFF', 'PL', 'CL', 'SL', 'LWP', 'PREF', 'L', 'LEAVE'].includes(upperCode);
};

interface RosterData {
  roster_input: {
    staff_details?: Array<{
      emp_id?: string;
      id?: string;
      name?: string;
      grade?: string;
      position?: string;
    }>;
    meta?: {
      schedule_start_date: string;
      schedule_end_date: string;
    };
  };
  roster?: {
    [empId: string]: {
      [dayIndex: string]: string[];
    };
  };
}

interface ExcelExportOptions {
  roster: RosterData;
  wardName: string;
  filteredDays: Date[];
  startDate: Date;
  endDate: Date;
}

export const exportRosterToExcel = async ({
  roster,
  wardName,
  filteredDays,
  startDate,
  endDate,
}: ExcelExportOptions): Promise<void> => {
  // Create header row: "Email/Employee ID" + dates
  const headerRow: any[] = ['Email/Employee ID'];
  filteredDays.forEach(day => {
    // Format date as DD-MM-YYYY (e.g., 31-10-2025)
    const dayStr = String(day.getDate()).padStart(2, '0');
    const monthStr = String(day.getMonth() + 1).padStart(2, '0');
    const yearStr = day.getFullYear();
    headerRow.push(`${dayStr}-${monthStr}-${yearStr}`);
  });
  
  // Prepare data rows
  const dataRows: any[][] = [headerRow];
  
  // Get staff details
  const staffDetails = roster.roster_input.staff_details || [];
  const rosterStartDate = new Date(roster.roster_input.meta?.schedule_start_date || '');
  
  // Track cells that need yellow highlighting (3rd Night shift cells)
  const highlightCells: Array<{ row: number; col: number }> = [];
  
  // Track actual row index (accounts for header row and skipped staff)
  let actualRowIndex = 1; // Start after header row (row 0)
  
  staffDetails.forEach((staff) => {
    if (!staff || !staff.emp_id) return;
    
    // First row: Employee ID + shift codes
    const shiftRow: any[] = [staff.emp_id];
    
    // Second row: Day of week for OFF/leave
    const dayRow: any[] = [staff.emp_id];
    
    // Track leave days to determine which day to show in second row
    let leaveDay: string | null = null;
    
    // Track Night shift count for this staff member
    let nightShiftCount = 0;
    
    filteredDays.forEach((day, dayIndex) => {
      // Calculate actual day index in the full roster
      const actualDayIndex = Math.floor((day.getTime() - rosterStartDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Get shift codes for this day
      const empId = staff.emp_id;
      if (!empId) return;
      
      const staffRoster = roster.roster?.[empId] || {};
      const shiftCodes = staffRoster[actualDayIndex.toString()] || [];
      
      // Process shift codes
      if (shiftCodes.length === 0 || shiftCodes.includes('OFF')) {
        // No shift or OFF
        shiftRow.push('G1');
        if (!leaveDay) {
          leaveDay = day.toLocaleDateString('en-US', { weekday: 'long' });
        }
      } else {
        // Check if any code is a leave code
        const hasLeave = shiftCodes.some((code: string) => isLeaveCode(code));
        
        if (hasLeave) {
          // All leave codes should show as G1
          shiftRow.push('G1');
          if (!leaveDay) {
            leaveDay = day.toLocaleDateString('en-US', { weekday: 'long' });
          }
        } else {
          // Map shift codes to Excel format
          const mappedCodes = shiftCodes
            .filter((code: string) => !isLeaveCode(code))
            .map((code: string) => {
              // Check if this is a Night shift
              if (code === 'N') {
                nightShiftCount++;
                // If it's the 3rd Night shift, mark it for highlighting
                if (nightShiftCount === 3) {
                  // Calculate col index: 0 (Email/Employee ID) + dayIndex + 1
                  const colIndex = dayIndex + 1;
                  highlightCells.push({ row: actualRowIndex, col: colIndex });
                }
              }
              return mapShiftCodeToExcel(code);
            })
            .join(',');
          shiftRow.push(mappedCodes || '');
        }
      }
    });
    
    // Fill second row with the leave day (if any), otherwise empty
    filteredDays.forEach(() => {
      dayRow.push(leaveDay || '');
    });
    
    // Add both rows for this employee
    dataRows.push(shiftRow);
    dataRows.push(dayRow);
    
    // Increment row index by 2 (shift row + day row)
    actualRowIndex += 2;
  });
  
  // Create workbook using ExcelJS for styling support
  const excelWorkbook = new ExcelJS.Workbook();
  const excelWorksheet = excelWorkbook.addWorksheet('Roster');
  
  // Add data rows
  dataRows.forEach((row, rowIndex) => {
    const excelRow = excelWorksheet.addRow(row);
    
    // Apply borders to all cells for consistent grid
    row.forEach((_, colIndex) => {
      const cell = excelRow.getCell(colIndex + 1);
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
    });
    
    // Apply yellow background to 3rd Night shift cells
    highlightCells.forEach(({ row: highlightRow, col: highlightCol }) => {
      if (rowIndex === highlightRow) {
        const cell = excelRow.getCell(highlightCol + 1); // ExcelJS uses 1-based indexing
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFFF00' } // Yellow background (ARGB: alpha=FF, yellow=FFFF00)
        };
        cell.alignment = {
          horizontal: 'center',
          vertical: 'middle'
        };
      }
    });
    
    // Style header row
    if (rowIndex === 0) {
      excelRow.font = { bold: true };
      excelRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' } // Light gray background
      };
    }
  });
  
  // Set column widths
  excelWorksheet.getColumn(1).width = 15; // Email/Emp column
  filteredDays.forEach((_, index) => {
    excelWorksheet.getColumn(index + 2).width = 12; // Date columns
  });
  
  // Generate filename
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];
  const filename = `Duty_List_${wardName}_${startDateStr}_to_${endDateStr}.xlsx`;
  
  // Write file
  const buffer = await excelWorkbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
};

