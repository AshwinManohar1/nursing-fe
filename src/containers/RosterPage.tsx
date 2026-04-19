import { useState, useEffect, useMemo } from 'react'
import {
  Box, Typography, Button, Chip, FormControl, InputLabel, Select, MenuItem,
  Card, CardContent, CircularProgress, Alert, Table, TableBody, TableCell,
  TableHead, TableRow, Avatar, TextField, Dialog, DialogTitle, DialogContent,
  DialogActions, IconButton, Tabs, Tab, Tooltip,
} from '@mui/material'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { format, addDays, differenceInCalendarDays } from 'date-fns'
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined'
import SendOutlinedIcon from '@mui/icons-material/SendOutlined'
import SwapHorizOutlinedIcon from '@mui/icons-material/SwapHorizOutlined'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import CloseIcon from '@mui/icons-material/Close'
import { useRosters, usePatchRoster, useDeleteRoster } from '../api/roster.hooks'
import { useSendChatMessage } from '../api/chat.hooks'
import { fetchWards } from '../api'
import type { Roster, RosterPatchRequest } from '../api/types'
import { useAuth } from '../contexts/AuthContext'

interface ShiftCell { id: string; code: string; type: string }
type WeekData = Record<string, Record<string, ShiftCell[]>>

const SHIFT_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  M:   { bg: '#D1FAE5', color: '#065F46', label: 'Morning' },
  E:   { bg: '#DBEAFE', color: '#1E40AF', label: 'Evening' },
  N:   { bg: '#E9D5FF', color: '#6B21A8', label: 'Night' },
  G:   { bg: '#FEF3C7', color: '#92400E', label: 'General' },
  ME:  { bg: '#FED7AA', color: '#C2410C', label: 'M+E' },
  OFF: { bg: '#F3F4F6', color: '#9CA3AF', label: 'Off' },
}

interface Ward { _id?: string; id?: string; name: string }
interface ChatMsg { role: 'user' | 'ai'; text: string }

function getShiftColor(code: string) {
  return SHIFT_COLORS[code] ?? SHIFT_COLORS.OFF
}

function getShiftTimes(code: string) {
  const map: Record<string, string> = {
    M: '07:00–15:00', E: '15:00–23:00', N: '23:00–07:00', G: '09:00–17:00', ME: '07:00–19:00',
  }
  return map[code] ?? code
}

