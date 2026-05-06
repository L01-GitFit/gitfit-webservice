You are a senior backend engineer working on an existing NestJS + Prisma + PostgreSQL project called `gitfit-webservice`.

The project already has the following modules scaffolded: auth, users, exercises, programs, routines, workout-sessions, personal-records, stats.

Your task is to implement the **Cache-on-demand** pattern for the exercises module. Do NOT rewrite existing files from scratch — only add or modify what is specified below. Generate all code completely with no placeholders or TODOs.

---

## Context

Previously, exercises were synced in bulk via `POST /exercises/sync`. This approach is being replaced. Instead:
- The frontend browses and searches exercises directly from ExerciseDB API
- When a user actually uses an exercise (adds to routine or logs a set), the frontend sends the full exercise data to the backend
- The backend upserts the exercise into its own DB at that moment, obtaining a real internal UUID as FK

The `POST /exercises/sync` endpoint and its bulk sync logic in `sync.service.ts` should be removed entirely.

---

## Prisma Schema — Verify these fields exist on the Exercise model

Ensure `prisma/schema.prisma` Exercise model has exactly these fields (add any missing ones):

```prisma
model Exercise {
  id               String    @id @default(uuid())
  exerciseDbId     String?   @unique @map("exercise_db_id")
  name             String
  gifUrl           String?   @map("gif_url")
  targetMuscles    String[]  @map("target_muscles")
  bodyParts        String[]  @map("body_parts")
  equipments       String[]
  secondaryMuscles String[]  @map("secondary_muscles")
  instructions     String[]
  isCustom         Boolean   @default(false) @map("is_custom")
  createdBy        String?   @map("created_by")
  syncedAt         DateTime? @map("synced_at")
  createdAt        DateTime  @default(now()) @map("created_at")

  creator          User?             @relation("CustomExercises", fields: [createdBy], references: [id])
  routineExercises RoutineExercise[]
  workoutSets      WorkoutSet[]
  personalRecords  PersonalRecord[]

  @@map("exercises")
}
```

After any schema change, generate a new Prisma migration named `add_exercise_upsert_support`.

---

## 1. DTO — UpsertExerciseDto

