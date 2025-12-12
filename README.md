# Multi-tenant SaaS Backend

## Project Structure

```
src/
├── api/                 # API routes and endpoints
├── modules/             # Business logic modules
├── middleware/          # Express middleware
├── config/              # Configuration files
├── db/                  # Database models and migrations
├── auth/                # Authentication logic
├── utils/               # Utility functions
└── server.ts            # Application entrypoint
```

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env` file from `.env.example`:
   ```bash
   cp .env.example .env
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run compiled project
- `npm run lint` - Check code with ESLint
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run type-check` - Check TypeScript types

## Architecture Notes

- **TypeScript**: Strict mode enabled for type safety
- **Express**: Lightweight and production-ready
- **Multi-tenant**: Built with tenant isolation in mind
- **Middleware**: Centralized request/response handling
- **Configuration**: Environment-based setup

## Next Steps

- [ ] Configure database connection in `src/db/`
- [ ] Implement authentication in `src/auth/`
- [ ] Create API routes in `src/api/`
- [ ] Define business logic modules in `src/modules/`
- [ ] Add middleware in `src/middleware/`
