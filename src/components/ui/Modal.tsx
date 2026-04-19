import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
  } from "@mui/material";
  
  type ModalProps = {
    open: boolean;
    onClose: () => void;
    title: string;
    onSave?: () => void;
    saveLabel?: string;
    children: React.ReactNode;
  };
  
  const Modal = ({
    open,
    onClose,
    title,
    onSave,
    saveLabel = "Save",
    children,
  }: ModalProps) => {
    return (
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle>{title}</DialogTitle>
        <DialogContent dividers sx={{ position: 'relative' }}>{children}</DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={!onClose}>Cancel</Button>
          {onSave && (
            <Button variant="contained" onClick={onSave} disabled={saveLabel === 'Uploading...'}>
              {saveLabel}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    );
  };
  
  export default Modal;