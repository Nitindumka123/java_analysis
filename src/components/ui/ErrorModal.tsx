import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'

interface ErrorModalProps {
  open: boolean
  title?: string
  message: string
  onClose: () => void
}

export default function ErrorModal({ open, title = 'Error', message, onClose }: ErrorModalProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          bgcolor: '#1E293B',
          color: '#F8FAFC',
          border: '1px solid #334155',
          borderRadius: 3,
          minWidth: { xs: '88vw', sm: 420 },
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontWeight: 700, color: '#F8FAFC' }}>
        <WarningAmberIcon sx={{ color: '#F43F5E' }} />
        {title}
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ color: '#CBD5E1' }}>{message}</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button
          variant="contained"
          onClick={onClose}
          sx={{
            bgcolor: '#6366F1',
            color: '#F8FAFC',
            textTransform: 'none',
            fontWeight: 600,
            '&:hover': { bgcolor: '#4F46E5' },
          }}
        >
          Dismiss
        </Button>
      </DialogActions>
    </Dialog>
  )
}