Create or replace `src/modules/exercises/dto/upsert-exercise.dto.ts`:

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpsertExerciseDto {
  @ApiProperty({ example: 'abc123', description: 'Original ID from ExerciseDB' })
  @IsString()
  exerciseDbId: string;

  @ApiProperty({ example: 'Barbell Bench Press' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/bench.gif' })
  @IsOptional()
  @IsString()
  gifUrl?: string;

  @ApiProperty({ example: ['pectorals'] })
  @IsArray()
  targetMuscles: string[];

  @ApiProperty({ example: ['chest'] })
  @IsArray()
  bodyParts: string[];

  @ApiProperty({ example: ['barbell'] })
  @IsArray()
  equipments: string[];

  @ApiProperty({ example: ['triceps', 'anterior deltoid'] })
  @IsArray()
  secondaryMuscles: string[];

  @ApiProperty({ example: ['Lie on a flat bench...'] })
  @IsArray()
  instructions: string[];
}
```

---

## 2. ExercisesService — add upsertFromExternalApi method

In `src/modules/exercises/exercises.service.ts`, add this method. Do NOT remove existing methods:

```typescript
async upsertFromExternalApi(dto: UpsertExerciseDto): Promise {
  return this.prisma.exercise.upsert({
    where: { exerciseDbId: dto.exerciseDbId },
    create: {
      exerciseDbId: dto.exerciseDbId,
      name: dto.name,
      gifUrl: dto.gifUrl ?? null,
      targetMuscles: dto.targetMuscles,
      bodyParts: dto.bodyParts,
      equipments: dto.equipments,
      secondaryMuscles: dto.secondaryMuscles,
      instructions: dto.instructions,
      isCustom: false,
    },
    update: {}, // already exists — keep as-is
  });
}
```

Export this method as public. Inject `ExercisesService` into `RoutinesModule` and `WorkoutSessionsModule` via their respective module imports.

---

## 3. DTO changes — RoutinesModule

### AddExerciseToRoutineDto
Create or replace `src/modules/routines/dto/add-exercise-to-routine.dto.ts`:

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { UpsertExerciseDto } from '../../exercises/dto/upsert-exercise.dto';

export class AddExerciseToRoutineDto {
  @ApiProperty({ description: 'Full exercise data from ExerciseDB' })
  @ValidateNested()
  @Type(() => UpsertExerciseDto)
  exercise: UpsertExerciseDto;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  sets?: number;

  @ApiPropertyOptional({ example: '8-12' })
  @IsOptional()
  @IsString()
  repsTarget?: string;

  @ApiPropertyOptional({ example: 80 })
  @IsOptional()
  @IsNumber()
  weightTarget?: number;

  @ApiPropertyOptional({ example: 90 })
  @IsOptional()
  @IsInt()
  restSeconds?: number;

  @ApiProperty({ example: 0 })
  @IsInt()
  orderIndex: number;
}
```

---

## 4. RoutinesService — update addExerciseToRoutine

In `src/modules/routines/routines.service.ts`, update `addExerciseToRoutine` to:
1. Call `this.exercisesService.upsertFromExternalApi(dto.exercise)` first
2. Use the returned `exercise.id` (internal UUID) as FK when creating `RoutineExercise`

Full updated method:

```typescript
async addExerciseToRoutine(
  userId: string,
  routineId: string,
  dto: AddExerciseToRoutineDto,
) {
  // Verify ownership
  const routine = await this.prisma.routine.findUnique({ where: { id: routineId } });
  if (!routine) throw new NotFoundException('Routine not found');
  if (routine.userId !== userId) throw new ForbiddenException();

  // Upsert exercise into local DB
  const exercise = await this.exercisesService.upsertFromExternalApi(dto.exercise);

  return this.prisma.routineExercise.create({
    data: {
      routineId,
      exerciseId: exercise.id,
      sets: dto.sets,
      repsTarget: dto.repsTarget,
      weightTarget: dto.weightTarget,
      restSeconds: dto.restSeconds,
      orderIndex: dto.orderIndex,
    },
    include: { exercise: true },
  });
}
```

---

## 5. DTO changes — WorkoutSessionsModule

### CreateSetDto
Create or replace `src/modules/workout-sessions/dto/create-set.dto.ts`:

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNumber, IsOptional, Max, Min, ValidateNested } from 'class-validator';
import { UpsertExerciseDto } from '../../exercises/dto/upsert-exercise.dto';

export class CreateSetDto {
  @ApiProperty({ description: 'Full exercise data from ExerciseDB' })
  @ValidateNested()
  @Type(() => UpsertExerciseDto)
  exercise: UpsertExerciseDto;

  @ApiProperty({ example: 1 })
  @IsInt()
  setNumber: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  reps?: number;

  @ApiPropertyOptional({ example: 80.5 })
  @IsOptional()
  @IsNumber()
  weightKg?: number;

  @ApiPropertyOptional({ example: 300 })
  @IsOptional()
  @IsInt()
  durationSeconds?: number;

  @ApiPropertyOptional({ example: 1000 })
  @IsOptional()
  @IsNumber()
  distanceMeters?: number;

  @ApiPropertyOptional({ example: 7, minimum: 1, maximum: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  rpe?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isWarmup?: boolean;
}
```

---

## 6. WorkoutSessionsService — update logSet

In `src/modules/workout-sessions/workout-sessions.service.ts`, update the `logSet` method to:
1. Call `this.exercisesService.upsertFromExternalApi(dto.exercise)` first
2. Use the returned `exercise.id` as FK for WorkoutSet
3. After insert, call PR detection

Full updated method:

```typescript
async logSet(userId: string, sessionId: string, dto: CreateSetDto) {
  // Verify session ownership
  const session = await this.prisma.workoutSession.findUnique({ where: { id: sessionId } });
  if (!session) throw new NotFoundException('Session not found');
  if (session.userId !== userId) throw new ForbiddenException();
  if (session.status !== 'IN_PROGRESS') throw new BadRequestException('Session is not active');

  // Upsert exercise into local DB
  const exercise = await this.exercisesService.upsertFromExternalApi(dto.exercise);

  // Create the set
  const workoutSet = await this.prisma.workoutSet.create({
    data: {
      sessionId,
      exerciseId: exercise.id,
      setNumber: dto.setNumber,
      reps: dto.reps,
      weightKg: dto.weightKg,
      durationSeconds: dto.durationSeconds,
      distanceMeters: dto.distanceMeters,
      rpe: dto.rpe,
      isWarmup: dto.isWarmup ?? false,
    },
    include: { exercise: true },
  });

  // Auto-detect PR (only for non-warmup sets with weight)
  if (!dto.isWarmup && dto.weightKg) {
    await this.detectAndUpdatePR(userId, exercise.id, workoutSet);
  }

  return workoutSet;
}

private async detectAndUpdatePR(
  userId: string,
  exerciseId: string,
  set: WorkoutSet,
) {
  if (!set.weightKg) return;

  const existing = await this.prisma.personalRecord.findUnique({
    where: { userId_exerciseId_recordType: { userId, exerciseId, recordType: 'MAX_WEIGHT' } },
  });

  const isNewPr = !existing || set.weightKg > existing.value;

  if (isNewPr) {
    await Promise.all([
      this.prisma.personalRecord.upsert({
        where: { userId_exerciseId_recordType: { userId, exerciseId, recordType: 'MAX_WEIGHT' } },
        create: { userId, exerciseId, recordType: 'MAX_WEIGHT', value: set.weightKg, unit: 'kg', achievedAt: set.loggedAt, sessionId: set.sessionId },
        update: { value: set.weightKg, achievedAt: set.loggedAt, sessionId: set.sessionId },
      }),
      this.prisma.workoutSet.update({
        where: { id: set.id },
        data: { isPr: true },
      }),
    ]);
  }
}
```

---

## 7. Remove sync.service.ts and POST /exercises/sync

- Delete `src/modules/exercises/sync.service.ts`
- Remove `SyncService` from `exercises.module.ts` providers
- Remove `@nestjs/schedule` cron job if it was added for sync
- Remove `POST /exercises/sync` endpoint from `exercises.controller.ts`
- Remove the corresponding method from `exercises.service.ts`

---

## 8. Swagger — update controller decorators

### exercises.controller.ts
Remove the sync endpoint. Ensure remaining endpoints have full Swagger decorators.

### routines.controller.ts
Update `POST /routines/:id/exercises` swagger decorators:

```typescript
@Post(':id/exercises')
@ApiOperation({ summary: 'Add exercise to routine (upserts exercise from ExerciseDB if not cached)' })
@ApiParam({ name: 'id', description: 'Routine ID' })
@ApiResponse({ status: 201, description: 'Exercise added to routine' })
@ApiResponse({ status: 403, description: 'Forbidden' })
@ApiResponse({ status: 404, description: 'Routine not found' })
@ApiBearerAuth('access-token')
```

### workout-sessions.controller.ts
Update `POST /workout-sessions/:id/sets` swagger decorators:

```typescript
@Post(':id/sets')
@ApiOperation({ summary: 'Log a set (upserts exercise from ExerciseDB, auto-detects PR)' })
@ApiParam({ name: 'id', description: 'Session ID' })
@ApiResponse({ status: 201, description: 'Set logged. isPr=true if new personal record' })
@ApiResponse({ status: 400, description: 'Session not active' })
@ApiResponse({ status: 403, description: 'Forbidden' })
@ApiResponse({ status: 404, description: 'Session not found' })
@ApiBearerAuth('access-token')
```

---

## 9. Module wiring

Ensure `ExercisesModule` exports `ExercisesService`:

```typescript
// exercises.module.ts
@Module({
  providers: [ExercisesService],
  exports: [ExercisesService], // <-- required
})
export class ExercisesModule {}
```

Ensure `RoutinesModule` and `WorkoutSessionsModule` import `ExercisesModule`:

```typescript
@Module({
  imports: [ExercisesModule],
  ...
})
export class RoutinesModule {}
```

---

## Summary of files to create or modify

- MODIFY  `prisma/schema.prisma` — verify Exercise model fields
- CREATE  `src/modules/exercises/dto/upsert-exercise.dto.ts`
- MODIFY  `src/modules/exercises/exercises.service.ts` — add upsertFromExternalApi
- MODIFY  `src/modules/exercises/exercises.module.ts` — export ExercisesService, remove SyncService
- MODIFY  `src/modules/exercises/exercises.controller.ts` — remove sync endpoint
- DELETE  `src/modules/exercises/sync.service.ts`
- CREATE  `src/modules/routines/dto/add-exercise-to-routine.dto.ts`
- MODIFY  `src/modules/routines/routines.service.ts` — update addExerciseToRoutine
- MODIFY  `src/modules/routines/routines.module.ts` — import ExercisesModule
- MODIFY  `src/modules/routines/routines.controller.ts` — update swagger decorators
- CREATE  `src/modules/workout-sessions/dto/create-set.dto.ts`
- MODIFY  `src/modules/workout-sessions/workout-sessions.service.ts` — update logSet + detectAndUpdatePR
- MODIFY  `src/modules/workout-sessions/workout-sessions.module.ts` — import ExercisesModule
- MODIFY  `src/modules/workout-sessions/workout-sessions.controller.ts` — update swagger decorators

After all changes, run `npx prisma migrate dev --name add_exercise_upsert_support` and verify the project compiles with `npm run build`.