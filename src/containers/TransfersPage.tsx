import { useState, useEffect, useMemo } from 'react'
import {
  Box, Typography, Button, Chip, FormControl, InputLabel, Select, MenuItem,
  Card, CardContent, CircularProgress, Alert, Table, TableBody, TableCell,
  TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Tabs, Tab, Avatar,
} from '@mui/material'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { format } from 'date-fns'
import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import SwapHorizOutlinedIcon from '@mui/icons-material/SwapHorizOutlined'
import { useWardTransfers, useCreateWardTransfer } from '../api/wardTransfer.hooks'
import { useStaffList } from '../api/staff.hooks'
import { useRosters } from '../api/roster.hooks'
import { fetchWards } from '../api'
import { useAuth } from '../contexts/AuthContext'
import type { WardTransfer } from '../api/types'

interface Ward { _id?: string; id?: string; name: string }

const SHIFT_OPTIONS = [
  { value: 'M', label: 'Morning' },
  { value: 'E', label: 'Evening' },
  { value: 'N', label: 'Night' },
  { value: 'G', label: 'General' },
]

const emptyForm = {
  staff_id: '', from_ward_id: '', to_ward_id: '',
  transfer_date: '', from_shift: '', to_shift: '', remarks: '',
}

export default function TransfersPage() {
  const { user } = useAuth()
  const hospitalId = user?.org_id ?? ''

  const [tab, setTab] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ ...emptyForm })
  const [transferDate, setTransferDate] = useState<Date | null>(null)
  const [wards, setWards] = useState<Ward[]>([])

  const { data: transfersData, isLoading, error, refetch } = useWardTransfers(hospitalId)
  const { data: staffData } = useStaffList(1, 1000)
  const { data: rosters } = useRosters()
  const createMutation = useCreateWardTransfer()

  const staffList = staffData?.items ?? []
  const transfers: WardTransfer[] = (transfersData as { data?: { transfers?: WardTransfer[] } })?.data?.transfers ?? []

  useEffect(() => {
    fetchWards().then((res: unknown) => {
      const list = (res as { wards?: Ward[] }).wards ?? (res as Ward[])
      setWards(Array.isArray(list) ? list : [])
    }).catch(() => setWards([]))
  }, [])

  // Auto-fill from_shift from active roster when staff + ward + date are set
  const autoShift = useMemo(() => {
    if (!form.staff_id || !form.from_ward_id || !form.transfer_date) return ''
    const wardRosters = (rosters ?? []).filter(r => r.roster_input?.ward_id === form.from_ward_id)
    for (const roster of wardRosters) {
      const staff = roster.roster_input?.staff_details?.find(s => s._id === form.staff_id || s.id === form.staff_id)
      if (!staff?.emp_id) continue
      const start = new Date(roster.roster_input.meta.schedule_start_date)
      const target = new Date(form.transfer_date)
      const dayIndex = Math.floor((target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      const shifts = roster.roster?.[staff.emp_id]?.[dayIndex.toString()] ?? []
      const code = shifts.find(c => c !== 'OFF')
      if (code) return code
    }
    return ''
  }, [form.staff_id, form.from_ward_id, form.transfer_date, rosters])

  useEffect(() => {
    if (autoShift) setForm(p => ({ ...p, from_shift: autoShift, to_shift: autoShift }))
  }, [autoShift])

  const handleSubmit = async () => {
    if (!form.staff_id || !form.from_ward_id || !form.to_ward_id || !form.transfer_date || !form.from_shift) {
      alert('Please fill all required fields.')
      return
    }
    await createMutation.mutateAsync({
      staff_id: form.staff_id,
      hospital_id: hospitalId,
      transfer_date: form.transfer_date,
      from_shift: form.from_shift,
      to_shift: form.to_shift || form.from_shift,
      from_ward_id: form.from_ward_id,
      to_ward_id: form.to_ward_id,
      created_by: user?.id ?? '',
      remarks: form.remarks || undefined,
    })
    setDialogOpen(false)
    setForm({ ...emptyForm })
    setTransferDate(null)
    refetch()
  }

  const wardName = (id: string) => wards.find(w => (w._id ?? w.id) === id)?.name ?? id
  const staffName = (id: string) => {
    const s = staffList.find(s => (s._id ?? s.id) === id)
    return s ? `${s.name} (${s.emp_id})` : id
  }

  const filtered = tab === 0
    ? transfers
    : tab === 1
      ? transfers.filter(t => t.from_ward_id === user?.ward_id?.[0])
      : transfers.filter(t => t.to_ward_id === user?.ward_id?.[0])

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3 }}>
          <Box>
            <Typography variant="h5" fontWeight={700}>Ward Transfers</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              Manage and track staff transfers across wards.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddOutlinedIcon />}
            onClick={() => setDialogOpen(true)}
          >
            New Transfer
          </Button>
        </Box>

        {/* Summary cards */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          {[
            { label: 'Total Transfers', value: transfers.length, color: 'primary.main' },
            { label: 'Outgoing', value: transfers.filter(t => t.from_ward_id === user?.ward_id?.[0]).length, color: 'warning.main' },
            { label: 'Incoming', value: transfers.filter(t => t.to_ward_id === user?.ward_id?.[0]).length, color: 'success.main' },
          ].map(c => (
            <Card key={c.label} sx={{ flex: '1 1 140px', boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="caption" color="text.secondary">{c.label}</Typography>
                <Typography variant="h4" fontWeight={800} sx={{ color: c.color }}>{c.value}</Typography>
              </CardContent>
            </Card>
          ))}
        </Box>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, '& .MuiTabs-indicator': { bgcolor: 'primary.main' } }}>
          <Tab label="All Transfers" />
          <Tab label="Outgoing" />
          <Tab label="Incoming" />
        </Tabs>

        {isLoading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>}
        {error && <Alert severity="error" action={<Button size="small" onClick={() => refetch()}>Retry</Button>}>Failed to load transfers.</Alert>}

        {!isLoading && (
          <Card>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                  {['Staff', 'Date', 'From Ward', 'To Ward', 'Shift', 'Status', 'Remarks'].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary', py: 1.5 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map(t => (
                  <TableRow key={t.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 28, height: 28, bgcolor: 'primary.light', fontSize: '0.7rem' }}>
                          {(staffList.find(s => (s._id ?? s.id) === t.staff_id)?.name ?? 'U').charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={500}>{staffName(t.staff_id)}</Typography>
                          <Typography variant="caption" color="text.secondary">{t.employee_id}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{t.transfer_date ? format(new Date(t.transfer_date), 'dd MMM yyyy') : '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="body2">{wardName(t.from_ward_id)}</Typography>
                        <Chip label={t.from_shift} size="small" sx={{ fontSize: '0.65rem', height: 18, bgcolor: '#FEF3C7', color: '#92400E' }} />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <SwapHorizOutlinedIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="body2">{wardName(t.to_ward_id)}</Typography>
                        <Chip label={t.to_shift} size="small" sx={{ fontSize: '0.65rem', height: 18, bgcolor: '#DBEAFE', color: '#1E40AF' }} />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{t.from_shift} → {t.to_shift}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={t.status ?? 'Applied'}
                        size="small"
                        color={t.status?.toLowerCase() === 'applied' ? 'success' : t.status?.toLowerCase() === 'pending' ? 'warning' : 'default'}
                        sx={{ fontSize: '0.7rem', height: 20 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">{t.remarks ?? '—'}</Typography>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>No transfers found.</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* Create Transfer Dialog */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle><Typography fontWeight={600}>New Ward Transfer</Typography></DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Staff Member *</InputLabel>
                <Select value={form.staff_id} label="Staff Member *"
                  onChange={e => setForm(p => ({ ...p, staff_id: e.target.value }))}>
                  {staffList.map(s => (
                    <MenuItem key={s._id ?? s.id} value={s._id ?? s.id}>
                      {s.name} ({s.emp_id}) — {s.grade}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <DatePicker
                label="Transfer Date *"
                value={transferDate}
                onChange={d => {
                  setTransferDate(d)
                  setForm(p => ({ ...p, transfer_date: d ? format(d, 'yyyy-MM-dd') : '' }))
                }}
                format="dd/MM/yyyy"
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />

              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>From Ward *</InputLabel>
                  <Select value={form.from_ward_id} label="From Ward *"
                    onChange={e => setForm(p => ({ ...p, from_ward_id: e.target.value }))}>
                    {wards.map(w => <MenuItem key={w._id ?? w.id} value={w._id ?? w.id}>{w.name}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl fullWidth size="small">
                  <InputLabel>To Ward *</InputLabel>
                  <Select value={form.to_ward_id} label="To Ward *"
                    onChange={e => setForm(p => ({ ...p, to_ward_id: e.target.value }))}>
                    {wards.filter(w => (w._id ?? w.id) !== form.from_ward_id).map(w => (
                      <MenuItem key={w._id ?? w.id} value={w._id ?? w.id}>{w.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>From Shift *</InputLabel>
                  <Select value={form.from_shift} label="From Shift *"
                    onChange={e => setForm(p => ({ ...p, from_shift: e.target.value }))}>
                    {SHIFT_OPTIONS.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl fullWidth size="small">
                  <InputLabel>To Shift</InputLabel>
                  <Select value={form.to_shift} label="To Shift"
                    onChange={e => setForm(p => ({ ...p, to_shift: e.target.value }))}>
                    {SHIFT_OPTIONS.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
                  </Select>
                </FormControl>
              </Box>

              <TextField
                label="Remarks (optional)" size="small" fullWidth multiline rows={2}
                value={form.remarks}
                onChange={e => setForm(p => ({ ...p, remarks: e.target.value }))}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDialogOpen(false)} variant="outlined">Cancel</Button>
            <Button onClick={handleSubmit} variant="contained" disabled={createMutation.isPending}>
              Create Transfer
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  )
}
