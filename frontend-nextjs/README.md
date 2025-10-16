# LMMS-Eval Dashboard - Next.js Frontend

A modern, production-ready Next.js frontend for the LMMS-Eval Dashboard with server-side rendering, optimized performance, and enhanced SEO capabilities.

## Features

- **Next.js 14** with App Router for modern React development
- **Server-Side Rendering (SSR)** for better SEO and performance
- **TypeScript** for type safety and better developer experience
- **Tailwind CSS** for utility-first styling
- **Radix UI** for accessible component primitives
- **React Query** for efficient data fetching and caching
- **Real-time WebSocket** integration for live updates
- **Responsive Design** with mobile-first approach
- **Error Boundaries** for robust error handling
- **Performance Optimizations** including code splitting and lazy loading

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm 8+
- Backend API running on `http://localhost:8000`

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create environment file:
```bash
# Create .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
```

3. Start development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx           # Home page
│   ├── models/            # Models page
│   ├── evaluations/       # Evaluations page
│   └── leaderboard/       # Leaderboard page
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── layout/           # Layout components
│   └── pages/            # Page-specific components
├── lib/                  # Utilities and services
│   ├── api.ts           # API client
│   ├── websocket.ts     # WebSocket service
│   └── utils.ts         # Utility functions
└── hooks/               # Custom React hooks
```

## Key Improvements over React + Vite

### SEO & Performance
- **Server-Side Rendering**: Pages are pre-rendered on the server for better SEO
- **Static Generation**: Static pages for optimal performance
- **Image Optimization**: Built-in Next.js Image component with lazy loading
- **Code Splitting**: Automatic code splitting for smaller bundle sizes
- **Metadata API**: Dynamic meta tags for better social sharing

### Developer Experience
- **App Router**: Modern file-based routing with layouts
- **TypeScript**: Full type safety throughout the application
- **Hot Reload**: Fast refresh for development
- **Built-in CSS Support**: Tailwind CSS with PostCSS processing

### Production Ready
- **Optimized Builds**: Production builds with minification and compression
- **Error Handling**: Comprehensive error boundaries and fallbacks
- **Performance Monitoring**: Built-in performance metrics
- **Security**: Automatic security headers and best practices

## API Integration

The frontend integrates with the LMMS-Eval backend API:

- **Health Check**: `/api/v1/health`
- **Models**: `/api/v1/models`
- **Benchmarks**: `/api/v1/benchmarks`
- **Runs**: `/api/v1/runs`
- **Statistics**: `/api/v1/stats/overview`

## WebSocket Integration

Real-time updates are handled through WebSocket connections:

- **Run Updates**: Live progress updates for evaluation runs
- **Status Changes**: Real-time status indicators
- **Connection Management**: Automatic reconnection and error handling

## Deployment

### Vercel (Recommended)
1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push

### Docker
```bash
# Build Docker image
docker build -t lmms-eval-dashboard-nextjs .

# Run container
docker run -p 3000:3000 lmms-eval-dashboard-nextjs
```

### Manual Deployment
```bash
# Build for production
npm run build

# Start production server
npm run start
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:8000/api/v1` |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL | `ws://localhost:8000/ws` |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is licensed under the MIT License.

