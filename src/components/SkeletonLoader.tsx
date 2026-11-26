import { Box, Skeleton } from '@mui/material'

const darkShimmerSx = {
  background: 'linear-gradient(90deg, #1E293B 25%, #334155 50%, #1E293B 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s infinite',
}

export default function SkeletonLoader() {
  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ mb: 4 }}>
        <Skeleton variant="text" width="40%" height={50} sx={{ mb: 2, ...darkShimmerSx }} />
        <Skeleton variant="text" width="60%" height={24} sx={darkShimmerSx} />
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
          gap: 3,
          mb: 4,
        }}
      >
        {[...Array(8)].map((_, i) => (
          <Box key={i}>
            <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 3, ...darkShimmerSx }} />
          </Box>
        ))}
      </Box>

      <Box sx={{ mt: 4 }}>
        <Skeleton variant="text" width="30%" height={40} sx={{ mb: 2, ...darkShimmerSx }} />
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
            gap: 3,
          }}
        >
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={200} sx={{ borderRadius: 3, ...darkShimmerSx }} />
          ))}
        </Box>
      </Box>

      <style>
        {`
          @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}
      </style>
    </Box>
  )
}
