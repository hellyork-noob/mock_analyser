import { db } from '../../data/db';

const estimateToken = (taskId: number) => `task-estimate:${taskId}`;

export function taskEstimateSessions(taskId: number) {
  return db.focusSessions.where('token').equals(estimateToken(taskId));
}

export async function setTaskCompleted(taskId: number, completed: boolean) {
  await db.transaction('rw', [db.studyTasks, db.focusSessions], async () => {
    const task = await db.studyTasks.get(taskId);
    if (!task || task.completed === completed) return;

    await db.studyTasks.update(taskId, { completed });
    if (!completed) {
      await taskEstimateSessions(taskId).delete();
      return;
    }

    const seconds = Math.round(task.estimatedMinutes * 60);
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    const alreadyLogged = await db.focusSessions.filter(session => session.taskId === taskId && session.seconds > 0).first();
    if (alreadyLogged) return;

    const now = Date.now();
    await db.focusSessions.add({
      token: estimateToken(taskId),
      taskId,
      title: task.title,
      estimatedForDate: task.date,
      startedAt: now,
      endedAt: now,
      seconds,
      segments: [],
      completed: true,
    });
  });
}
