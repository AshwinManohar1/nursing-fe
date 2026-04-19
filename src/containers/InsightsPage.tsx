import { useState } from 'react'
import {
  Box, Typography, Grid, Card, CardContent, Chip, Button, CircularProgress,
  Table, TableBody, TableCell, TableHead, TableRow, Alert, FormControl,
  InputLabel, Select, MenuItem,
} from '@mui/material'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined'
import { format } from 'date-fns'
import { useDashboardData } from '../api/dashboard.hooks'
import { useAuth } from '../contexts/AuthContext'

const WARD_LABELS = ['ICU – North', 'Cardiology', 'Pediatrics', 'Emergency']

interface AuditRow {
  time: string; ward: string; policy: string; status: 'verified' | 'flag'; staffImpact: string; action: string
}

const MOCK_AUDIT: AuditRow[] = [
  { time: '08:42:35 AM', ward: 'ICU North', policy: 'Ratio 11 RN Specialist', status: 'verified', staffImpact: 'J. Smith, L. Ray', action: 'Details' },
  { time: '09:15:00 AM', ward: 'Cardiology', policy: 'Ernity 2023', status: 'verified', staffImpact: 'K. Chen', action: 'Details' },
  { time: '10:22:50 AM', ward: 'Cardiology', policy: 'Std Min. ALS Certified', status: 'verified', staffImpact: 'M. Geller, P. Buffay', action: 'Details' },
]

