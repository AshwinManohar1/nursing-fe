import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  InputAdornment,
} from "@mui/material";
import {
  Business,
  People,
  Schedule,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import { useStaffList, useAddStaff, useUpdateStaff, useDeleteStaff, useUploadStaffCSV } from "../api/hooks";
import { fetchWards as apiFetchWards, createWard as apiCreateWard, updateWard as apiUpdateWard, deleteWard as apiDeleteWard } from "../api/index";
import type { StaffRole } from "../api/types";
import { useAuth } from "../contexts/AuthContext";
import Modal from "../components/ui/Modal";
import WardManagement from "../components/settings/WardManagement";
import StaffManagement from "../components/settings/StaffManagement";
import ShiftTemplates from "../components/settings/ShiftTemplates";
import RulesConstraints from "../components/settings/RulesConstraints";
import SystemSettings from "../components/settings/SystemSettings";

interface Ward {
  _id: string;
  id?: string; // For backward compatibility
  name: string;
  description?: string;
  total_beds: number;
  no_of_beds?: number; // For backward compatibility
  bed_nurse_ratio: number | string; // Can be number or "X:1" format
  bed_to_nurse_ratio?: number | string; // For backward compatibility
  created_at?: string;
  hospital_id?: string;
  updated_at?: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const SettingsPage = () => {
  const { user } = useAuth();
  const isWardIncharge = user?.role?.toUpperCase() === 'WARD_INCHARGE';
  // For ward_incharge, default to Staff Management tab (index 1)
  const [activeTab, setActiveTab] = useState(isWardIncharge ? 1 : 0);
  const [wardDialogOpen, setWardDialogOpen] = useState(false);
  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  // Shifts are hardcoded; no dialog needed
  const [editingWard, setEditingWard] = useState<Ward | null>(null);
  const [editingStaff, setEditingStaff] = useState<any>(null);

  // Ward form state
  const [wardForm, setWardForm] = useState({
    name: "",
    description: "",
    total_beds: 0,
    bed_nurse_ratio: 0,
  });
  const [ratioInput, setRatioInput] = useState<string>("");

  // Staff pagination state
  const [staffPage, setStaffPage] = useState(1);
  const [staffLimit] = useState(100);
  const [staffSearchInput, setStaffSearchInput] = useState<string>(""); // Immediate input value
  const [staffSearch, setStaffSearch] = useState<string>(""); // Debounced value for API

  // Staff form state
  const [staffForm, setStaffForm] = useState({
    name: "",
    grade: "",
    emp_id: "",
    email: "",
    position: "",
    contact_no: "",
    gender: "" as "" | "MALE" | "FEMALE" | "OTHER",
    experience_years: 0,
    wardIds: [] as string[],
    hospital_id: user?.org_id || "",
  });

  // Shift form state
  // Hardcoded shifts (no API)
  const staticShifts = [
    { id: "M", name: "Morning", startTime: "06:00", endTime: "12:00", department: "General", maxStaff: 0 },
    { id: "E", name: "Evening", startTime: "12:00", endTime: "18:00", department: "General", maxStaff: 0 },
    { id: "N", name: "Night", startTime: "18:00", endTime: "06:00", department: "General", maxStaff: 0 },
    { id: "G", name: "General", startTime: "09:00", endTime: "17:00", department: "General", maxStaff: 0 },
  ];

  const [wards, setWards] = useState<Ward[]>([]);
  const [isLoadingWards, setIsLoadingWards] = useState(false);
  const [wardError, setWardError] = useState<string | null>(null);

  // API hooks for staff
  const { data: staffData, isLoading: staffLoading, error: staffError, refetch: refetchStaff } = useStaffList(staffPage, staffLimit, staffSearch);

  // Refetch staff data when component mounts to ensure fresh data
  useEffect(() => {
    refetchStaff();
  }, [refetchStaff]); // refetchStaff is stable from React Query, safe to include

  // Load wards from API
  useEffect(() => {
    const load = async () => {
      setIsLoadingWards(true);
      setWardError(null);
      try {
        const response = await apiFetchWards();
        // Extract wards array from response object
        const wardsList = response.wards || response;
        setWards(Array.isArray(wardsList) ? wardsList : []);
      } catch (e: any) {
        setWardError(e?.response?.data?.message || "Failed to load wards");
      } finally {
        setIsLoadingWards(false);
      }
    };
    load();
  }, []);

  // Debounce search input - update API search after 500ms of no typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setStaffSearch(staffSearchInput);
      // Reset to page 1 when search changes
      setStaffPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [staffSearchInput]);

  const addStaffMutation = useAddStaff();
  const updateStaffMutation = useUpdateStaff();
  const deleteStaffMutation = useDeleteStaff();

  // Shifts API removed; using staticShifts
  const uploadCSVMutation = useUploadStaffCSV();

  // Safe data access with fallbacks
  const safeStaffList = staffData?.items || [];
  const staffPagination = staffData?.pagination || {
    total: 0,
    limit: staffLimit,
    offset: 0,
    current_page: 1,
    total_pages: 0,
    has_next: false,
    has_prev: false,
  };

  // Helpers to reset/open/close Ward modal state
  const resetWardFormState = () => {
    setEditingWard(null);
    setWardForm({ name: "", description: "", total_beds: 0, bed_nurse_ratio: 0 });
    setRatioInput("");
  };
  const openNewWard = () => {
    resetWardFormState();
    setWardDialogOpen(true);
  };
  const closeWardDialog = () => {
    resetWardFormState();
    setWardDialogOpen(false);
  };

  // Helpers to reset/open/close Staff modal state
  const emptyStaffState = {
    name: "",
    grade: "",
    emp_id: "",
    email: "",
    position: "",
    contact_no: "",
    gender: "" as "" | "MALE" | "FEMALE" | "OTHER",
    experience_years: 0,
    wardIds: [] as string[],
    hospital_id: user?.org_id || "",
  };
  const resetStaffFormState = () => {
    setEditingStaff(null);
    setStaffForm(emptyStaffState);
  };
  const openNewStaff = () => {
    resetStaffFormState();
    // Auto-select ward(s) for ward_incharge
    if (isWardIncharge && user?.ward_id && user.ward_id.length > 0) {
      // If single ward, auto-select it; if multiple, select the first one by default
      setStaffForm(prev => ({
        ...prev,
        wardIds: user.ward_id.length === 1 ? user.ward_id : [user.ward_id[0]],
      }));
    }
    setStaffDialogOpen(true);
  };
  const closeStaffDialog = () => {
    resetStaffFormState();
    setStaffDialogOpen(false);
  };

  

  const formatRatio = (val: number | string): string => {
    if (typeof val === 'string' && val.includes(':')) {
      return val;
    }
    const numVal = typeof val === 'string' ? Number(val) : val;
    if (!Number.isFinite(numVal) || numVal <= 0) return "";
    const bedsPerNurse = Math.round(numVal);
    return `${bedsPerNurse}:1`;
  };

  const handleWardSubmit = async () => {
    // Treat input as beds per 1 nurse; enforce numeric > 0
    const bedsPerNurse = Number(ratioInput);
    const parsedRatio = Number.isFinite(bedsPerNurse) && bedsPerNurse > 0 ? bedsPerNurse : null;
    if (!wardForm.name || wardForm.total_beds <= 0 || !parsedRatio || parsedRatio <= 0) {
      alert("Please fill ward name, beds (>0), and a valid bed:nurse ratio (e.g., 4:1)");
      return;
    }
    try {
      if (editingWard) {
        const wardId = editingWard._id || editingWard.id;
        if (!wardId) {
          alert("Invalid ward ID");
          return;
        }
        await apiUpdateWard(wardId, {
          name: wardForm.name,
          description: wardForm.description || "",
          total_beds: wardForm.total_beds,
          // Send as string "X:1" to satisfy backend validator
          bed_nurse_ratio: `${parsedRatio}:1`,
        });
      } else {
        await apiCreateWard({
          name: wardForm.name,
          description: wardForm.description || "",
          total_beds: wardForm.total_beds,
          // Send as string "X:1" to satisfy backend validator
          bed_nurse_ratio: `${parsedRatio}:1`,
          hospital_id: user?.org_id || "",
        });
      }
      const response = await apiFetchWards();
      const wardsList = response.wards || response;
      setWards(Array.isArray(wardsList) ? wardsList : []);
      setWardDialogOpen(false);
      setEditingWard(null);
      setWardForm({ name: "", description: "", total_beds: 0, bed_nurse_ratio: 0 });
      setRatioInput("");
      setWardError(null);
    } catch (e: any) {
      setWardError(e?.response?.data?.message || "Failed to save ward");
    }
  };

  const handleStaffSubmit = async () => {
    try {
      // Basic validations
      const contactDigits = (staffForm.contact_no || "").replace(/[^0-9]/g, "");
      const years = Number.isFinite(staffForm.experience_years) ? staffForm.experience_years : 0;
      const emailOk = !staffForm.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(staffForm.email);
      if (!emailOk) {
        alert("Please enter a valid email address");
        return;
      }
      
      // For ward_incharge, ensure ward_id is selected
      if (isWardIncharge && (!staffForm.wardIds || staffForm.wardIds.length === 0)) {
        alert("Please select a ward");
        return;
      }
      
      const payload: any = {
        name: staffForm.name,
        grade: staffForm.grade,
        emp_id: staffForm.emp_id,
        email: staffForm.email || undefined,
        position: staffForm.position as StaffRole,
        contact_no: contactDigits,
        gender: staffForm.gender || undefined,
        experience_years: Math.max(0, Math.floor(years)),
        hospital_id: staffForm.hospital_id || user?.org_id || "",
        ward_id: Array.isArray(staffForm.wardIds) ? staffForm.wardIds : [],
      };
      
      if (editingStaff) {
        await updateStaffMutation.mutateAsync({
          id: editingStaff._id || editingStaff.id,
          payload,
        });
      } else {
        await addStaffMutation.mutateAsync(payload);
      }
      
      setStaffDialogOpen(false);
      setEditingStaff(null);
      setStaffForm({
        name: "",
        grade: "",
        emp_id: "",
        email: "",
        position: "",
        contact_no: "",
        gender: "",
        experience_years: 0,
        wardIds: [],
        hospital_id: user?.org_id || "",
      });
    } catch (error) {
      console.error("Error saving staff:", error);
    }
  };

  // No shift submit; shifts are fixed

  const handleEditWard = (ward: Ward) => {
    setEditingWard(ward);
    // Pre-fill with beds per one nurse (round to integer)
    const existingRatio = ward.bed_nurse_ratio || ward.bed_to_nurse_ratio || 0;
    let bedsPerNurse = 0;
    if (typeof existingRatio === 'string' && existingRatio.includes(':')) {
      // Parse "X:1" or "X:Y" format
      const [beds, nurses] = existingRatio.split(':').map(Number);
      if (Number.isFinite(beds) && Number.isFinite(nurses) && nurses > 0) {
        bedsPerNurse = Math.round(beds / nurses);
      }
    } else {
      // It's already a number representing beds per 1 nurse
      const numRatio = typeof existingRatio === 'string' ? Number(existingRatio) : existingRatio;
      bedsPerNurse = Number.isFinite(numRatio) && numRatio > 0 ? Math.round(numRatio) : 0;
    }
    setWardForm({
      name: ward.name,
      description: ward.description || "",
      total_beds: ward.total_beds || ward.no_of_beds || 0,
      bed_nurse_ratio: bedsPerNurse,
    });
    // Convert to integer string
    setRatioInput(bedsPerNurse ? String(bedsPerNurse) : "");
    setWardDialogOpen(true);
  };

  const handleEditStaff = (staff: any) => {
    setEditingStaff(staff);
    const existingWardIds = Array.isArray(staff.ward_id) 
      ? staff.ward_id.map((x: any) => String(x)) 
      : (staff.wardId ? [String(staff.wardId)] : []);
    
    // For ward_incharge, filter to only their assigned wards and auto-select if single ward
    let wardIdsToSet = existingWardIds;
    if (isWardIncharge && user?.ward_id && user.ward_id.length > 0) {
      // Filter existing wards to only those assigned to this ward_incharge
      const allowedWardIds = user.ward_id.map((id: string) => String(id));
      wardIdsToSet = existingWardIds.filter((id: string) => allowedWardIds.includes(id));
      // If no matching ward found, auto-select first assigned ward
      if (wardIdsToSet.length === 0 && user.ward_id.length > 0) {
        wardIdsToSet = [String(user.ward_id[0])];
      }
    }
    
    setStaffForm({
      name: staff.name || "",
      grade: staff.grade || "",
      emp_id: staff.emp_id || "",
      email: staff.email || "",
      position: staff.position || "",
      contact_no: (staff.contact_no || "").toString().replace(/[^0-9]/g, ""),
      gender: (staff.gender as "MALE" | "FEMALE" | "OTHER") || "",
      experience_years: staff.experience_years || 0,
      wardIds: wardIdsToSet,
      hospital_id: staff.hospital_id || user?.org_id || "",
    });
    setStaffDialogOpen(true);
  };

  const handleDeleteWard = async (wardId: string) => {
    if (!confirm("Delete this ward?")) return;
    try {
      await apiDeleteWard(wardId);
      setWards(prev => prev.filter(ward => (ward._id || ward.id) !== wardId));
    } catch (e: any) {
      setWardError(e?.response?.data?.message || "Failed to delete ward");
    }
  };

  const handleDeleteStaff = async (staffId: string) => {
    try {
      await deleteStaffMutation.mutateAsync(staffId);
    } catch (error) {
      console.error("Error deleting staff:", error);
    }
  };

  // handled via StaffManagement modal now

  const sidebarItems = isWardIncharge
    ? [
        { id: 1, label: "Staff Management", icon: <People /> },
      ]
    : [
        { id: 0, label: "Ward Management", icon: <Business /> },
        { id: 1, label: "Staff Management", icon: <People /> },
        { id: 2, label: "Shift Templates", icon: <Schedule /> },
        { id: 3, label: "Rules & Constraints", icon: <SettingsIcon /> },
        { id: 4, label: "System Settings", icon: <SettingsIcon /> },
      ];

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)', backgroundColor: '#F8FAFC' }}>
      {/* Sidebar */}
      <Paper sx={{ 
        width: 280, 
        borderRadius: 0,
        boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <Box sx={{ p: 3, borderBottom: '1px solid #E5E7EB' }}>
          <Typography variant="h6" fontWeight="bold" color="#1F2937">
            Settings
          </Typography>
        </Box>
        
        <List sx={{ flex: 1, pt: 2 }}>
          {sidebarItems.map((item) => (
            <ListItem key={item.id} disablePadding>
              <ListItemButton
                selected={activeTab === item.id}
                onClick={() => setActiveTab(item.id)}
                sx={{
                  mx: 2,
                  borderRadius: 2,
                  '&.Mui-selected': {
                    backgroundColor: '#E0F2FE',
                    '&:hover': {
                      backgroundColor: '#E0F2FE',
                    },
                  },
                }}
              >
                <ListItemIcon sx={{ color: activeTab === item.id ? '#14B8A6' : '#6B7280' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.label}
                  sx={{ 
                    '& .MuiListItemText-primary': {
                      color: activeTab === item.id ? '#14B8A6' : '#1F2937',
                      fontWeight: activeTab === item.id ? 600 : 400,
                    }
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Paper>

      {/* Main Content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {/* Ward Management Tab - Only for Admin */}
        {!isWardIncharge && (
          <TabPanel value={activeTab} index={0}>
            <WardManagement 
              wardError={wardError}
              onAddWard={openNewWard}
              wards={wards}
              isLoadingWards={isLoadingWards}
              formatRatio={formatRatio}
              onEditWard={handleEditWard}
              onDeleteWard={handleDeleteWard}
            />
          </TabPanel>
        )}

        {/* Staff Management Tab */}
        <TabPanel value={activeTab} index={isWardIncharge ? 1 : 1}>
          <StaffManagement 
            isLoading={staffLoading}
            error={staffError}
            uploadState={{
              isPending: uploadCSVMutation.isPending,
              isSuccess: uploadCSVMutation.isSuccess,
              isError: uploadCSVMutation.isError,
              message: (uploadCSVMutation.data as any)?.message,
              errorMessage: (uploadCSVMutation.error as any)?.message,
            }}
            onUploadFile={async (file: File) => {
              if (!user?.org_id) {
                alert("Organization ID not found. Please log in again.");
                return;
              }
              await uploadCSVMutation.mutateAsync({ file, org_id: user.org_id });
            }}
            onAddStaff={openNewStaff}
            staffList={safeStaffList as any}
            onEditStaff={handleEditStaff as any}
            onDeleteStaff={(id) => handleDeleteStaff(id)}
            wards={wards}
            pagination={staffPagination}
            onPageChange={(page: number) => {
              setStaffPage(page);
              // Scroll to top of table when page changes
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            searchValue={staffSearchInput}
            onSearchChange={(value: string) => {
              setStaffSearchInput(value);
            }}
            userRole={user?.role}
          />
        </TabPanel>

        {/* Shift Templates Tab (static) - Only for Admin */}
        {!isWardIncharge && (
          <TabPanel value={activeTab} index={2}>
            <ShiftTemplates shifts={staticShifts} />
          </TabPanel>
        )}

        {/* Rules & Constraints Tab - Only for Admin */}
        {!isWardIncharge && (
          <TabPanel value={activeTab} index={3}>
            <RulesConstraints />
          </TabPanel>
        )}

        {/* System Settings Tab - Only for Admin */}
        {!isWardIncharge && (
          <TabPanel value={activeTab} index={4}>
            <SystemSettings />
          </TabPanel>
        )}
      </Box>

      {/* Ward Modal */}
      <Modal
        open={wardDialogOpen}
        onClose={closeWardDialog}
        title={editingWard ? 'Edit Ward' : 'Add New Ward'}
        onSave={handleWardSubmit}
        saveLabel={editingWard ? 'Update Ward' : 'Add Ward'}
      >
        <Grid container spacing={3}>
          <Grid size={12}>
            <TextField
              fullWidth
              label="Ward Name"
              value={wardForm.name}
              onChange={(e) => setWardForm(prev => ({ ...prev, name: e.target.value }))}
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                }
              }}
            />
          </Grid>
          <Grid size={12}>
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={wardForm.description}
              onChange={(e) => setWardForm(prev => ({ ...prev, description: e.target.value }))}
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                }
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Beds"
              type="number"
              value={wardForm.total_beds}
              onChange={(e) => setWardForm(prev => ({ ...prev, total_beds: parseInt(e.target.value) || 0 }))}
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                }
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Beds per Nurse"
              type="number"
              value={ratioInput}
              onChange={(e) => {
                const raw = e.target.value;
                // Allow only non-negative integers
                const digitsOnly = raw.replace(/[^0-9]/g, "");
                setRatioInput(digitsOnly);
              }}
              placeholder="4"
              InputProps={{
                endAdornment: <InputAdornment position="end">:1</InputAdornment>,
              }}
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                }
              }}
            />
          </Grid>
        </Grid>
      </Modal>

      {/* Staff Modal */}
      <Modal
        open={staffDialogOpen}
        onClose={closeStaffDialog}
        title={editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
        onSave={handleStaffSubmit}
        saveLabel={editingStaff ? 'Update Staff' : 'Add Staff'}
      >
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Full Name"
              value={staffForm.name}
              onChange={(e) => setStaffForm(prev => ({ ...prev, name: e.target.value }))}
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                }
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Employee ID"
              value={staffForm.emp_id}
              onChange={(e) => setStaffForm(prev => ({ ...prev, emp_id: e.target.value }))}
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                }
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={staffForm.email}
              onChange={(e) => setStaffForm(prev => ({ ...prev, email: e.target.value }))}
              placeholder="name@example.com"
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                }
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Grade</InputLabel>
              <Select
                value={staffForm.grade}
                label="Grade"
                onChange={(e) => setStaffForm(prev => ({ ...prev, grade: e.target.value }))}
                sx={{
                  borderRadius: 2,
                }}
              >
                <MenuItem value="N4">N4</MenuItem>
                <MenuItem value="N5">N5</MenuItem>
                <MenuItem value="N6">N6</MenuItem>
                <MenuItem value="N7">N7</MenuItem>
                <MenuItem value="N8">N8</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Position (Role)</InputLabel>
              <Select
                value={staffForm.position}
                label="Position (Role)"
                onChange={(e) => setStaffForm(prev => ({ ...prev, position: e.target.value }))}
                sx={{
                  borderRadius: 2,
                }}
              >
                <MenuItem value="ward_incharge">Ward Incharge</MenuItem>
                <MenuItem value="staff_nurse">Staff Nurse</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="shift_incharge">Shift Incharge</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Contact"
              type="tel"
              value={staffForm.contact_no}
              onChange={(e) => {
                const digits = (e.target.value || '').replace(/[^0-9]/g, '');
                setStaffForm(prev => ({ ...prev, contact_no: digits }));
              }}
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                }
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Gender</InputLabel>
              <Select
                value={staffForm.gender}
                label="Gender"
                onChange={(e) => setStaffForm(prev => ({ ...prev, gender: e.target.value as "MALE" | "FEMALE" | "OTHER" }))}
                sx={{
                  borderRadius: 2,
                }}
              >
                <MenuItem value="MALE">Male</MenuItem>
                <MenuItem value="FEMALE">Female</MenuItem>
                <MenuItem value="OTHER">Other</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid size={12}>
            <FormControl fullWidth>
              <InputLabel>Wards</InputLabel>
              <Select
                multiple={!isWardIncharge}
                value={staffForm.wardIds}
                label="Wards"
                onChange={(e) => {
                  const value = e.target.value;
                  // For ward_incharge, it's a single selection
                  const selected = isWardIncharge
                    ? (Array.isArray(value) ? [value[0]] : [value])
                    : (Array.isArray(value) ? value.map(v => String(v)) : []);
                  setStaffForm(prev => ({ ...prev, wardIds: selected.map(v => String(v)) }));
                }}
                renderValue={(selected) => {
                  const names = (selected as string[]).map(id => (wards.find(w => (w._id || w.id) === id)?.name || id));
                  return names.join(', ');
                }}
                sx={{
                  borderRadius: 2,
                }}
              >
                {isWardIncharge
                  ? // For ward_incharge, only show their assigned wards
                    (user?.ward_id || []).map(wardId => {
                      const ward = wards.find(w => (w._id || w.id) === wardId);
                      return ward ? (
                        <MenuItem key={ward._id || ward.id} value={ward._id || ward.id}>
                          {ward.name}
                        </MenuItem>
                      ) : null;
                    }).filter(Boolean)
                  : // For admin, show all wards
                    wards.map((ward) => (
                      <MenuItem key={ward._id || ward.id} value={ward._id || ward.id}>
                        {ward.name}
                      </MenuItem>
                    ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Modal>

      {/* Shift Modal removed */}
    </Box>
  );
};

export default SettingsPage;
