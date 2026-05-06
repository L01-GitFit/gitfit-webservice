import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async weeklyVolume(userId: string, weeks: number) {
    const since = new Date();
    since.setDate(since.getDate() - weeks * 7);

    const rows = await this.prisma.$queryRaw<{ week: Date; totalVolumeKg: number }[]>`
      SELECT
        date_trunc('week', ws.logged_at) AS week,
        COALESCE(SUM(ws.reps * ws.weight_kg), 0)::float AS "totalVolumeKg"
      FROM workout_sets ws
      JOIN workout_sessions sess ON sess.id = ws.session_id
      WHERE sess.user_id = ${userId}
        AND ws.logged_at >= ${since}
        AND ws.reps IS NOT NULL
        AND ws.weight_kg IS NOT NULL
      GROUP BY week
      ORDER BY week ASC
    `;
    return rows;
  }

  async exerciseProgress(userId: string, exerciseId: string) {
    const rows = await this.prisma.$queryRaw<{ date: Date; maxWeightKg: number; totalVolume: number }[]>`
      SELECT
        date_trunc('day', ws.logged_at) AS date,
        MAX(ws.weight_kg)::float        AS "maxWeightKg",
        COALESCE(SUM(ws.reps * ws.weight_kg), 0)::float AS "totalVolume"
      FROM workout_sets ws
      JOIN workout_sessions sess ON sess.id = ws.session_id
      WHERE sess.user_id = ${userId}
        AND ws.exercise_id = ${exerciseId}
        AND ws.weight_kg IS NOT NULL
      GROUP BY date
      ORDER BY date ASC
    `;
    return rows;
  }

  async muscleFrequency(userId: string, days: number) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const rows = await this.prisma.$queryRaw<{ muscle: string; count: number }[]>`
      SELECT
        m.muscle,
        COUNT(*)::int AS count
      FROM workout_sets ws
      JOIN workout_sessions sess ON sess.id = ws.session_id
      JOIN exercises ex ON ex.id = ws.exercise_id
      CROSS JOIN LATERAL unnest(ex.target_muscles) AS m(muscle)
      WHERE sess.user_id = ${userId}
        AND ws.logged_at >= ${since}
      GROUP BY m.muscle
      ORDER BY count DESC
    `;
    return rows;
  }

  async workoutStreak(userId: string) {
    const rows = await this.prisma.$queryRaw<{ workout_date: Date }[]>`
      SELECT DISTINCT date_trunc('day', started_at)::date AS workout_date
      FROM workout_sessions
      WHERE user_id = ${userId}
        AND status = 'COMPLETED'
      ORDER BY workout_date DESC
    `;

    if (rows.length === 0) return { currentStreak: 0, longestStreak: 0 };

    const dates = rows.map((r) => new Date(r.workout_date).toISOString().slice(0, 10));

    let currentStreak = 0;
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    // Current streak: consecutive days ending today or yesterday
    if (dates[0] === today || dates[0] === yesterday) {
      currentStreak = 1;
      for (let i = 1; i < dates.length; i++) {
        const prev = new Date(dates[i - 1]);
        const curr = new Date(dates[i]);
        const diff = Math.round((prev.getTime() - curr.getTime()) / 86400000);
        if (diff === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    // Longest streak: scan all dates
    let longestStreak = 1;
    let streak = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]);
      const curr = new Date(dates[i]);
      const diff = Math.round((prev.getTime() - curr.getTime()) / 86400000);
      if (diff === 1) {
        streak++;
        if (streak > longestStreak) longestStreak = streak;
      } else {
        streak = 1;
      }
    }

    return { currentStreak, longestStreak };
  }
}
