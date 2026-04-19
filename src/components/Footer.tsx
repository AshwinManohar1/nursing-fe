import { Grid, Typography } from "@mui/material";

const Footer = () => {
  return (
    <Grid
      container
      justifyContent="center"
      alignItems="center"
      sx={{ bgcolor: "grey.100", py: 2 }}
    >
      <Grid size={12} textAlign="center">
        <Typography variant="body2" color="textSecondary">
          © {new Date().getFullYear()} ShiftWise. All rights reserved.
        </Typography>
      </Grid>
    </Grid>
  );
};

export default Footer;