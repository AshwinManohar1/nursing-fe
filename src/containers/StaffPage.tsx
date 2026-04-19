import { useState, useEffect } from 'react'
import {
  Box, Typography, Button, Chip, Avatar, TextField, FormControl, InputLabel,
  Select, MenuItem, Table, TableBody, TableCell, TableHead, TableRow, Card,
  CardContent, CircularProgress, Alert, IconButton, InputAdornment, Dialog,
  DialogTitle, DialogContent, DialogActions, Grid, Pagination,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined'
import CloseIcon from '@mui/icons-material/Close'
import MoreVertOutlinedIcon from '@mui/icons-material/MoreVertOutlined'
import { useStaffList, useAddStaff, useUpdateStaff, useDeleteStaff, useUploadStaffCSV } from '../api/staff.hooks'
import { fetchWards } from '../api'
import { useAuth } from '../contexts/AuthContext'
import type { Staff, StaffRole } from '../api/types'

interface Ward { _id?: string; id?: string; name: string }

const POSITION_LABELS: Record<string, string> = {
  ward_incharge: 'Ward Incharge',
  staff_nurse: 'Staff Nurse',
  admin: 'Admin',
  shift_incharge: 'Shift Incharge',
}

const getStatusChip = (staff: Staff) => {
  const pos = (staff.position ?? '').toLowerCase()
  if (pos.includes('incharge')) return { label: 'On Shift (Night)', bg: '#DCFCE7', color: '#166534' }
  if (pos.includes('admin')) return { label: 'Off Duty', bg: '#F3F4F6', color: '#6B7280' }
  return { label: 'On Shift (Morning)', bg: '#DBEAFE', color: '#1E40AF' }
}

const emptyForm = {
  name: '', grade: '', emp_id: '', email: '', position: '' as StaffRole | '',
  contact_no: '', gender: '' as '' | 'MALE' | 'FEMALE' | 'OTHER',
  experience_years: 0, wardIds: [] as string[], hospital_id: '',
}

export default function StaffPage() {
  const { user } = useAuth()
  const isWardIncharge = user?.role?.toUpperCase() === 'WARD_INCHARGE'

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null)
  const [form, setForm] = useState({ ...emptyForm, hospital_id: user?.org_id ?? '' })
  const [wards, setWards] = useState<Ward[]>([])
  const [insightOpen, setInsightOpen] = useState(false)

  const { data, isLoading, error, refetch } = useStaffList(page, 20, search)
  const addMutation = useAddStaff()
  const updateMutation = useUpdateStaff()
  const deleteMutation = useDeleteStaff()
  const uploadMutation = useUploadStaffCSV()

  const staffList: Staff[] = data?.items ?? []
  const pagination = data?.pagination
  const totalPages = pagination?.total_pages ?? 1

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1) }, 500)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    fetchWards().then((res: unknown) => {
      const list = (res as { wards?: Ward[] }).wards ?? (res as Ward[])
      setWards(Array.isArray(list) ? list : [])
    }).catch(() => setWards([]))
  }, [])

  const filtered = roleFilter
    ? staffList.filter(s => s.position === roleFilter)
    : staffList

  const fairnessIndex = 94.2

  const openNew = () => {
    setEditingStaff(null)
    setForm({ ...emptyForm, hospital_id: user?.org_id ?? '' })
    setDialogOpen(true)
  }

  const openEdit = (s: Staff) => {
    setEditingStaff(s)
    const wardIds = Array.isArray(s.ward_id) ? s.ward_id.map(String) : []
    setForm({
      name: s.name, grade: s.grade, emp_id: s.emp_id, email: '',
      position: s.position as StaffRole, contact_no: String(s.contact_no ?? ''),
      gender: (s.gender as typeof emptyForm['gender']) ?? '',
      experience_years: s.experience_years, wardIds, hospital_id: user?.org_id ?? '',
    })
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    const payload = {
      name: form.name, grade: form.grade, emp_id: form.emp_id,
      position: form.position as StaffRole,
      contact_no: form.contact_no.replace(/\D/g, ''),
      gender: form.gender || undefined,
      experience_years: form.experience_years,
      hospital_id: form.hospital_id || user?.org_id || '',
      ward_id: form.wardIds,
    }
    try {
      if (editingStaff) {
        await updateMutation.mutateAsync({ id: editingStaff._id ?? editingStaff.id, payload })
      } else {
        await addMutation.mutateAsync(payload)
      }
      setDialogOpen(false)
    } catch { /* handled by mutation */ }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this staff member?')) return
    await deleteMutation.mutateAsync(id)
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Staff Management</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            Manage clinical personnel, roles, and fairness metrics.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          {/* Fairness Index badge */}
          <Card sx={{ px: 2, py: 1, boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary">Fairness Index</Typography>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
              <Typography variant="h5" fontWeight={800} color="primary.main">{fairnessIndex}%</Typography>
              <Typography variant="caption" color="success.main">↑ +1.4%</Typography>
            </Box>
          </Card>
          <Chip label="All Staff" size="small" variant="outlined" />
          <Chip label="On Shift" size="small" variant="outlined" />
        </Box>
      </Box>

      {/* Filters row */}
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2.5, flexWrap: 'wrap' }}>
        <TextField
          placeholder="Search nurse or staff…"
          size="small"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          sx={{ width: 260 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} /></InputAdornment>,
          }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Filter by role</InputLabel>
          <Select value={roleFilter} label="Filter by role" onChange={e => setRoleFilter(e.target.value)}>
            <MenuItem value="">All Roles</MenuItem>
            <MenuItem value="ward_incharge">Ward Incharge</MenuItem>
            <MenuItem value="staff_nurse">Staff Nurse</MenuItem>
            <MenuItem value="shift_incharge">Shift Incharge</MenuItem>
            <MenuItem value="admin">Admin</MenuItem>
          </Select>
        </FormControl>
        <Button
          variant="contained"
          startIcon={<AddOutlinedIcon />}
          onClick={openNew}
          sx={{ ml: 'auto' }}
        >
          Add Staff Member
        </Button>
        <Button
          component="label"
          variant="outlined"
          size="small"
        >
          Upload CSV
          <input hidden type="file" accept=".csv"
            onChange={async e => {
              const f = e.target.files?.[0]
              if (f && user?.org_id) await uploadMutation.mutateAsync({ file: f, org_id: user.org_id })
            }}
          />
        </Button>
      </Box>

      {uploadMutation.isSuccess && <Alert severity="success" sx={{ mb: 2 }}>CSV uploaded successfully.</Alert>}
      {uploadMutation.isError && <Alert severity="error" sx={{ mb: 2 }}>CSV upload failed.</Alert>}

      {/* Main table */}
      <Box sx={{ display: 'flex', gap: 2.5, alignItems: 'flex-start' }}>
        <Card sx={{ flex: 1, minWidth: 0 }}>
          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
            {isLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
            )}
            {error && (
              <Alert severity="error" sx={{ m: 2 }}>
                Failed to load staff.{' '}
                <Button size="small" onClick={() => refetch()}>Retry</Button>
              </Alert>
            )}
            {!isLoading && !error && (
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                    {['Personnel', 'Department & Role', 'Status', 'Fairness Score', 'Actions'].map(h => (
                      <TableCell key={h} sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary', py: 1.5 }}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map(staff => {
                    const sc = getStatusChip(staff)
                    const score = 70 + Math.floor((staff.experience_years ?? 0) * 3) % 30
                    const wardId = Array.isArray(staff.ward_id) ? staff.ward_id[0] : staff.ward_id
                    const wardName = wards.find(w => (w._id ?? w.id) === wardId)?.name ?? 'General'
                    return (
                      <TableRow key={staff._id ?? staff.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.light', fontSize: '0.8rem' }}>
                              {staff.name.charAt(0)}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight={500}>{staff.name}</Typography>
                              <Typography variant="caption" color="text.secondary">ID: {staff.emp_id}</Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{wardName}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {POSITION_LABELS[staff.position] ?? staff.position}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={sc.label} size="small"
                            sx={{ fontSize: '0.72rem', height: 22, bgcolor: sc.bg, color: sc.color, fontWeight: 500 }} />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{
                              width: 48, height: 6, borderRadius: 3,
                              bgcolor: '#E2E8F0',
                              position: 'relative',
                              overflow: 'hidden',
                            }}>
                              <Box sx={{
                                position: 'absolute', left: 0, top: 0, height: '100%',
                                width: `${score}%`,
                                bgcolor: score > 80 ? 'primary.main' : score > 60 ? 'warning.main' : 'error.main',
                                borderRadius: 3,
                              }} />
                            </Box>
                            <Typography variant="body2" fontWeight={600}>{score}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Button size="small" variant="text" sx={{ fontSize: '0.75rem', color: 'primary.main' }}
                              onClick={() => openEdit(staff)}>
                              Edit
                            </Button>
                            <IconButton size="small" onClick={() => handleDelete(staff._id ?? staff.id)}>
                              <MoreVertOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {filtered.length === 0 && !isLoading && (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>No staff found.</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
            {pagination && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, py: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary">
                  Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, pagination.total)} of {pagination.total} staff members
                </Typography>
                <Pagination
                  count={totalPages} page={page} onChange={(_, v) => setPage(v)}
                  size="small" color="primary"
                />
              </Box>
            )}
          </CardContent>
        </Card>

        {/* AI Insights Panel */}
        <Box sx={{ width: 240, flexShrink: 0 }}>
          <Card
            sx={{ cursor: 'pointer', border: '1px solid', borderColor: insightOpen ? 'primary.main' : 'divider' }}
            onClick={() => setInsightOpen(p => !p)}
          >
            <CardContent sx={{ pb: '12px !important' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <AutoAwesomeOutlinedIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                <Typography variant="caption" fontWeight={600} color="primary.main">AI Insights</Typography>
                <Chip label="Low Assistant" size="small"
                  sx={{ ml: 'auto', fontSize: '0.6rem', height: 16, bgcolor: '#F0FDF4', color: 'primary.dark' }} />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                Equity Alert: Nurse Marcus Chen has the lowest fairness score (82) in Pediatrics.
                Consider assigning him a preferred morning shift next week to balance the index.
              </Typography>
              <Button
                fullWidth variant="contained" size="small"
                sx={{ mt: 1.5, borderRadius: '6px', fontSize: '0.75rem' }}
              >
                Apply Recommendations
              </Button>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Add/Edit Staff Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography fontWeight={600}>{editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}</Typography>
          <IconButton size="small" onClick={() => setDialogOpen(false)}><CloseIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            {[
              { label: 'Full Name', key: 'name', type: 'text' },
              { label: 'Employee ID', key: 'emp_id', type: 'text' },
              { label: 'Contact No.', key: 'contact_no', type: 'tel' },
              { label: 'Experience (yrs)', key: 'experience_years', type: 'number' },
            ].map(({ label, key, type }) => (
              <Grid key={key} size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label={label} type={type} size="small"
                  value={(form as Record<string, unknown>)[key] as string}
                  onChange={e => setForm(p => ({ ...p, [key]: type === 'number' ? Number(e.target.value) : e.target.value }))}
                />
              </Grid>
            ))}
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Grade</InputLabel>
                <Select value={form.grade} label="Grade" onChange={e => setForm(p => ({ ...p, grade: e.target.value }))}>
                  {['N4', 'N5', 'N6', 'N7', 'N8'].map(g => <MenuItem key={g} value={g}>{g}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Position</InputLabel>
                <Select value={form.position} label="Position" onChange={e => setForm(p => ({ ...p, position: e.target.value as StaffRole }))}>
                  <MenuItem value="ward_incharge">Ward Incharge</MenuItem>
                  <MenuItem value="staff_nurse">Staff Nurse</MenuItem>
                  <MenuItem value="shift_incharge">Shift Incharge</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Gender</InputLabel>
                <Select value={form.gender} label="Gender"
                  onChange={e => setForm(p => ({ ...p, gender: e.target.value as typeof form.gender }))}>
                  <MenuItem value="MALE">Male</MenuItem>
                  <MenuItem value="FEMALE">Female</MenuItem>
                  <MenuItem value="OTHER">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Ward(s)</InputLabel>
                <Select
                  multiple={!isWardIncharge}
                  value={form.wardIds}
                  label="Ward(s)"
                  onChange={e => {
                    const v = e.target.value
                    setForm(p => ({ ...p, wardIds: Array.isArray(v) ? v.map(String) : [String(v)] }))
                  }}
                  renderValue={sel => (sel as string[]).map(id => wards.find(w => (w._id ?? w.id) === id)?.name ?? id).join(', ')}
                >
                  {wards.map(w => (
                    <MenuItem key={w._id ?? w.id} value={w._id ?? w.id}>{w.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} variant="outlined">Cancel</Button>
          <Button onClick={handleSubmit} variant="contained"
            disabled={addMutation.isPending || updateMutation.isPending}>
            {editingStaff ? 'Update' : 'Add Staff'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
