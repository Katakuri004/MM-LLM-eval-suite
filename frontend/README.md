# LMMS-Eval Dashboard Frontend

A modern, production-ready React frontend for the LMMS-Eval Dashboard built with TypeScript, Vite, and Tailwind CSS.

## Features

- **Modern React Architecture**: Built with React 18, TypeScript, and modern hooks
- **Real-time Updates**: WebSocket integration for live run progress and status updates
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **Production Ready**: Error boundaries, loading states, and comprehensive error handling
- **Performance Optimized**: Code splitting, lazy loading, and optimized builds
- **Accessible**: Built with accessibility in mind using Radix UI components

## Tech Stack

- **React 18** - Modern React with hooks and concurrent features
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **React Query** - Server state management and caching
- **React Router** - Client-side routing
- **Lucide React** - Beautiful icons
- **Recharts** - Data visualization
- **Sonner** - Toast notifications

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm 8+

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Environment Configuration

Create a `.env` file in the frontend directory:

```env
# API Configuration
VITE_API_URL=http://localhost:8000/api/v1

# WebSocket Configuration
VITE_WS_URL=ws://localhost:8000/ws

# Application Configuration
VITE_APP_NAME=LMMS-Eval Dashboard
VITE_APP_VERSION=1.0.0

# Feature Flags
VITE_ENABLE_WEBSOCKET=true
VITE_ENABLE_ANALYTICS=false

# Development Configuration
VITE_DEBUG=false
VITE_LOG_LEVEL=info
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── layout/         # Layout components (Header, Layout)
│   └── ui/             # Base UI components (Button, Card, etc.)
├── hooks/              # Custom React hooks
├── lib/                # Utility libraries and configurations
│   ├── api.ts          # API client and types
│   ├── websocket.ts    # WebSocket service
│   ├── config.ts       # Application configuration
│   └── utils.ts        # Utility functions
├── pages/              # Page components
│   ├── Dashboard.tsx   # Main dashboard
│   ├── Models.tsx      # Models management
│   ├── Evaluations.tsx # Evaluations management
│   └── Leaderboard.tsx # Performance leaderboard
├── App.tsx             # Main app component
└── main.tsx            # Application entry point
```

## Key Features

### Real-time Updates

The frontend includes WebSocket integration for real-time updates:

- Live run progress updates
- Status change notifications
- Connection status indicators
- Automatic reconnection with exponential backoff

### Error Handling

Comprehensive error handling throughout the application:

- Error boundaries for component-level error catching
- API error handling with user-friendly messages
- WebSocket connection error handling
- Graceful degradation when services are unavailable

### Performance Optimizations

- Code splitting with dynamic imports
- Optimized bundle chunks
- Lazy loading of components
- Efficient re-rendering with React Query
- Image optimization and lazy loading

### Accessibility

- ARIA labels and roles
- Keyboard navigation support
- Screen reader compatibility
- High contrast support
- Focus management

## API Integration

The frontend integrates with the backend API through:

- **REST API**: For CRUD operations on models, benchmarks, and runs
- **WebSocket**: For real-time updates and notifications
- **React Query**: For caching, background updates, and optimistic updates

### API Client

The `ApiClient` class provides:

- Type-safe API calls
- Automatic error handling
- Request/response interceptors
- Retry logic for failed requests

### WebSocket Service

The `WebSocketService` provides:

- Automatic connection management
- Event subscription system
- Heartbeat for connection health
- Automatic reconnection with backoff

## Development

### Code Style

- ESLint for code linting
- Prettier for code formatting
- TypeScript for type safety
- Consistent naming conventions

### Testing

```bash
# Run tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Building

```bash
# Development build
npm run build

# Production build with optimizations
npm run build:prod
```

## Deployment

### Docker

The frontend can be deployed using Docker:

```bash
# Build Docker image
docker build -t lmms-eval-frontend .

# Run container
docker run -p 3000:80 lmms-eval-frontend
```

### Static Hosting

The built application can be deployed to any static hosting service:

- Vercel
- Netlify
- AWS S3 + CloudFront
- GitHub Pages

### Environment Variables

Set the following environment variables for production:

- `VITE_API_URL`: Backend API URL
- `VITE_WS_URL`: WebSocket URL
- `VITE_APP_NAME`: Application name
- `VITE_APP_VERSION`: Application version

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
