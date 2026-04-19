import { Card, CardContent, Typography } from "@mui/material";

const SystemSettings = () => {
  return (
    <>
      <Typography variant="h5" fontWeight="bold" color="#1F2937" mb={3}>
        System Settings
      </Typography>
      <Card>
        <CardContent>
          <Typography variant="body1" color="#6B7280">
            System configuration and preferences will be managed here.
          </Typography>
        </CardContent>
      </Card>
    </>
  );
};

export default SystemSettings;


