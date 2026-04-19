import { Card, CardContent, Typography, List, ListItem, ListItemText } from "@mui/material";

const NotificationCard = () => (
  <Card sx={{ mt: 2 }}>
    <CardContent>
      <Typography variant="h6" gutterBottom>
        Notifications
      </Typography>
      <List>
        <ListItem>
          <ListItemText 
            primary="Staff shortage in ICU" 
            secondary="2 hours ago" 
          />
        </ListItem>
        <ListItem>
          <ListItemText 
            primary="Shift swap request" 
            secondary="4 hours ago" 
          />
        </ListItem>
        <ListItem>
          <ListItemText 
            primary="New schedule published" 
            secondary="1 day ago" 
          />
        </ListItem>
      </List>
    </CardContent>
  </Card>
);

export default NotificationCard;
