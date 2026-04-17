You are a senior backend engineer. Your task is to scaffold a production-ready NestJS project from scratch based on the specifications below. Generate all files with complete, working code — do not leave placeholders or TODOs.

The entire project must be created inside a root folder named `gitfit-webservice/`. All file paths below are relative to this root folder.

---

## Tech Stack
- Runtime: Node.js + TypeScript (strict mode)
- Framework: NestJS (latest)
- ORM: Prisma with PostgreSQL adapter
- Database: PostgreSQL (runs via Docker)
- Auth: JWT (access token 15m + refresh token 7d) with bcrypt password hashing
- Validation: class-validator + class-transformer
- API Docs: Swagger via @nestjs/swagger (served at /api/docs)
- Deployment: Render.com (backend as Web Service, database as managed PostgreSQL)

---

## Project Structure to Generate

```
gitfit-webservice/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── prisma/
│   │   └── prisma.service.ts
│   ├── common/
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   └── public.decorator.ts
│   │   ├── filters/prisma-exception.filter.ts
│   │   ├── interceptors/transform.interceptor.ts
│   │   └── guards/jwt-auth.guard.ts
│   └── modules/
│       ├── auth/
│       │   ├── auth.module.ts
│       │   ├── auth.controller.ts
│       │   ├── auth.service.ts
│       │   ├── strategies/jwt.strategy.ts
│       │   ├── strategies/jwt-refresh.strategy.ts
│       │   └── dto/
│       │       ├── register.dto.ts
│       │       └── login.dto.ts
│       ├── users/
│       │   ├── users.module.ts
│       │   ├── users.controller.ts
│       │   ├── users.service.ts
│       │   └── dto/update-profile.dto.ts
│       ├── exercises/
│       │   ├── exercises.module.ts
│       │   ├── exercises.controller.ts
│       │   ├── exercises.service.ts
│       │   ├── sync.service.ts
│       │   └── dto/
│       │       ├── query-exercise.dto.ts
│       │       └── create-exercise.dto.ts
│       ├── programs/
│       │   ├── programs.module.ts
│       │   ├── programs.controller.ts
│       │   ├── programs.service.ts
│       │   └── dto/
│       │       ├── create-program.dto.ts
│       │       └── update-program.dto.ts
│       ├── routines/
│       │   ├── routines.module.ts
│       │   ├── routines.controller.ts
│       │   ├── routines.service.ts
│       │   └── dto/
│       │       ├── create-routine.dto.ts
│       │       └── upsert-routine-exercise.dto.ts
│       ├── workout-sessions/
│       │   ├── workout-sessions.module.ts
│       │   ├── workout-sessions.controller.ts
│       │   ├── workout-sessions.service.ts
│       │   └── dto/
│       │       ├── create-session.dto.ts
│       │       ├── finish-session.dto.ts
│       │       └── create-set.dto.ts
│       ├── personal-records/
│       │   ├── personal-records.module.ts
│       │   ├── personal-records.controller.ts
│       │   └── personal-records.service.ts
│       └── stats/
│           ├── stats.module.ts
│           ├── stats.controller.ts
│           └── stats.service.ts
├── prisma/
│   └── schema.prisma
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── render.yaml
├── tsconfig.json
└── package.json
```

---

## Prisma Schema

Generate `prisma/schema.prisma` with exactly these models:

### Enums
- Gender: MALE, FEMALE, OTHER
- FitnessGoal: MUSCLE_GAIN, WEIGHT_LOSS, ENDURANCE, MAINTAIN
- ExperienceLevel: BEGINNER, INTERMEDIATE, ADVANCED
- SessionStatus: IN_PROGRESS, COMPLETED, CANCELLED
- RecordType: MAX_WEIGHT, MAX_REPS, MAX_VOLUME, MAX_DISTANCE

### Models

**User** — id (uuid), email (unique), passwordHash, username (unique), fullName?, avatarUrl?, dateOfBirth?, gender?, heightCm?, weightKg?, fitnessGoal?, experienceLevel?, createdAt, updatedAt
Relations: RefreshToken[], Exercise[] (CustomExercises), Program[], Routine[], WorkoutSession[], PersonalRecord[]

**RefreshToken** — id, userId (FK→User cascade), token (unique), expiresAt, createdAt

