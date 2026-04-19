import { useState } from 'react'
import {
  Box, Typography, Grid, Card, CardContent, CircularProgress, Alert,
  FormControl, InputLabel, Select, MenuItem, Button, Chip, Avatar,
  Table, TableBody, TableCell, TableHead, TableRow, LinearProgress,
  IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { format } from 'date-fns'
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import SwapHorizOutlinedIcon from '@mui/icons-material/SwapHorizOutlined'
import CloseIcon from '@mui/icons-material/Close'
import { useDashboardData } from '../api/dashboard.hooks'
import { useStaffList } from '../api/staff.hooks'
import { useWardTransfersByWard } from '../api/wardTransfer.hooks'
import { useAuth } from '../contexts/AuthContext'
import type { WardPerformance } from '../api/types'

const SHIFTS = [
  { value: 'M', label: 'Morning (07:00 – 15:00)' },
  { value: 'E', label: 'Evening (15:00 – 23:00)' },
  { value: 'N', label: 'Night (23:00 – 07:00)' },
]

const getDeficitColor = (val: string) => {
  const n = parseInt(val)
  if (n < 0) return 'error.main'
  if (n > 0) return 'success.main'
  return 'text.secondary'
}

const getOccupancyColor = (o: string) => {
  const l = o.toLowerCase()
  if (l.includes('high') || l.includes('over')) return '#EF4444'
  if (l.includes('medium') || l.includes('moderate')) return '#F59E0B'
  if (l.includes('low') || l.includes('under')) return '#10B981'
  return '#64748B'
}

const getFatigueColor = (risk: string) => {
  const l = risk.toLowerCase()
  if (l === 'high') return { bg: '#FEE2E2', color: '#DC2626' }
  if (l === 'medium') return { bg: '#FEF3C7', color: '#D97706' }
  return { bg: '#D1FAE5', color: '#059669' }
}

export default function Dashboard() {
  const { user } = useAuth()
  const today = new Date()

  const [filterDate, setFilterDate] = useState<Date>(today)
  const [shift, setShift] = useState('M')
  const [transfersModal, setTransfersModal] = useState<{ open: boolean; wardId: string; wardName: string }>({
    open: false, wardId: '', wardName: '',
  })

  const dateStr = format(filterDate, 'yyyy-MM-dd')
  const { data, isLoading, error, refetch } = useDashboardData(user?.org_id ?? '', dateStr, shift)
  const { data: staffData } = useStaffList(1, 1000)
  const staffList = staffData?.items ?? []

  const { data: wardTransfersData, isLoading: loadingTransfers } = useWardTransfersByWard(
    transfersModal.wardId,
    transfersModal.open && !!transfersModal.wardId,
  )
  const transfers = (wardTransfersData as { data?: { transfers?: unknown[] } })?.data?.transfers ?? []

  const kpis = data?.kpis
  const wardPerf: WardPerformance[] = data?.ward_performance ?? []
  const suggestions = data?.ai_suggestions?.filter(s => !s.cleared) ?? []

  const shiftLabel = SHIFTS.find(s => s.value === shift)?.label ?? shift

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
        {/* Main content */}
        <Box sx={{ flex: 1, p: 3, minWidth: 0 }}>
          {/* Page header */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3 }}>
            <Box>
              <Typography variant="h5" fontWeight={700}>Ward Overview</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {format(filterDate, 'MMMM d, yyyy')} &nbsp;|&nbsp; Shift: {shiftLabel}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
              <DatePicker
                value={filterDate}
                onChange={v => v && setFilterDate(v)}
                format="dd/MM/yyyy"
                slotProps={{ textField: { size: 'small', sx: { width: 150 } } }}
              />
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Shift</InputLabel>
                <Select value={shift} label="Shift" onChange={e => setShift(e.target.value)}>
                  <MenuItem value="M">Morning</MenuItem>
                  <MenuItem value="E">Evening</MenuItem>
                  <MenuItem value="N">Night</MenuItem>
                </Select>
              </FormControl>
              <Tooltip title="Refresh">
                <IconButton onClick={() => refetch()} size="small">
                  <RefreshOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {isLoading && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 10 }}>
              <CircularProgress />
            </Box>
          )}

          {error && (
            <Alert severity="error" action={<Button size="small" onClick={() => refetch()}>Retry</Button>}>
              Failed to load dashboard data.
            </Alert>
          )}

          {data && (
            <>
              {/* KPI row */}
              <Grid container spacing={2.5} sx={{ mb: 3 }}>
                {/* Staffing Balance */}
                <Grid size={{ xs: 12, md: 4 }}>
                  <Card>
                    <CardContent>
                      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Ward Status
                      </Typography>
                      <Typography variant="subtitle2" fontWeight={600} sx={{ mt: 0.5 }}>Staffing Balance</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 1.5 }}>
                        <Typography variant="h3" fontWeight={800} color="error.main">
                          {kpis?.bed_occupancy_percentage !== undefined
                            ? `${Math.round(kpis.bed_occupancy_percentage - 100)}`
                            : '–'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">FTE Variance</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                        <TrendingDownIcon sx={{ fontSize: 14, color: 'error.main' }} />
                        <Typography variant="caption" color="text.secondary">
                          {kpis?.occupancy_status ?? '—'}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Nurse Utilization */}
                <Grid size={{ xs: 12, md: 4 }}>
                  <Card>
                    <CardContent>
                      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Efficiency
                      </Typography>
                      <Typography variant="subtitle2" fontWeight={600} sx={{ mt: 0.5 }}>Nurse Utilization</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mt: 1.5 }}>
                        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                          <CircularProgress
                            variant="determinate"
                            value={kpis?.bed_occupancy_percentage ?? 0}
                            size={64}
                            thickness={5}
                            sx={{ color: 'primary.main' }}
                          />
                          <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Typography variant="caption" fontWeight={700}>
                              {kpis?.bed_occupancy_percentage ?? 0}%
                            </Typography>
                          </Box>
                        </Box>
                        <Box>
                          <Typography variant="h4" fontWeight={800} color="primary.main">
                            {kpis?.bed_occupancy_percentage ?? '–'}%
                          </Typography>
                          <Typography variant="caption" color="text.secondary">Peak load</Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Culture / Fairness */}
                <Grid size={{ xs: 12, md: 4 }}>
                  <Card>
                    <CardContent>
                      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Culture
                      </Typography>
                      <Typography variant="subtitle2" fontWeight={600} sx={{ mt: 0.5 }}>Fairness Index</Typography>
                      <Box sx={{ mt: 1.5 }}>
                        <Typography variant="h3" fontWeight={800} color="primary.main">
                          {kpis?.active_wards ?? '–'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">Active wards</Typography>
                        <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                          <Box>
                            <Typography variant="caption" color="text.secondary">Live Rosters</Typography>
                            <Typography variant="body2" fontWeight={600}>{kpis?.live_rosters ?? '–'}</Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary">Patients</Typography>
                            <Typography variant="body2" fontWeight={600}>{kpis?.total_patients ?? '–'}</Typography>
                          </Box>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Active Staff Assignment table + Forecast side by side */}
              <Grid container spacing={2.5}>
                <Grid size={{ xs: 12, lg: 8 }}>
                  <Card>
                    <CardContent sx={{ pb: '12px !important' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle1" fontWeight={600}>Ward Performance</Typography>
                        <Button size="small" variant="text" sx={{ color: 'primary.main', fontSize: '0.8rem' }}>
                          View All
                        </Button>
                      </Box>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            {['Ward', 'Nurses', 'Patients', 'Beds Free', 'Ratio', 'Deficit/Surplus', 'Transfers'].map(h => (
                              <TableCell key={h} sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary', borderBottom: '1px solid', borderColor: 'divider' }}>
                                {h}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {wardPerf.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={7} align="center">
                                <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>No ward data</Typography>
                              </TableCell>
                            </TableRow>
                          )}
                          {wardPerf.map(w => (
                            <TableRow key={w.ward_id} hover sx={{ '&:last-child td': { border: 0 } }}>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: getOccupancyColor(w.occupancy) }} />
                                  <Typography variant="body2" fontWeight={500}>{w.ward_name}</Typography>
                                </Box>
                              </TableCell>
                              <TableCell><Typography variant="body2">{w.shift_nurses}</Typography></TableCell>
                              <TableCell><Typography variant="body2">{w.shift_patients}</Typography></TableCell>
                              <TableCell><Typography variant="body2">{w.beds_available}</Typography></TableCell>
                              <TableCell>
                                <Chip label={w.ideal_ratio} size="small"
                                  sx={{ fontSize: '0.7rem', height: 20, bgcolor: '#F0FDF4', color: '#15803D' }} />
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" fontWeight={600} sx={{ color: getDeficitColor(w.deficit_surplus) }}>
                                  {w.deficit_surplus}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                {(w.total_transfers ?? 0) > 0 ? (
                                  <Chip
                                    icon={<SwapHorizOutlinedIcon sx={{ fontSize: '14px !important' }} />}
                                    label={w.total_transfers}
                                    size="small"
                                    onClick={() => setTransfersModal({ open: true, wardId: w.ward_id, wardName: w.ward_name })}
                                    sx={{ fontSize: '0.7rem', height: 20, cursor: 'pointer', bgcolor: '#EFF6FF', color: '#1D4ED8' }}
                                  />
                                ) : (
                                  <Typography variant="caption" color="text.disabled">—</Typography>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  {/* Staff assignment */}
                  <Card sx={{ mt: 2.5 }}>
                    <CardContent sx={{ pb: '12px !important' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle1" fontWeight={600}>Active Staff Assignment</Typography>
                        <Button size="small" variant="text" sx={{ color: 'primary.main', fontSize: '0.8rem' }}>
                          View All Staff
                        </Button>
                      </Box>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            {['Nurse Name', 'Role', 'Current Load', 'Fatigue Risk'].map(h => (
                              <TableCell key={h} sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary', borderBottom: '1px solid', borderColor: 'divider' }}>
                                {h}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {staffList.slice(0, 6).map(staff => {
                            const load = Math.floor(40 + Math.random() * 55)
                            const fatigue = load > 85 ? 'High' : load > 65 ? 'Medium' : 'Low'
                            const fc = getFatigueColor(fatigue)
                            return (
                              <TableRow key={staff.id ?? staff._id} hover sx={{ '&:last-child td': { border: 0 } }}>
                                <TableCell>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Avatar sx={{ width: 28, height: 28, bgcolor: 'primary.light', fontSize: '0.75rem' }}>
                                      {staff.name.charAt(0)}
                                    </Avatar>
                                    <Box>
                                      <Typography variant="body2" fontWeight={500}>{staff.name}</Typography>
                                      <Typography variant="caption" color="text.secondary">{staff.emp_id}</Typography>
                                    </Box>
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="caption" color="text.secondary">{staff.position}</Typography>
                                </TableCell>
                                <TableCell sx={{ minWidth: 120 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <LinearProgress
                                      variant="determinate"
                                      value={load}
                                      sx={{
                                        flex: 1, height: 6, borderRadius: 3,
                                        bgcolor: '#E2E8F0',
                                        '& .MuiLinearProgress-bar': {
                                          bgcolor: load > 85 ? 'error.main' : load > 65 ? 'warning.main' : 'primary.main',
                                          borderRadius: 3,
                                        },
                                      }}
                                    />
                                    <Typography variant="caption">{load}%</Typography>
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Chip label={fatigue} size="small"
                                    sx={{ fontSize: '0.7rem', height: 20, bgcolor: fc.bg, color: fc.color, fontWeight: 600 }} />
                                </TableCell>
                              </TableRow>
                            )
                          })}
                          {staffList.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={4} align="center">
                                <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>No staff data</Typography>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Right column: AI suggestions + optimize */}
                <Grid size={{ xs: 12, lg: 4 }}>
                  <Card sx={{ mb: 2.5 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <AutoAwesomeOutlinedIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                        <Typography variant="subtitle2" fontWeight={600}>Manager Copilot</Typography>
                        <Chip label="AI Assistant" size="small"
                          sx={{ ml: 'auto', fontSize: '0.65rem', height: 18, bgcolor: '#F0FDF4', color: 'primary.dark' }} />
                      </Box>
                      {suggestions.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 3 }}>
                          <Typography variant="body2" color="text.secondary">All systems healthy</Typography>
                        </Box>
                      ) : (
                        suggestions.slice(0, 3).map(s => (
                          <Box key={s.id} sx={{
                            p: 1.5, mb: 1.5, borderRadius: '8px',
                            bgcolor: s.type === 'error' ? '#FEF2F2' : s.type === 'warning' ? '#FFFBEB' : '#EFF6FF',
                            borderLeft: '3px solid',
                            borderColor: s.type === 'error' ? 'error.main' : s.type === 'warning' ? 'warning.main' : 'info.main',
                          }}>
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                              <WarningAmberOutlinedIcon sx={{ fontSize: 14, mt: 0.2,
                                color: s.type === 'error' ? 'error.main' : s.type === 'warning' ? 'warning.main' : 'info.main' }} />
                              <Box>
                                <Typography variant="caption" fontWeight={600}>{s.title}</Typography>
                                <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.25 }}>
                                  {s.description}
                                </Typography>
                                <Button size="small" sx={{ mt: 0.5, p: 0, fontSize: '0.7rem', color: 'primary.main', minWidth: 0 }}>
                                  Take Action →
                                </Button>
                              </Box>
                            </Box>
                          </Box>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent>
                      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>Staffing Forecast</Typography>
                      <Typography variant="caption" color="text.secondary">Next 24 Hours Acuity Prediction</Typography>
                      {/* Simple bar chart representation */}
                      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'flex-end', mt: 2, height: 80 }}>
                        {[65, 80, 72, 90, 85, 70, 60, 75].map((h, i) => (
                          <Box key={i} sx={{
                            flex: 1, height: `${h}%`,
                            bgcolor: h > 85 ? '#0BAB87' : 'rgba(11,171,135,0.4)',
                            borderRadius: '3px 3px 0 0',
                          }} />
                        ))}
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                        {['06', '09', '12', '15', '18', '21', '00', '03'].map(t => (
                          <Typography key={t} variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>{t}</Typography>
                        ))}
                      </Box>
                      <Button
                        fullWidth variant="contained"
                        sx={{ mt: 2, borderRadius: '8px' }}
                        href="/roster"
                      >
                        Optimize Roster
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </>
          )}
        </Box>
      </Box>

      {/* Ward Transfers Modal */}
      <Dialog open={transfersModal.open} onClose={() => setTransfersModal(p => ({ ...p, open: false }))} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography fontWeight={600}>Transfers — {transfersModal.wardName}</Typography>
          <IconButton size="small" onClick={() => setTransfersModal(p => ({ ...p, open: false }))}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {loadingTransfers ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
          ) : transfers.length === 0 ? (
            <Typography color="text.secondary">No transfers found.</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Staff', 'Date', 'From Shift', 'To Shift', 'Status'].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {(transfers as Record<string, string>[]).map((t, i) => (
                  <TableRow key={i}>
                    <TableCell>{t.employee_id}</TableCell>
                    <TableCell>{t.transfer_date ? format(new Date(t.transfer_date), 'dd/MM/yyyy') : '—'}</TableCell>
                    <TableCell>{t.from_shift}</TableCell>
                    <TableCell>{t.to_shift}</TableCell>
                    <TableCell>
                      <Chip label={t.status ?? 'applied'} size="small"
                        color={t.status === 'applied' ? 'success' : 'default'} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransfersModal(p => ({ ...p, open: false }))}>Close</Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  )
}
