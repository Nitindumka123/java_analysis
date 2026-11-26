import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { Toaster } from 'react-hot-toast'
import ErrorBoundary from './components/ErrorBoundary'
import { ProjectProvider } from './contexts/ProjectContext'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

const darkTheme = createTheme({
  breakpoints: {
    values: {
      xs: 0,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
    },
  },
  palette: {
    mode: 'dark',
    primary: {
      main: '#6366F1',
      light: '#818CF8',
      dark: '#4F46E5',
    },
    secondary: {
      main: '#38BDF8',
      light: '#7DD3FC',
      dark: '#0284C7',
    },
    background: {
      default: '#0F172A',
      paper: '#1E293B',
    },
    text: {
      primary: '#F8FAFC',
      secondary: '#94A3B8',
    },
    divider: '#334155',
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: '2.5rem',
      letterSpacing: '-0.02em',
      color: '#F8FAFC',
    },
    h2: {
      fontWeight: 700,
      fontSize: '2rem',
      letterSpacing: '-0.01em',
      color: '#F8FAFC',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.75rem',
      color: '#F8FAFC',
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.5rem',
      letterSpacing: '-0.01em',
      color: '#F8FAFC',
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.25rem',
      color: '#F8FAFC',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1rem',
      color: '#F8FAFC',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
      color: '#E2E8F0',
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
      color: '#CBD5E1',
    },
    button: {
      fontWeight: 600,
      textTransform: 'none',
      fontSize: '0.875rem',
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#0F172A',
          color: '#F8FAFC',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
          backgroundColor: '#1E293B',
          border: '1px solid #334155',
          backgroundImage: 'none',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          backgroundColor: '#1E293B',
          backgroundImage: 'none',
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: '#1E293B',
          border: '1px solid #334155',
          color: '#F8FAFC',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: '#1E293B',
          border: '1px solid #334155',
          color: '#F8FAFC',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: '#0F172A',
            '& fieldset': {
              borderColor: '#334155',
            },
            '&:hover fieldset': {
              borderColor: '#6366F1',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#818CF8',
            },
          },
          '& .MuiInputBase-input': {
            color: '#F8FAFC',
          },
          '& .MuiInputLabel-root': {
            color: '#94A3B8',
          },
        },
      },
    },
    MuiTable: {
      styleOverrides: {
        root: {
          backgroundColor: '#0F172A',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: '#1E293B',
          color: '#E2E8F0',
        },
        head: {
          backgroundColor: '#0F172A',
          color: '#94A3B8',
          fontWeight: 700,
          borderColor: '#334155',
        },
      },
    },
  },
})

const rootElement = document.getElementById('root')
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={darkTheme}>
          <CssBaseline />
          <ProjectProvider>
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <App />
              <Toaster
                position="top-right"
                toastOptions={{
                  style: {
                    background: '#1E293B',
                    color: '#F8FAFC',
                    border: '1px solid #334155',
                  },
                }}
              />
            </BrowserRouter>
          </ProjectProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>,
  )
}