**Exercise** — id, exerciseDbId? (unique), name, gifUrl?, targetMuscles (String[]), bodyParts (String[]), equipments (String[]), secondaryMuscles (String[]), instructions (String[]), isCustom (default false), createdBy? (FK→User), syncedAt?, createdAt
Relations: RoutineExercise[], WorkoutSet[], PersonalRecord[]

**Program** — id, userId (FK→User cascade), name, description?, durationWeeks?, isActive (default false), createdAt, updatedAt
Relations: Routine[]

**Routine** — id, userId (FK→User cascade), programId? (FK→Program), name, dayOfWeek?, orderInProgram?, createdAt, updatedAt
Relations: RoutineExercise[], WorkoutSession[]

**RoutineExercise** — id, routineId (FK→Routine cascade), exerciseId (FK→Exercise), sets?, repsTarget (String)?, weightTarget?, restSeconds?, orderIndex

**WorkoutSession** — id, userId (FK→User cascade), routineId? (FK→Routine), name, startedAt, finishedAt?, durationSeconds?, totalVolumeKg?, notes?, status (default IN_PROGRESS), createdAt
Relations: WorkoutSet[]

**WorkoutSet** — id, sessionId (FK→WorkoutSession cascade), exerciseId (FK→Exercise), setNumber, reps?, weightKg?, durationSeconds?, distanceMeters?, rpe?, isWarmup (default false), isPr (default false), loggedAt (default now)

**PersonalRecord** — id, userId (FK→User cascade), exerciseId (FK→Exercise), recordType, value, unit, achievedAt, sessionId?
@@unique([userId, exerciseId, recordType])

All models: use @@map() snake_case table names, @map() snake_case column names.

---

## Swagger / API Docs Setup

In `main.ts`, configure Swagger using `@nestjs/swagger` as follows:

```typescript
const config = new DocumentBuilder()
  .setTitle('GitFit API')
  .setDescription('Backend API for the GitFit workout tracking app')
  .setVersion('1.0')
  .addBearerAuth(
    { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    'access-token',
  )
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
```

Apply the following Swagger decorators consistently across the entire codebase:

- Every controller must have `@ApiTags('tag-name')` (e.g. 'auth', 'users', 'exercises', etc.)
- Every endpoint must have `@ApiOperation({ summary: '...' })`
- Every endpoint must have `@ApiResponse({ status: ..., description: '...' })` for common responses (200/201, 400, 401, 403, 404)
- All protected endpoints must have `@ApiBearerAuth('access-token')`
- Every DTO class must use `@ApiProperty()` or `@ApiPropertyOptional()` on all fields with description and example values
- Query param DTOs must use `@ApiPropertyOptional()` for optional filters
- For paginated responses, annotate with `@ApiOkResponse({ schema: { ... } })` including meta shape
- Disable Swagger in production: wrap SwaggerModule.setup in `if (process.env.NODE_ENV !== 'production')`

---

## API Endpoints to Implement

### Auth — /auth
POST /auth/register — body: { email, password, username }
POST /auth/login — body: { email, password } → { accessToken, refreshToken }
POST /auth/refresh — header: Bearer  → new accessToken
POST /auth/logout — invalidate refreshToken

### Users — /users (JWT protected)
GET  /users/me → profile
PATCH /users/me → update profile (fullName, gender, heightCm, weightKg, fitnessGoal, experienceLevel)

### Exercises — /exercises (JWT protected)
GET  /exercises — query: { bodyPart?, equipment?, muscle?, search?, page?, limit? }
GET  /exercises/:id
POST /exercises — create custom exercise (isCustom=true, createdBy=currentUser)
PATCH /exercises/:id — only if isCustom && createdBy === currentUser
DELETE /exercises/:id — only if isCustom && createdBy === currentUser
POST /exercises/sync — trigger ExerciseDB sync (admin or internal use)

ExerciseDB base URL is stored in env as EXERCISE_DB_URL. Sync fetches all pages sequentially and upserts by exerciseDbId.

### Programs — /programs (JWT protected)
GET    /programs — list user's programs
POST   /programs
GET    /programs/:id
PATCH  /programs/:id
DELETE /programs/:id
POST   /programs/:id/activate — set isActive=true, deactivate others

