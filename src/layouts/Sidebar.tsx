import { Drawer, List, ListItem, ListItemText } from "@mui/material";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const Sidebar = () => {
  const { user } = useAuth();
  const userRole = user?.role?.toUpperCase();

  // Admin can see all routes
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
  // Ward incharge can only see roster
  const isWardIncharge = userRole === 'WARD_INCHARGE';

  return (
    <Drawer variant="permanent" anchor="left">
      <List>
        {!isWardIncharge && (
          <ListItem component={Link} to="/">
            <ListItemText primary="Dashboard" />
          </ListItem>
        )}
        <ListItem component={Link} to="/roster">
          <ListItemText primary="Roster" />
        </ListItem>
        {isAdmin && (
          <ListItem component={Link} to="/settings">
            <ListItemText primary="Settings" />
          </ListItem>
        )}
      </List>
    </Drawer>
  );
};

export default Sidebar;