export default function RosterPage() {
  const { user } = useAuth()
  const isWardIncharge = user?.role?.toUpperCase() === 'WARD_INCHARGE'
  const userWardIds = user?.ward_id ?? []

  const [selectedWardId, setSelectedWardId] = useState('')
  const [selectedRosterId, setSelectedRosterId] = useState('')
  const [wards, setWards] = useState<Ward[]>([])
  const [weekData, setWeekData] = useState<WeekData>({})
  const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('weekly')
  const [copilotOpen, setCopilotOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatHistory, setChatHistory] = useState<ChatMsg[]>([
    { role: 'ai', text: 'Hi! I can help you analyze this roster, suggest swaps, or flag coverage gaps. What would you like to do?' },
  ])
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [generateDialog, setGenerateDialog] = useState(false)
  const [selectedCell, setSelectedCell] = useState<{ dayKey: string; staffId: string } | null>(null)
  const [shiftSelectorOpen, setShiftSelectorOpen] = useState(false)

  const { data: rosters, isLoading: rostersLoading } = useRosters()
  const patchMutation = usePatchRoster()
  const deleteMutation = useDeleteRoster()
  const chatMutation = useSendChatMessage()

  useEffect(() => {
    fetchWards().then((res: unknown) => {
      const list = (res as { wards?: Ward[] }).wards ?? (res as Ward[])
      const all: Ward[] = Array.isArray(list) ? list : []
      setWards(isWardIncharge ? all.filter(w => userWardIds.includes(w._id ?? w.id ?? '')) : all)
    }).catch(() => setWards([]))
  }, [isWardIncharge, userWardIds])

  const filteredRosters = useMemo(() => {
    if (!rosters) return []
    if (isWardIncharge && userWardIds.length > 0) {
      return rosters.filter(r => userWardIds.includes(r.roster_input?.ward_id ?? ''))
    }
    if (selectedWardId) return rosters.filter(r => r.roster_input?.ward_id === selectedWardId)
    return rosters
  }, [rosters, selectedWardId, isWardIncharge, userWardIds])

  const rostersForWard = useMemo(() =>
    filteredRosters.filter(r => !selectedWardId || r.roster_input?.ward_id === selectedWardId),
  [filteredRosters, selectedWardId])

  const selectedRoster: Roster | undefined = useMemo(
    () => rostersForWard.find(r => r.roster_id === selectedRosterId),
    [rostersForWard, selectedRosterId],
  )

  // Auto-select ward & roster
  useEffect(() => {
    if (!filteredRosters.length) return
    const sorted = [...filteredRosters].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    if (!selectedWardId && sorted[0]?.roster_input?.ward_id) {
      setSelectedWardId(sorted[0].roster_input.ward_id)
      return
    }
    if (selectedWardId && !selectedRosterId) {
      const ward = sorted.filter(r => r.roster_input?.ward_id === selectedWardId)
      if (ward[0]) setSelectedRosterId(ward[0].roster_id)
    }
  }, [filteredRosters, selectedWardId, selectedRosterId])

  // Build weekData from roster
  const rosterDays = useMemo(() => {
    if (!selectedRoster?.roster_input?.meta) return []
    const { schedule_start_date, total_days } = selectedRoster.roster_input.meta
    return Array.from({ length: Math.min(total_days, 31) }, (_, i) => addDays(new Date(schedule_start_date), i))
  }, [selectedRoster])

  useEffect(() => {
    if (!selectedRoster || !rosterDays.length) { setWeekData({}); return }
    const staffDetails = selectedRoster.roster_input.staff_details ?? []
    const startDate = new Date(selectedRoster.roster_input.meta.schedule_start_date)
    const newData: WeekData = {}
    rosterDays.forEach(day => {
      const dayKey = format(day, 'yyyy-MM-dd')
      newData[dayKey] = {}
      staffDetails.forEach(staff => { if (staff?.id) newData[dayKey][staff.id] = [] })
    })
    staffDetails.forEach(staff => {
      if (!staff?.emp_id) return
      const staffRoster = selectedRoster.roster?.[staff.emp_id] ?? {}
      rosterDays.forEach(day => {
        const dayKey = format(day, 'yyyy-MM-dd')
        const dayIndex = differenceInCalendarDays(day, startDate)
        const codes = staffRoster[dayIndex.toString()] ?? []
        if (staff.id) {
          newData[dayKey][staff.id] = codes
            .filter(c => c !== 'OFF')
            .map((code, idx) => ({
              id: `${staff.emp_id}-${dayKey}-${code}-${idx}`,
              code,
              type: selectedRoster.roster_input.shift_definitions?.[code]?.name ?? code,
            }))
        }
      })
    })
    setWeekData(newData)
  }, [selectedRoster, rosterDays])

  // Visible week slice (7 days for weekly, all for monthly)
  const visibleDays = viewMode === 'weekly' ? rosterDays.slice(0, 7) : rosterDays

  const staffDetails = selectedRoster?.roster_input?.staff_details ?? []

  // Coverage
  const coveredShifts = rosterDays.length > 0
    ? Math.round((Object.values(weekData).reduce((a, day) => {
        return a + Object.values(day).filter(shifts => shifts.length > 0).length
      }, 0) / Math.max(Object.values(weekData).reduce((a, day) => a + Object.keys(day).length, 0), 1)) * 100)
    : 0

  const sendPatch = (dayKey: string, staffId: string, code: string, op: 'add' | 'remove' | 'replace') => {
    if (!selectedRoster) return
    const staff = staffDetails.find(s => s.id === staffId)
    if (!staff?.emp_id) return
    const startDate = new Date(selectedRoster.roster_input.meta.schedule_start_date)
    const dayIndex = differenceInCalendarDays(new Date(dayKey), startDate)
    const current = selectedRoster.roster?.[staff.emp_id]?.[dayIndex.toString()] ?? []
    let next = [...current]
    if (op === 'add') { if (!next.includes(code)) next.push(code) }
    else if (op === 'remove') { next = next.filter(c => c !== code); if (!next.length) next = ['OFF'] }
    else { next = [code] }
    const payload: RosterPatchRequest = {
      patches: [{ op: 'replace', path: `/roster/${staff.emp_id}/${dayIndex}`, value: next }],
    }
    patchMutation.mutate({ roster_id: selectedRosterId, payload })
  }

  const handleRemoveShift = (dayKey: string, staffId: string, code: string) => {
    setWeekData(p => ({ ...p, [dayKey]: { ...p[dayKey], [staffId]: (p[dayKey]?.[staffId] ?? []).filter(s => s.code !== code) } }))
    sendPatch(dayKey, staffId, code, 'remove')
  }

  const handleAddShift = (dayKey: string, staffId: string) => {
    if ((weekData[dayKey]?.[staffId]?.length ?? 0) >= 2) return
    setSelectedCell({ dayKey, staffId })
    setShiftSelectorOpen(true)
  }

  const handleShiftSelected = (code: string) => {
    if (!selectedCell) return
    const { dayKey, staffId } = selectedCell
    const exists = weekData[dayKey]?.[staffId]?.some(s => s.code === code)
    if (!exists) {
      const sc = getShiftColor(code)
      setWeekData(p => ({
        ...p,
        [dayKey]: {
          ...p[dayKey],
          [staffId]: [...(p[dayKey]?.[staffId] ?? []), { id: `${staffId}-${dayKey}-${code}-${Date.now()}`, code, type: sc.label }],
        },
      }))
      sendPatch(dayKey, staffId, code, 'add')
    }
    setShiftSelectorOpen(false)
    setSelectedCell(null)
  }

  const handleDelete = () => {
    if (!selectedRosterId) return
    deleteMutation.mutate(selectedRosterId, {
      onSuccess: () => {
        setDeleteConfirm(false)
        setSelectedRosterId('')
      },
    })
  }

  const handleChat = async () => {
    if (!chatInput.trim()) return
    const msg = chatInput.trim()
    setChatInput('')
    setChatHistory(p => [...p, { role: 'user', text: msg }])
    try {
      const res = await chatMutation.mutateAsync({ message: msg, roster_id: selectedRosterId || undefined })
      const reply = (res as { data?: { response?: string } })?.data?.response ?? 'Understood.'
      setChatHistory(p => [...p, { role: 'ai', text: reply }])
    } catch {
      setChatHistory(p => [...p, { role: 'ai', text: 'Sorry, I had trouble connecting. Try again.' }])
    }
  }

  const wardName = wards.find(w => (w._id ?? w.id) === selectedWardId)?.name ?? selectedWardId
  const meta = selectedRoster?.roster_input?.meta

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3, position: 'relative' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            {wardName && (
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Department: {wardName}
              </Typography>
            )}
            <Typography variant="h5" fontWeight={700}>Weekly Roster</Typography>
            {meta && (
              <Typography variant="body2" color="text.secondary">
                {format(new Date(meta.schedule_start_date), 'MMM d')} – {format(new Date(meta.schedule_end_date ?? addDays(new Date(meta.schedule_start_date), meta.total_days - 1)), 'MMM d, yyyy')}
              </Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <Tabs value={viewMode} onChange={(_, v) => setViewMode(v)} sx={{
              minHeight: 32,
              '& .MuiTab-root': { minHeight: 32, py: 0.5, fontSize: '0.8rem' },
              '& .MuiTabs-indicator': { bgcolor: 'primary.main' },
            }}>
              <Tab label="Weekly" value="weekly" />
              <Tab label="Monthly" value="monthly" />
            </Tabs>
            <Button size="small" variant="outlined" startIcon={<SwapHorizOutlinedIcon />}>
              Ward Transfer
            </Button>
            <Button size="small" variant="contained" startIcon={<DownloadOutlinedIcon />}>
              Export Roster
            </Button>
          </Box>
        </Box>

        {/* Ward + Roster selectors */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2.5, flexWrap: 'wrap' }}>
          {!isWardIncharge && (
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Ward</InputLabel>
              <Select value={selectedWardId} label="Ward" onChange={e => { setSelectedWardId(e.target.value); setSelectedRosterId('') }}>
                {wards.map(w => <MenuItem key={w._id ?? w.id} value={w._id ?? w.id}>{w.name}</MenuItem>)}
              </Select>
            </FormControl>
          )}
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>Roster Period</InputLabel>
            <Select value={selectedRosterId} label="Roster Period" onChange={e => setSelectedRosterId(e.target.value)}>
              {rostersForWard.map(r => (
                <MenuItem key={r.roster_id} value={r.roster_id}>
                  {r.roster_input?.meta?.period ?? format(new Date(r.created_at), 'MMM yyyy')}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button size="small" variant="text" startIcon={<AddOutlinedIcon />} onClick={() => setGenerateDialog(true)}>
            Generate New
          </Button>
          {selectedRosterId && (
            <Button size="small" variant="text" color="error" startIcon={<DeleteOutlineOutlinedIcon />}
              onClick={() => setDeleteConfirm(true)}>
              Delete
            </Button>
          )}
        </Box>

        {rostersLoading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>}

        {!rostersLoading && rosters?.length === 0 && (
          <Alert severity="info">No rosters found. Generate one to get started.</Alert>
        )}

        {selectedRoster && (
          <>
            {/* Stats row */}
            <Box sx={{ display: 'flex', gap: 2.5, mb: 2.5, flexWrap: 'wrap' }}>
              <Card sx={{ flex: '1 1 160px', boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="caption" color="text.secondary">Total Coverage</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mt: 0.5 }}>
                    <Typography variant="h5" fontWeight={800} color="primary.main">{coveredShifts}%</Typography>
                    <Typography variant="caption" color="success.main">↑ +1% vs last week</Typography>
                  </Box>
                </CardContent>
              </Card>
              <Card sx={{ flex: '1 1 160px', boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="caption" color="text.secondary">Open Shifts</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <Typography variant="h5" fontWeight={800} color="warning.main">
                      {Object.values(weekData).reduce((a, day) => a + Object.values(day).filter(s => s.length === 0).length, 0)}
                    </Typography>
                    <Chip label="Critical Focus needed" size="small"
                      sx={{ fontSize: '0.65rem', height: 18, bgcolor: '#FEF3C7', color: '#92400E' }} />
                  </Box>
                </CardContent>
              </Card>
              <Card sx={{ flex: '1 1 160px', boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="caption" color="text.secondary">Staff Well-being</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <Typography variant="h5" fontWeight={800} color="success.main">High</Typography>
                    <Chip label="Low fatigue scores" size="small"
                      sx={{ fontSize: '0.65rem', height: 18, bgcolor: '#D1FAE5', color: '#065F46' }} />
                  </Box>
                </CardContent>
              </Card>
            </Box>

            {/* Roster grid */}
            <Card sx={{ overflow: 'auto' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, minWidth: 160, bgcolor: '#F8FAFC', fontSize: '0.75rem' }}>
                      Nurse Name
                    </TableCell>
                    {visibleDays.map(day => (
                      <TableCell key={day.toISOString()} align="center"
                        sx={{ fontWeight: 600, minWidth: 90, bgcolor: '#F8FAFC', fontSize: '0.75rem' }}>
                        <Typography variant="caption" fontWeight={700}>{format(day, 'EEE')}</Typography>
                        <br />
                        <Typography variant="caption" color="text.secondary">{format(day, 'MMM d')}</Typography>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {staffDetails.map(staff => (
                    <TableRow key={staff.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 28, height: 28, bgcolor: 'primary.light', fontSize: '0.7rem' }}>
                            {staff.name.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.8rem' }}>{staff.name}</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                              {staff.grade} · {staff.position}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      {visibleDays.map(day => {
                        const dayKey = format(day, 'yyyy-MM-dd')
                        const shifts = weekData[dayKey]?.[staff.id] ?? []
                        return (
                          <TableCell key={dayKey} align="center"
                            sx={{ p: 0.5, cursor: 'pointer', '&:hover .add-btn': { opacity: 1 } }}
                            onClick={() => handleAddShift(dayKey, staff.id)}
                          >
                            {shifts.length === 0 ? (
                              <Box className="add-btn" sx={{ opacity: 0, transition: 'opacity 0.15s', color: 'text.disabled', fontSize: '0.7rem' }}>
                                + Add
                              </Box>
                            ) : (
                              shifts.map(shift => {
                                const sc = getShiftColor(shift.code)
                                return (
                                  <Chip
                                    key={shift.id}
                                    label={getShiftTimes(shift.code)}
                                    size="small"
                                    onDelete={(e) => { e.stopPropagation(); handleRemoveShift(dayKey, staff.id, shift.code) }}
                                    sx={{
                                      fontSize: '0.65rem', height: 22, mb: 0.25,
                                      bgcolor: sc.bg, color: sc.color, fontWeight: 500,
                                      '& .MuiChip-deleteIcon': { fontSize: 12, color: sc.color },
                                    }}
                                  />
                                )
                              })
                            )}
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </>
        )}

        {/* AI Copilot FAB */}
        <Tooltip title="AI Copilot">
          <Box
            onClick={() => setCopilotOpen(p => !p)}
            sx={{
              position: 'fixed', bottom: 32, right: 32,
              width: 48, height: 48, borderRadius: '50%',
              bgcolor: 'primary.main', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', boxShadow: '0 4px 12px rgba(11,171,135,0.4)',
              zIndex: 1200,
              '&:hover': { bgcolor: 'primary.dark' },
            }}
          >
            <AutoAwesomeOutlinedIcon />
          </Box>
        </Tooltip>

        {/* Copilot Drawer */}
        {copilotOpen && (
          <Card sx={{
            position: 'fixed', bottom: 96, right: 32, width: 340,
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)', zIndex: 1200,
            display: 'flex', flexDirection: 'column', maxHeight: 480,
          }}>
            <CardContent sx={{ pb: '0 !important', display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AutoAwesomeOutlinedIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                  <Typography variant="subtitle2" fontWeight={600}>AI Copilot</Typography>
                </Box>
                <IconButton size="small" onClick={() => setCopilotOpen(false)}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
              {/* Chat history */}
              <Box sx={{ flex: 1, overflowY: 'auto', mb: 1.5, maxHeight: 320 }}>
                {chatHistory.map((msg, i) => (
                  <Box key={i} sx={{
                    display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', mb: 1,
                  }}>
                    <Box sx={{
                      maxWidth: '85%', px: 1.5, py: 1, borderRadius: '10px',
                      bgcolor: msg.role === 'user' ? 'primary.main' : '#F1F5F9',
                      color: msg.role === 'user' ? '#fff' : 'text.primary',
                    }}>
                      <Typography variant="caption" sx={{ lineHeight: 1.5 }}>{msg.text}</Typography>
                    </Box>
                  </Box>
                ))}
                {chatMutation.isPending && (
                  <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 1 }}>
                    <Box sx={{ px: 1.5, py: 1, borderRadius: '10px', bgcolor: '#F1F5F9' }}>
                      <Typography variant="caption" color="text.secondary">Thinking…</Typography>
                    </Box>
                  </Box>
                )}
              </Box>
              {/* Input */}
              <Box sx={{ display: 'flex', gap: 1, pb: 1.5 }}>
                <TextField
                  fullWidth size="small" placeholder="Ask Copilot…" value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChat() } }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '20px', fontSize: '0.82rem' } }}
                />
                <IconButton
                  size="small" onClick={handleChat} disabled={chatMutation.isPending || !chatInput.trim()}
                  sx={{ bgcolor: 'primary.main', color: '#fff', borderRadius: '50%', width: 32, height: 32, '&:hover': { bgcolor: 'primary.dark' } }}
                >
                  <SendOutlinedIcon sx={{ fontSize: 15 }} />
                </IconButton>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Shift selector dialog */}
        <Dialog open={shiftSelectorOpen} onClose={() => setShiftSelectorOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>
            <Typography fontWeight={600}>Select Shift</Typography>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, pt: 1 }}>
              {Object.entries(SHIFT_COLORS).filter(([k]) => k !== 'OFF').map(([code, sc]) => (
                <Chip
                  key={code}
                  label={`${code} — ${sc.label}`}
                  onClick={() => handleShiftSelected(code)}
                  sx={{ bgcolor: sc.bg, color: sc.color, fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }}
                />
              ))}
            </Box>
          </DialogContent>
        </Dialog>

        {/* Delete confirm */}
        <Dialog open={deleteConfirm} onClose={() => setDeleteConfirm(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Delete Roster</DialogTitle>
          <DialogContent>
            <Typography>Are you sure you want to delete this roster? This cannot be undone.</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteConfirm(false)}>Cancel</Button>
            <Button color="error" variant="contained" onClick={handleDelete} disabled={deleteMutation.isPending}>
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* Generate dialog placeholder */}
        <Dialog open={generateDialog} onClose={() => setGenerateDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Generate New Roster</DialogTitle>
          <DialogContent>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Configure roster generation parameters. Full generation UI coming soon.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setGenerateDialog(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  )
}
