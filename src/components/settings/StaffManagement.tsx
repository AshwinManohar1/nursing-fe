import { Alert, Box, Button, Chip, CircularProgress, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, IconButton, Stack, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Pagination, TextField, InputAdornment, Tooltip } from "@mui/material";
import { Add, Delete, Edit, Upload, RestartAlt, Download, Search, Clear } from "@mui/icons-material";
import Modal from "../ui/Modal";
import { useMemo, useRef, useState } from "react";

interface Staff {
  _id?: string;
  id?: string;
  name: string;
  emp_id: string;
  grade: string;
  position: string; // Changed from role to position
  contact_no: string; // Changed from contact to contact_no
  gender?: "MALE" | "FEMALE" | "OTHER";
  experience_years: number;
}

interface PaginationData {
  total: number;
  limit: number;
  offset: number;
  current_page: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

interface StaffManagementProps {
  isLoading: boolean;
  error: any;
  uploadState: {
    isPending: boolean;
    isSuccess: boolean;
    isError: boolean;
    message?: string;
    errorMessage?: string;
  };
  onUploadFile: (file: File) => Promise<void> | void;
  onAddStaff: () => void;
  staffList: Staff[];
  onEditStaff: (staff: Staff) => void;
  onDeleteStaff: (id: string) => void;
  wards: Array<{ _id?: string; id?: string; name: string }>;
  pagination?: PaginationData;
  onPageChange?: (page: number) => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  userRole?: string; // User's role to determine permissions
}

type ParsedRow = {
  id?: string;
  emp_id?: string;
  name?: string;
  grade?: string;
  position?: string; // Changed from role to position
  contact_no?: string; // Changed from contact to contact_no
  gender?: string;
  ward_id?: string;
  department?: string; // Ward name
  [key: string]: string | undefined;
};

const REQUIRED_HEADERS = ["name", "emp_id", "grade", "position", "contact_no", "gender", "department"] as const;

const StaffManagement = ({ isLoading, error, uploadState, onUploadFile, onAddStaff, staffList, onEditStaff, onDeleteStaff, wards, pagination, onPageChange, searchValue = "", onSearchChange, userRole }: StaffManagementProps) => {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]); // retained parse for validation but hidden from UI
  const [isDragging, setIsDragging] = useState(false);
  const hiddenInputRef = useRef<HTMLInputElement | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<{ id: string; name: string } | null>(null);

  const hasSelection = useMemo(() => !!selectedFile, [selectedFile]);
  
  // Check if user is ward_incharge (read-only access)
  const isWardIncharge = userRole?.toUpperCase() === 'WARD_INCHARGE';

  const handleOpenUpload = () => {
    setUploadModalOpen(true);
  };

  const handleCloseUpload = () => {
    setUploadModalOpen(false);
    setSelectedFile(null);
    setParsedRows([]);
    setParseError(null);
  };

  const parseCsvText = (text: string) => {
    const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(l => l.trim().length > 0);
    if (lines.length === 0) {
      setParseError("Empty CSV file");
      setParsedRows([]);
      return;
    }
    const headers = lines[0].split(",").map(h => h.trim());
    const missing = REQUIRED_HEADERS.filter(h => !headers.includes(h));
    if (missing.length > 0) {
      setParseError(`Missing required columns: ${missing.join(", ")}`);
    } else {
      setParseError(null);
    }
    const rows: ParsedRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",");
      const row: ParsedRow = {};
      headers.forEach((h, idx) => {
        row[h] = (values[idx] ?? "").trim();
      });
      if (Object.values(row).some(v => (v ?? "").length > 0)) {
        rows.push(row);
      }
    }
    setParsedRows(rows);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      parseCsvText(text);
    };
    reader.readAsText(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setParsedRows([]);
    setParseError(null);
  };

  const handleOpenFileDialog = () => {
    hiddenInputRef.current?.click();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      parseCsvText(text);
    };
    reader.readAsText(file);
  };

  const handleDownloadSample = () => {
    const header = REQUIRED_HEADERS.join(",");
    const sampleRow = [
      "Jane Doe",
      "EMP001",
      "N6",
      "staff_nurse", // Valid role: ward_incharge, staff_nurse, admin, shift_incharge
      "+91-9876543210",
      "FEMALE",
      "Cardiology" // Department (Ward Name)
    ].join(",");
    const csv = header + "\n" + sampleRow + "\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'staff_sample.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleConfirmUpload = async () => {
    if (!selectedFile) return;
    await onUploadFile(selectedFile);
    handleCloseUpload();
  };

  const handleDeleteClick = (staff: Staff) => {
    setStaffToDelete({
      id: String(staff._id || staff.id),
      name: staff.name
    });
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (staffToDelete) {
      onDeleteStaff(staffToDelete.id);
      setDeleteConfirmOpen(false);
      setStaffToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false);
    setStaffToDelete(null);
  };
  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold" color="#1F2937">
          Staff Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {!isWardIncharge && (
            <>
              <Button 
                variant="outlined" 
                disabled={uploadState.isPending}
                onClick={handleOpenUpload}
                sx={{
                  borderColor: '#14B8A6',
                  color: '#14B8A6',
                  '&:hover': { 
                    borderColor: '#0F766E',
                    backgroundColor: '#E0F2FE'
                  }
                }}
                startIcon={<Upload />}
              >
                {uploadState.isPending ? '⏳ Uploading...' : '📤 Bulk Upload'}
              </Button>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={onAddStaff}
                sx={{
                  backgroundColor: '#14B8A6',
                  '&:hover': { backgroundColor: '#0F766E' }
                }}
              >
                Add Staff
              </Button>
            </>
          )}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Error loading staff: {error.message}
        </Alert>
      )}

      {uploadState.isSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          ✅ Staff data uploaded successfully! {uploadState.message || ''}
        </Alert>
      )}
      {uploadState.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          ❌ Failed to upload staff data: {uploadState.errorMessage || 'Unknown error'}
        </Alert>
      )}

      {/* Search Bar */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search by name, employee ID, grade, or contact..."
          value={searchValue}
          onChange={(e) => onSearchChange?.(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: '#9CA3AF' }} />
              </InputAdornment>
            ),
            endAdornment: searchValue ? (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() => onSearchChange?.("")}
                  sx={{ color: '#9CA3AF' }}
                >
                  <Clear />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              backgroundColor: '#FFFFFF',
              '& fieldset': {
                borderColor: '#D1D5DB',
              },
              '&:hover fieldset': {
                borderColor: '#9CA3AF',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#14B8A6',
              },
            },
          }}
        />
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : staffList.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4, minHeight: 200 }}>
          <Typography variant="body1" color="#6B7280">
            {searchValue ? 'No staff members found matching your search.' : 'No staff members found.'}
          </Typography>
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#F9FAFB' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Employee ID</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Grade</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Role</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Contact</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Gender</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Ward Assigned</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {staffList.map((staff) => {
                const wardIds: string[] = Array.isArray((staff as any).ward_id)
                  ? ((staff as any).ward_id as string[])
                  : ((staff as any).wardId ? [String((staff as any).wardId)] : []);
                const wardNames = wardIds
                  .map(id => wards.find(w => (w._id || w.id) === id)?.name || 'Unknown Ward')
                  .filter(Boolean);
                return (
                <TableRow key={staff._id || staff.id} hover>
                  <TableCell>{staff.name}</TableCell>
                  <TableCell>{staff.emp_id}</TableCell>
                  <TableCell>
                    <Chip 
                      label={staff.grade} 
                      size="small" 
                      sx={{ backgroundColor: '#E0F2FE', color: '#14B8A6' }}
                    />
                  </TableCell>
                  <TableCell>{staff.position}</TableCell>
                  <TableCell>{staff.contact_no}</TableCell>
                  <TableCell>
                    {(staff as any).gender ? (
                      <Chip 
                        label={(staff as any).gender} 
                        size="small" 
                        sx={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}
                      />
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {wardNames.length === 0 ? '-' : (
                      <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
                        {wardNames.map((name, idx) => (
                          <Chip key={idx} label={name} size="small" sx={{ backgroundColor: '#F3F4F6', color: '#6B7280' }} />
                        ))}
                      </Stack>
                    )}
                  </TableCell>
                  <TableCell>
                    {!isWardIncharge && (
                      <>
                        <Tooltip title="Edit Staff">
                          <IconButton 
                            size="small" 
                            onClick={() => onEditStaff(staff)}
                            sx={{ color: '#14B8A6' }}
                          >
                            <Edit />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Staff">
                          <IconButton 
                            size="small" 
                            onClick={() => handleDeleteClick(staff)}
                            sx={{ color: '#EF4444' }}
                          >
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                    {isWardIncharge && (
                      <Typography variant="caption" color="#6B7280" sx={{ fontStyle: 'italic' }}>
                        View only
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              );})}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {pagination && pagination.total > 0 && pagination.total_pages > 1 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 3, gap: 2 }}>
          <Typography variant="body2" color="#6B7280">
            Showing {pagination.offset + 1} to {Math.min(pagination.offset + staffList.length, pagination.total)} of {pagination.total} staff members
          </Typography>
          <Pagination
            count={pagination.total_pages}
            page={pagination.current_page || 1}
            onChange={(_, page) => {
              if (onPageChange) {
                onPageChange(page);
              }
            }}
            color="primary"
            sx={{
              '& .MuiPaginationItem-root': {
                color: '#6B7280',
                '&.Mui-selected': {
                  backgroundColor: '#14B8A6',
                  color: '#FFFFFF',
                  '&:hover': {
                    backgroundColor: '#0F766E',
                  },
                },
                '&:hover': {
                  backgroundColor: '#E0F2FE',
                },
              },
            }}
          />
        </Box>
      )}

      <Modal
        open={uploadModalOpen}
        onClose={uploadState.isPending ? () => {} : handleCloseUpload}
        title={hasSelection ? 'Preview Staff CSV' : 'Bulk Upload Staff'}
        onSave={hasSelection && !uploadState.isPending ? handleConfirmUpload : undefined}
        saveLabel={uploadState.isPending ? 'Uploading...' : hasSelection ? 'Upload' : undefined}
      >
        {uploadState.isPending && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              borderRadius: 1,
            }}
          >
            <CircularProgress size={48} sx={{ color: '#14B8A6', mb: 2 }} />
            <Typography variant="h6" color="#1F2937" fontWeight="bold">
              Uploading Staff Data...
            </Typography>
            <Typography variant="body2" color="#6B7280" sx={{ mt: 1 }}>
              Please wait while we process your file
            </Typography>
          </Box>
        )}
        <Stack spacing={2} sx={{ position: 'relative' }}>
          <Stack direction="row" spacing={1}>
            <input ref={hiddenInputRef} id="staff-upload-input" type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileChange} />
            {hasSelection && (
              <Button color="warning" variant="outlined" startIcon={<RestartAlt />} onClick={handleRemoveFile}>Replace/Remove</Button>
            )}
          </Stack>

          <Box
            onDragOver={handleDragOver}
            onDragEnter={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleOpenFileDialog}
            sx={{
              mt: 1,
              minHeight: 220,
              border: '2px dashed',
              borderRadius: 2,
              borderColor: isDragging ? '#0F766E' : '#14B8A6',
              backgroundColor: isDragging ? '#E0F2FE' : '#F9FAFB',
              color: '#1F2937',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 120ms ease-in-out',
              p: 2,
            }}
          >
            <Stack spacing={1}>
              <Typography variant="body1" fontWeight={600} color="#14B8A6">
                Drag & drop staff CSV here
              </Typography>
              <Typography variant="body2" color="#6B7280">
                or click to browse your files
              </Typography>
              <Typography variant="caption" color="#6B7280">
                Accepted format: .csv
              </Typography>
              <Box sx={{ mt: 1 }}>
                <Button 
                  variant="outlined" 
                  startIcon={<Download />} 
                  onClick={(e) => { e.stopPropagation(); handleDownloadSample(); }}
                  sx={{
                    borderColor: '#14B8A6',
                    color: '#14B8A6',
                    '&:hover': { 
                      borderColor: '#0F766E',
                      backgroundColor: '#E0F2FE'
                    }
                  }}
                >
                  Download sample CSV
                </Button>
              </Box>
            </Stack>
          </Box>

          {selectedFile && (
            <Typography variant="body2" color="#6B7280">Selected: {selectedFile.name}</Typography>
          )}

          {parseError && (
            <Alert severity="error">{parseError}</Alert>
          )}

          {parsedRows.length > 0 && (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {REQUIRED_HEADERS.map(h => (
                      <TableCell key={h} sx={{ fontWeight: 'bold' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {parsedRows.slice(0, 1).map((row, idx) => (
                    <TableRow key={idx} hover>
                      {REQUIRED_HEADERS.map(h => (
                        <TableCell key={h}>{row[h] || ''}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Stack>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={handleCancelDelete}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Delete Staff Member
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete <strong>{staffToDelete?.name}</strong>? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleCancelDelete}
            sx={{ color: '#6B7280' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            variant="contained"
            color="error"
            sx={{
              backgroundColor: '#DC2626',
              '&:hover': { backgroundColor: '#B91C1C' },
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default StaffManagement;


