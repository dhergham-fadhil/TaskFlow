# TaskFlow

TaskFlow is a full-stack project management application with a React 19 + TypeScript frontend and an ASP.NET Core 9 + EF Core + SQL Server backend. It supports Kanban-style task boards, projects, teams, user authentication (JWT), subtasks, comments, and activity feeds.

## Architecture

```
Task Flow/
├── src/
│   ├── TaskFlow.Api/             # ASP.NET Core 9 Web API
│   │   ├── Services/             # Business logic (AuthService, TaskService, ProjectService, UserService)
│   │   ├── Data/                 # EF Core DbContext and migrations
│   │   ├── Dtos/                 # Data transfer objects
│   │   ├── Models/               # Entity models (User, Project, ProjectTask, SubTask, Comment, Activity)
│   │   ├── Program.cs            # Application entry point, middleware, auth configuration
│   │   └── appsettings*.json     # Configuration
│   ├── TaskFlow.Api.Tests/       # xUnit backend tests (37 tests)
│   ├── api/                      # Frontend API client (TypeScript)
│   │   └── client.ts             # Shared fetch wrapper with auth handling
│   ├── components/               # React components (auth, board, dashboard, projects, tasks, ui)
│   ├── context/                  # React context providers (AuthContext)
│   ├── data/                     # Frontend data layer
│   ├── lib/                      # Utility libraries
│   ├── pages/                    # Route page components
│   ├── types/                    # TypeScript type definitions
│   ├── App.tsx                   # Root React component
│   ├── main.tsx                  # React entry point
│   └── test/                     # Vitest test setup
├── package.json                  # Frontend dependencies and scripts
├── vite.config.ts                # Vite build configuration
├── vitest.config.ts              # Vitest test configuration
├── tsconfig.json                 # TypeScript configuration
├── .env.example                  # Frontend environment variables example
├── .gitignore                    # Git ignore rules
└── TaskFlow.sln                  .NET solution file
```

## Features

- **Authentication**: JWT-based auth with register/login, password hashing (BCrypt), role-based access control (admin/member/viewer)
- **Projects**: Create, update, delete projects; add/remove members; set project status (active/paused/completed)
- **Tasks**: Create, update, delete tasks with drag-and-drop Kanban board; status (backlog/in_progress/review/done), priority (low/medium/high/urgent), assignees, due dates, labels
- **Subtasks**: Checklist-style subtasks per task with toggle completion
- **Comments**: Comment on tasks with author attribution
- **Activity Feed**: Activity log for create/update/delete/move/comment actions
- **Demo Mode**: Reset workspace to demo state (admin-only, disabled in production)

## Security

- JWT access tokens with configurable secret key (minimum 32 characters)
- JWT key must be provided via environment variable or user secrets (never committed)
- Demo credentials must be set via environment variables (`DEMO__EMAIL`, `DEMO__PASSWORD`)
- Demo reset endpoint disabled in production (`403 Forbidden`)
- Password hashing with BCrypt
- Role-based authorization (admin, member, viewer)
- Project-scoped access control (users can only access projects they own or are members of)

## Getting Started

### Prerequisites

- .NET 9 SDK
- Node.js 18+ and npm
- SQL Server (LocalDB, Docker, or hosted)

### Backend Setup

1. Navigate to the API project:
   ```bash
   cd src/TaskFlow.Api
   ```

2. Configure JWT settings. The JWT key must be at least 32 characters. Use environment variables or .NET User Secrets:
   ```bash
   dotnet user-secrets set "Jwt:Key" "your-32-character-minimum-secret-key-here"
   dotnet user-secrets set "Demo__Email" "demo@example.com"
   dotnet user-secrets set "Demo__Password" "DemoPass123!"
   ```

3. Apply migrations:
   ```bash
   dotnet ef database update
   ```

4. Run the API:
   ```bash
   dotnet run
   ```

   The API listens on `http://localhost:5187` by default.

### Backend Tests

```bash
dotnet test src/TaskFlow.Api.Tests/
```

### Frontend Setup

1. Copy the environment example:
   ```bash
   cp .env.example .env
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

   The frontend runs on `http://localhost:5173` and connects to the API at `VITE_API_URL` (`http://localhost:5187/api` by default).

4. Run frontend tests:
   ```bash
   npm test
   ```

5. Build for production:
   ```bash
   npm run build
   ```

### Environment Variables

Backend (`appsettings.Development.json` or user secrets):
- `Jwt:Key` — Signing key for JWT tokens (min 32 chars)
- `Jwt:Issuer` — JWT issuer
- `Jwt:Audience` — JWT audience
- `Demo__Email` — Demo account email
- `Demo__Password` — Demo account password
- `Demo__Enabled` — Enable demo mode (default: true)

Frontend (`.env`):
- `VITE_API_URL` — Backend API base URL (default: `http://localhost:5187/api`)

## API Endpoints

### Authentication
- `POST /auth/register` — Register a new user
- `POST /auth/login` — Authenticate and receive JWT
- `GET /users/me` — Get current user profile
- `PUT /users/me` — Update user profile

### Projects
- `GET /projects` — List accessible projects
- `POST /projects` — Create a project
- `PUT /projects/{id}` — Update a project
- `PUT /projects/{id}/status` — Change project status
- `DELETE /projects/{id}` — Delete a project
- `POST /projects/{id}/members` — Add a member
- `DELETE /projects/{id}/members/{userId}` — Remove a member

### Tasks
- `GET /tasks` — List tasks (filter by project, status)
- `POST /tasks` — Create a task
- `PUT /tasks/{id}` — Update a task (partial)
- `DELETE /tasks/{id}` — Delete a task
- `POST /tasks/{id}/move` — Move task to different column/status
- `POST /tasks/{id}/subtasks/{subtaskId}/toggle` — Toggle subtask completion
- `POST /tasks/{id}/comments` — Add a comment to a task

### Workspace
- `GET /workspace` — Get workspace summary
- `POST /workspace/reset` — Reset to demo state (admin only)

## Testing

### Backend (xUnit)

38 tests covering:
- Auth service: registration, login, duplicate email, password validation
- Task service: creation, ordering, validation, subtasks, comments, move, delete
- Project service: creation, status changes, members, deletion, access control
- User service: profile, updates, duplicate email, role changes

```bash
dotnet test src/TaskFlow.Api.Tests/
```

### Frontend (Vitest)

8 tests covering the API client response handler:
- JSON parsing, empty bodies, 204 handling, error extraction, 401 handling

```bash
npm test
```

## License

MIT