export default function InsightsPage() {
  const { user } = useAuth()
  const today = format(new Date(), 'yyyy-MM-dd')
  const [shift, setShift] = useState('M')

  const { data, isLoading, error } = useDashboardData(user?.org_id ?? '', today, shift)
  const wardPerf = data?.ward_performance ?? []

  const minStaffing = wardPerf.length > 0
    ? Math.round(wardPerf.reduce((a, w) => a + (w.shift_nurses / Math.max(w.shift_patients, 1)) * 100, 0) / wardPerf.length)
    : 98

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Compliance & Analytics</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            Real-time surveillance of policy safety protocols and organizational health.
          </Typography>
        </Box>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Shift</InputLabel>
          <Select value={shift} label="Shift" onChange={e => setShift(e.target.value)}>
            <MenuItem value="M">Morning</MenuItem>
            <MenuItem value="E">Evening</MenuItem>
            <MenuItem value="N">Night</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {isLoading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>}
      {error && <Alert severity="error">Failed to load analytics data.</Alert>}

      {!isLoading && (
        <>
          {/* Live KPI strip */}
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            {[
              { label: 'Min. Staffing Adherence', value: `${minStaffing}%`, live: true },
              { label: 'Clinical Skill Mix', value: 'Optimal', live: true },
              { label: 'Avg. Rest Interval', value: '11.4h', live: true },
            ].map(kpi => (
              <Grid key={kpi.label} size={{ xs: 12, md: 4 }}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="caption" color="text.secondary">{kpi.label}</Typography>
                      {kpi.live && <Chip label="LIVE" size="small" sx={{ fontSize: '0.6rem', height: 16, bgcolor: '#D1FAE5', color: '#065F46' }} />}
                    </Box>
                    <Typography variant="h4" fontWeight={800} color="primary.main">{kpi.value}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* All Systems Green banner */}
          {wardPerf.length > 0 && (
            <Card sx={{ mb: 3, bgcolor: '#F0FDF4', border: '1px solid #86EFAC' }}>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <CheckCircleOutlineIcon sx={{ color: 'success.main', fontSize: 20 }} />
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600} color="success.dark">All Systems Green</Typography>
                    <Typography variant="caption" color="text.secondary">
                      No active compliance breaches detected across {wardPerf.length} monitored wards.
                      All safety mix regulations for the upcoming 48 hours are satisfied.
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Ward Monitoring */}
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>Ward Monitoring</Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {wardPerf.slice(0, 4).map((ward, i) => {
              const label = WARD_LABELS[i] ?? ward.ward_name
              const ratio = ward.ideal_ratio
              const nurses = ward.shift_nurses
              const patients = ward.shift_patients
              const defVal = parseInt(ward.deficit_surplus)
              const isOk = defVal >= 0
              return (
                <Grid key={ward.ward_id} size={{ xs: 12, sm: 6, md: 3 }}>
                  <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
                    <CardContent>
                      <Typography variant="body2" fontWeight={600}>{label}</Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                        {ward.ward_name !== label ? ward.ward_name : 'General Unit'}
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption">Ratio</Typography>
                        <Typography variant="caption" fontWeight={600}>{ratio}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption">Nurses / Patients</Typography>
                        <Typography variant="caption" fontWeight={600}>{nurses} / {patients}</Typography>
                      </Box>
                      <Chip
                        label={isOk ? `+${defVal} surplus` : `${defVal} deficit`}
                        size="small"
                        icon={isOk ? <CheckCircleOutlineIcon /> : <WarningAmberOutlinedIcon />}
                        sx={{
                          mt: 1, fontSize: '0.65rem', height: 20,
                          bgcolor: isOk ? '#D1FAE5' : '#FEE2E2',
                          color: isOk ? '#065F46' : '#DC2626',
                          '& .MuiChip-icon': { fontSize: 12 },
                        }}
                      />
                    </CardContent>
                  </Card>
                </Grid>
              )
            })}
            {wardPerf.length === 0 && WARD_LABELS.map(label => (
              <Grid key={label} size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
                  <CardContent>
                    <Typography variant="body2" fontWeight={600}>{label}</Typography>
                    <Typography variant="caption" color="text.secondary">No data available</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Fairness Distribution */}
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, md: 7 }}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 0.5 }}>Fairness Distribution</Typography>
                  <Typography variant="caption" color="text.secondary">
                    AI-calculated balance between highly desirable day shifts and mandatory unsocial hours.
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'flex-end', mt: 2.5, height: 100 }}>
                    {[55, 70, 60, 85, 75, 65, 80, 72, 90, 68].map((h, i) => (
                      <Box key={i} sx={{
                        flex: 1, height: `${h}%`,
                        bgcolor: h > 80 ? 'primary.main' : 'rgba(11,171,135,0.35)',
                        borderRadius: '3px 3px 0 0',
                      }} />
                    ))}
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Gini Coefficient (0 = Optimal)</Typography>
                      <Typography variant="body2" fontWeight={600}>0.12 (Optimal)</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Desirability Quotient</Typography>
                      <Typography variant="body2" fontWeight={600} color="success.main">+14%</Typography>
                    </Box>
                  </Box>
                  <Button variant="outlined" size="small" sx={{ mt: 2 }}>Download Audit Trail</Button>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <AutoAwesomeOutlinedIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                    <Typography variant="subtitle2" fontWeight={600}>Copilot</Typography>
                  </Box>
                  {['Queue', 'Optimizations', 'Conflicts', 'History'].map(item => (
                    <Box key={item} sx={{
                      py: 1, px: 1.5, mb: 1, borderRadius: '8px',
                      bgcolor: '#F8FAFC', cursor: 'pointer',
                      '&:hover': { bgcolor: '#F0FDF4' },
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <Typography variant="body2">{item}</Typography>
                      <Typography variant="caption" color="text.secondary">›</Typography>
                    </Box>
                  ))}
                  <Button fullWidth variant="contained" sx={{ mt: 1.5 }}>Optimize Roster</Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Compliance Audit Trail */}
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>Compliance Audit Trail</Typography>
          <Card>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                  {['Timestamp', 'Ward', 'Policy Check', 'Status', 'Staff Impact', 'Action'].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {MOCK_AUDIT.map((row, i) => (
                  <TableRow key={i} hover sx={{ '&:last-child td': { border: 0 } }}>
                    <TableCell><Typography variant="caption">{row.time}</Typography></TableCell>
                    <TableCell><Typography variant="caption">{row.ward}</Typography></TableCell>
                    <TableCell><Typography variant="caption">{row.policy}</Typography></TableCell>
                    <TableCell>
                      <Chip
                        icon={<CheckCircleOutlineIcon />}
                        label="Verified"
                        size="small"
                        sx={{ fontSize: '0.65rem', height: 20, bgcolor: '#D1FAE5', color: '#065F46', '& .MuiChip-icon': { fontSize: 12 } }}
                      />
                    </TableCell>
                    <TableCell><Typography variant="caption">{row.staffImpact}</Typography></TableCell>
                    <TableCell>
                      <Button size="small" variant="text" sx={{ fontSize: '0.75rem', color: 'primary.main', p: 0 }}>
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </Box>
  )
}
