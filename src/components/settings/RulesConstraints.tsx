import { Box, Card, CardContent, Grid, Switch, TextField, Typography } from "@mui/material";

const RulesConstraints = () => {
  return (
    <>
      <Typography variant="h5" fontWeight="bold" color="#1F2937" mb={3}>
        Rules & Constraints
      </Typography>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" color="#1F2937" mb={2}>
                Coverage Rules
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">Enforce exact coverage</Typography>
                  <Switch defaultChecked />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">Minimum staff per shift</Typography>
                  <TextField size="small" type="number" defaultValue={2} sx={{ width: 80 }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" color="#1F2937" mb={2}>
                Staff Rules
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">One shift per day</Typography>
                  <Switch defaultChecked />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">Rest after 2 nights</Typography>
                  <Switch defaultChecked />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">N4 only General shifts</Typography>
                  <Switch defaultChecked />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" color="#1F2937" mb={2}>
                Weekly Constraints
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">Minimum weekly off days</Typography>
                  <TextField size="small" type="number" defaultValue={1} sx={{ width: 80 }} />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">Maximum consecutive days</Typography>
                  <TextField size="small" type="number" defaultValue={5} sx={{ width: 80 }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  );
};

export default RulesConstraints;


