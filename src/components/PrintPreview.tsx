import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from "@mui/material";
import type { Roster } from "../api/types";
import zydusLogo from "../assets/zydus_hospitals.png";

interface TransferRow {
  rowId: string;
  empId: string;
  name: string;
  grade?: string;
  position?: string;
  meta: {
    transferId: string;
    dayIndex: number;
    date: string;
    shiftCode: string;
    fromWardId?: string;
    fromWardName?: string;
  };
}

interface PrintPreviewProps {
  roster: Roster | undefined;
  wardName: string;
  weekData: { [dayKey: string]: { [staffId: string]: Array<{ code: string; type: string }> } };
  rosterDays: Date[];
  summaryCounts: { [dayKey: string]: { M: number; E: number; N: number; G: number; OFF_LEAVE: number } };
  transfers?: TransferRow[];
}

const PrintPreview = ({ roster, wardName, weekData, rosterDays, summaryCounts, transfers = [] }: PrintPreviewProps) => {
  if (!roster) return null;

  const getShiftDisplay = (dayKey: string, staffId: string, isTransfer: boolean = false): string => {
    const shifts = weekData[dayKey]?.[staffId] || [];
    if (shifts.length === 0) return isTransfer ? '' : 'OFF';
    
    // Get unique shift codes
    const codes = [...new Set(shifts.map(s => s.code))];
    
    // Handle leave types
    const leaveCodes = ['L', 'PL', 'CL', 'SL', 'LWP'];
    const hasLeave = codes.some(code => leaveCodes.includes(code));
    if (hasLeave) {
      const leaveCode = codes.find(code => leaveCodes.includes(code));
      return leaveCode || 'L';
    }
    
    // Return codes joined if multiple, or single code
    return codes.join('/');
  };

  // Check if a staff member is off for the entire week
  const isOffForWholeWeek = (staffId: string): boolean => {
    const offCodes = ['OFF', 'PL', 'CL', 'SL', 'LWP', 'LEAVE'];
    
    return rosterDays.every((day) => {
      const dayKey = day.toISOString().split('T')[0];
      const shifts = weekData[dayKey]?.[staffId] || [];
      
      // If no shifts, it's OFF
      if (shifts.length === 0) return true;
      
      // Check if all shifts are OFF or leave codes
      const codes = shifts.map(s => s.code);
      return codes.every(code => offCodes.includes(code));
    });
  };

  // Sort staff: those with shifts first, those off for whole week at the bottom
  const sortedStaff = [...(roster.roster_input.staff_details || [])]
    .filter((staff) => staff && staff.id)
    .sort((a, b) => {
      const aIsOff = isOffForWholeWeek(a.id);
      const bIsOff = isOffForWholeWeek(b.id);
      
      // If both are off or both have shifts, maintain original order
      if (aIsOff === bIsOff) return 0;
      
      // Those with shifts come first (return -1), those off come last (return 1)
      return aIsOff ? 1 : -1;
    });

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  const formatDayName = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  };

  return (
    <Box
      id="print-preview-content"
      sx={{
        width: '100%',
        padding: '8px',
        boxSizing: 'border-box',
        '@media print': {
          margin: 0,
          padding: 0,
        },
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          p: 0,
          boxShadow: 'none',
          border: '1px solid #000',
          '@media print': {
            width: '100% !important',
            maxWidth: '100% !important',
          },
        }}
      >
        {/* Main Table */}
        <TableContainer sx={{ width: '100% !important', '@media print': { width: '100% !important' } }}>
          <Table
            size="small"
            sx={{
              border: '1px solid #000',
              borderCollapse: 'collapse',
              width: '100% !important',
              tableLayout: 'fixed',
              '@media print': {
                width: '100% !important',
                '& thead': {
                  display: 'table-header-group !important',
                },
                '& tbody': {
                  display: 'table-row-group',
                },
              },
              '& .MuiTableCell-root': {
                border: '1px solid #000',
                padding: '4px 4px',
                fontSize: '9px',
                lineHeight: 1.2,
                '@media print': {
                  padding: '6px 3px !important',
                  fontSize: '7px !important',
                  lineHeight: 1.2,
                },
              },
            }}
          >
            <TableHead>
              {/* Report Header Row - Repeats on every page */}
              <TableRow>
                <TableCell 
                  colSpan={3 + rosterDays.length} 
                  sx={{ 
                    border: '1px solid #000',
                    padding: '4px 6px !important',
                    '@media print': {
                      padding: '3px 4px !important',
                    },
                  }}
                >
                   <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    width="100%"
                  >
                    <Box display="flex" alignItems="center" gap={2} sx={{ flex: 1 }}>
                      <Box>
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 'bold',
                            fontSize: '14px',
                            color: '#000',
                            lineHeight: 1.2,
                            '@media print': {
                              fontSize: '12px !important',
                            },
                          }}
                        >
                          Zydus Hospitals
                        </Typography>
                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontWeight: 'bold',
                            fontSize: '11px',
                            color: '#000',
                            '@media print': {
                              fontSize: '10px !important',
                            },
                          }}
                        >
                          DUTY LIST {wardName.toUpperCase()} {formatDate(rosterDays[0])} TO {formatDate(rosterDays[rosterDays.length - 1])}
                        </Typography>
                      </Box>
                    </Box>
                    <img 
                      src={zydusLogo} 
                      alt="Zydus Hospitals" 
                      style={{ 
                        height: '40px',
                        objectFit: 'contain'
                      }} 
                    />
                  </Box>
                </TableCell>
              </TableRow>
              
              {/* Column Headers */}
              <TableRow
                sx={{
                  '@media print': {
                    pageBreakInside: 'avoid',
                    pageBreakAfter: 'auto',
                  },
                }}
              >
                <TableCell rowSpan={2} align="center" sx={{ fontWeight: 'bold', width: '10px', '@media print': { width: '10px !important', maxWidth: '10px !important' } }}>
                  S.N.
                </TableCell>
                <TableCell rowSpan={2} align="left" sx={{ fontWeight: 'bold' }}>
                  EMP. NAME
                </TableCell>
                <TableCell rowSpan={2} align="center" sx={{ fontWeight: 'bold', width: '50px', '@media print': { width: '45px !important', maxWidth: '45px !important' } }}>
                  EMP. ID
                </TableCell>
                {rosterDays.map((day, index) => (
                  <TableCell
                    key={`date-${index}`}
                    align="center"
                    sx={{ 
                      fontWeight: 'bold', 
                      width: '25px', 
                      '@media print': { 
                        width: '22px !important', 
                        maxWidth: '22px !important', 
                        padding: '1px 2px !important',
                        fontSize: '9px !important' 
                      } 
                    }}
                  >
                    {formatDate(day).substring(0, 5)}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow
                sx={{
                  '@media print': {
                    pageBreakInside: 'avoid',
                    pageBreakAfter: 'auto',
                  },
                }}
              >
                {rosterDays.map((day, index) => (
                  <TableCell
                    key={`day-${index}`}
                    align="center"
                    sx={{ 
                      fontWeight: 'bold', 
                      width: '25px', 
                      '@media print': { 
                        width: '22px !important', 
                        maxWidth: '22px !important', 
                        padding: '1px 2px !important',
                        fontSize: '9px !important' 
                      } 
                    }}
                  >
                    {formatDayName(day)}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedStaff.map((staff, index) => (
                  <TableRow 
                    key={staff.id}
                    sx={{
                      '@media print': {
                        pageBreakInside: 'avoid',
                        pageBreakAfter: 'auto',
                        height: 'auto !important',
                      },
                    }}
                  >
                    <TableCell align="center">{index + 1}</TableCell>
                    <TableCell align="left" sx={{ textTransform: 'uppercase' }}>
                      {staff.name}
                    </TableCell>
                    <TableCell align="center">{staff.emp_id}</TableCell>
                    {rosterDays.map((day) => {
                      const dayKey = day.toISOString().split('T')[0];
                      const shiftDisplay = getShiftDisplay(dayKey, staff.id);
                      return (
                        <TableCell key={dayKey} align="center">
                          {shiftDisplay}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}

              {/* Transfers Section */}
              {transfers.length > 0 && (
                <>
                  <TableRow>
                    <TableCell 
                      colSpan={3 + rosterDays.length} 
                      sx={{ 
                        backgroundColor: '#E0F2FE', 
                        fontWeight: 'bold',
                        padding: '2px 4px !important',
                        '@media print': {
                          padding: '1px 3px !important',
                          fontSize: '8px !important',
                        },
                      }}
                    >
                      TRANSFERS IN
                    </TableCell>
                  </TableRow>
                  {transfers.map((transfer, index) => (
                    <TableRow 
                      key={transfer.rowId}
                      sx={{
                        backgroundColor: '#F0F9FF',
                        '@media print': {
                          pageBreakInside: 'avoid',
                          pageBreakAfter: 'auto',
                          backgroundColor: '#F0F9FF !important',
                          printColorAdjust: 'exact',
                          WebkitPrintColorAdjust: 'exact'
                        },
                      }}
                    >
                      <TableCell align="center">{sortedStaff.length + index + 1}</TableCell>
                      <TableCell align="left">
                        <Box>
                          <Typography variant="body2" sx={{ fontSize: '9px', fontWeight: 'bold', '@media print': { fontSize: '8px !important' } }}>
                            {transfer.name}
                          </Typography>
                          <Typography variant="caption" sx={{ fontSize: '8px', fontStyle: 'italic', '@media print': { fontSize: '7px !important' } }}>
                            From {transfer.meta.fromWardName || transfer.meta.fromWardId || 'Unknown'} • {new Date(transfer.meta.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">{transfer.empId}</TableCell>
                    {rosterDays.map((day) => {
                      const dayKey = day.toISOString().split('T')[0];
                      const shiftDisplay = getShiftDisplay(dayKey, transfer.rowId, true);
                      return (
                        <TableCell key={dayKey} align="center">
                            {shiftDisplay}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </>
              )}
              
              {/* Summary Rows */}
              <TableRow 
                sx={{ 
                  backgroundColor: '#f5f5f5', 
                  '@media print': { 
                    backgroundColor: '#f0f0f0',
                    pageBreakInside: 'avoid',
                  } 
                }}
              >
                <TableCell colSpan={3} align="left" sx={{ fontWeight: 'bold' }}>
                  M
                </TableCell>
                {rosterDays.map((day) => {
                  const dayKey = day.toISOString().split('T')[0];
                  return (
                    <TableCell key={dayKey} align="center" sx={{ fontWeight: 'bold' }}>
                      {summaryCounts[dayKey]?.M || 0}
                    </TableCell>
                  );
                })}
              </TableRow>
              
              <TableRow 
                sx={{ 
                  backgroundColor: '#f5f5f5', 
                  '@media print': { 
                    backgroundColor: '#f0f0f0',
                    pageBreakInside: 'avoid',
                  } 
                }}
              >
                <TableCell colSpan={3} align="left" sx={{ fontWeight: 'bold' }}>
                  E
                </TableCell>
                {rosterDays.map((day) => {
                  const dayKey = day.toISOString().split('T')[0];
                  return (
                    <TableCell key={dayKey} align="center" sx={{ fontWeight: 'bold' }}>
                      {summaryCounts[dayKey]?.E || 0}
                    </TableCell>
                  );
                })}
              </TableRow>
              
              <TableRow 
                sx={{ 
                  backgroundColor: '#f5f5f5', 
                  '@media print': { 
                    backgroundColor: '#f0f0f0',
                    pageBreakInside: 'avoid',
                  } 
                }}
              >
                <TableCell colSpan={3} align="left" sx={{ fontWeight: 'bold' }}>
                  N
                </TableCell>
                {rosterDays.map((day) => {
                  const dayKey = day.toISOString().split('T')[0];
                  return (
                    <TableCell key={dayKey} align="center" sx={{ fontWeight: 'bold' }}>
                      {summaryCounts[dayKey]?.N || 0}
                    </TableCell>
                  );
                })}
              </TableRow>
              
              <TableRow 
                sx={{ 
                  backgroundColor: '#f5f5f5', 
                  '@media print': { 
                    backgroundColor: '#f0f0f0',
                    pageBreakInside: 'avoid',
                  } 
                }}
              >
                <TableCell colSpan={3} align="left" sx={{ fontWeight: 'bold' }}>
                  G
                </TableCell>
                {rosterDays.map((day) => {
                  const dayKey = day.toISOString().split('T')[0];
                  return (
                    <TableCell key={dayKey} align="center" sx={{ fontWeight: 'bold' }}>
                      {summaryCounts[dayKey]?.G || 0}
                    </TableCell>
                  );
                })}
              </TableRow>
              
              <TableRow 
                sx={{ 
                  backgroundColor: '#f5f5f5', 
                  '@media print': { 
                    backgroundColor: '#f0f0f0',
                    pageBreakInside: 'avoid',
                  } 
                }}
              >
                <TableCell colSpan={3} align="left" sx={{ fontWeight: 'bold' }}>
                  OFF/LEAVE
                </TableCell>
                {rosterDays.map((day) => {
                  const dayKey = day.toISOString().split('T')[0];
                  return (
                    <TableCell key={dayKey} align="center" sx={{ fontWeight: 'bold' }}>
                      {summaryCounts[dayKey]?.OFF_LEAVE || 0}
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        {/* Signature Section */}
        <Box
          display="flex"
          justifyContent="space-between"
          px={1.5}
          py={0.5}
          sx={{ 
            borderTop: '1px solid #000',
            '@media print': {
              padding: '4px 8px !important',
            },
          }}
        >
          <Box>
            <Typography 
              variant="body2" 
              sx={{ 
                fontWeight: 'bold', 
                mb: 0.5,
                fontSize: '10px',
                '@media print': {
                  fontSize: '9px !important',
                  marginBottom: '4px !important',
                },
              }}
            >
              CHARGE SIGN-
            </Typography>
            <Box
              sx={{
                width: '150px',
                borderBottom: '1px solid #000',
                height: '35px',
                '@media print': {
                  width: '140px !important',
                  height: '30px !important',
                },
              }}
            />
          </Box>
          <Box>
            <Typography 
              variant="body2" 
              sx={{ 
                fontWeight: 'bold', 
                mb: 0.5, 
                textAlign: 'right',
                fontSize: '10px',
                '@media print': {
                  fontSize: '9px !important',
                  marginBottom: '4px !important',
                },
              }}
            >
              HOD SIGN-
            </Typography>
            <Box
              sx={{
                width: '150px',
                borderBottom: '1px solid #000',
                height: '35px',
                marginLeft: 'auto',
                '@media print': {
                  width: '140px !important',
                  height: '30px !important',
                },
              }}
            />
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default PrintPreview;