### Routines — /routines (JWT protected)
GET    /routines — optionally filter by ?programId=
POST   /routines
GET    /routines/:id
PATCH  /routines/:id
DELETE /routines/:id
POST   /routines/:id/exercises — add exercise (body: exerciseId, sets, repsTarget, weightTarget, restSeconds, orderIndex)
PATCH  /routines/:id/exercises/:exerciseId
DELETE /routines/:id/exercises/:exerciseId

### Workout Sessions — /workout-sessions (JWT protected)
GET    /workout-sessions — paginated history, filter ?status=, ?from=, ?to=
POST   /workout-sessions — start session (body: name, routineId?)
GET    /workout-sessions/:id
PATCH  /workout-sessions/:id/finish — set finishedAt, compute durationSeconds and totalVolumeKg, status=COMPLETED
PATCH  /workout-sessions/:id/cancel — status=CANCELLED
POST   /workout-sessions/:id/sets — log a set; auto-detect PR after insert
PATCH  /workout-sessions/:id/sets/:setId
DELETE /workout-sessions/:id/sets/:setId

PR detection logic: after inserting a WorkoutSet, check PersonalRecord for [userId, exerciseId, MAX_WEIGHT]. If new weightKg > current record (or no record exists), upsert PersonalRecord and set WorkoutSet.isPr = true.

### Personal Records — /personal-records (JWT protected)
GET /personal-records — all PRs for current user, optionally filter ?exerciseId=
GET /personal-records/:exerciseId

### Stats — /stats (JWT protected)
GET /stats/weekly-volume?weeks=8 — array of { week, totalVolumeKg }
GET /stats/exercise-progress/:exerciseId — array of { date, maxWeightKg, totalVolume }
GET /stats/muscle-frequency?days=30 — array of { muscle, count } sorted desc
GET /stats/workout-streak — { currentStreak, longestStreak }

---

## Standard Response Format

All endpoints return:
```json
{ "success": true, "data": { ... } }
```
Paginated endpoints return:
```json
{ "success": true, "data": [...], "meta": { "total": 0, "page": 1, "limit": 10 } }
```
Errors return:
```json
{ "success": false, "message": "...", "statusCode": 400 }
```

Implement TransformInterceptor and PrismaExceptionFilter globally.

---

## Docker Setup

Generate `docker-compose.yml`:
- Service: postgres (image: postgres:16-alpine)
- Env: POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB from .env
- Port: 5432:5432
- Volume: pgdata for persistence
- Health check included

Generate `Dockerfile` for the NestJS app:
- Multi-stage build: builder + production
- Builder: node:20-alpine, install deps, generate prisma client, build
- Production: copy dist + node_modules, run migrations then start
- Expose port 3000
- CMD: ["sh", "-c", "npx prisma migrate deploy && node dist/main"]

---

## Environment Variables

Generate `.env.example` with:
```
DATABASE_URL=postgresql://user:password@localhost:5432/gitfit
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_here
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
EXERCISE_DB_URL=https://exercisedb-api.vercel.app/api/v2
PORT=3000
NODE_ENV=development
```

---

## Render Deployment

Generate `render.yaml` with:
- Web Service: gitfit-webservice
  - env: node
  - buildCommand: npm install && npx prisma generate && npm run build
  - startCommand: npx prisma migrate deploy && node dist/main
  - envVars: DATABASE_URL (from render DB), JWT_SECRET, JWT_REFRESH_SECRET, EXERCISE_DB_URL, NODE_ENV=production
- The PostgreSQL database is assumed to be provisioned manually on Render (Free tier); DATABASE_URL will be injected via dashboard env var.

---

## Additional Requirements
- Enable CORS for all origins in main.ts (configurable via env)
- Use ValidationPipe globally with whitelist: true, transform: true
- All routes except /auth/* require JwtAuthGuard globally, with @Public() decorator to opt-out
- Prisma onShutdownHook in AppModule to gracefully disconnect
- All service methods must check ownership (userId === currentUser.id) before returning or mutating data; throw ForbiddenException if mismatch
- Use @nestjs/schedule for a daily cron job in ExercisesModule that re-syncs ExerciseDB at 3:00 AM

Generate every file completely. Start with package.json, tsconfig.json, prisma/schema.prisma, then module by module in the order: prisma → common → auth → users → exercises → programs → routines → workout-sessions → personal-records → stats → docker-compose.yml → Dockerfile → .env.example → render.yaml.