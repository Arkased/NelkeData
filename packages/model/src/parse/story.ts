import { z } from 'zod';
import type { ReadTable } from './xml.js';

const MAIN_TASK_TYPE = '0';

const taskSchema = z.object({
  TASK_ID: z.string(),
  TASK_TYPE_ID: z.string(),
  TASK_NAME: z.string(),
});

/** A main story task. */
export interface MainTask {
  /** The task number as the game shows it. MAIN_TASK_000 is Task 1. */
  num: number;
  name: string;
}

/** The main tasks of the story and the labels that refer to them. */
export interface Story {
  /** Maps a task id to its main task. */
  mainTask: Map<string, MainTask>;
  /** Returns "Task N: name" for a main task id, or the id itself when it is not a main task. */
  taskLabel: (id: string) => string;
  /** Returns "After Task N: name" for the review event of a main task, '' for no event, or the id itself when unknown. */
  eventLabel: (id: string) => string;
}

/**
 * Loads the main tasks.
 * @param read - the table reader of the saves folder
 * @param t - the English text of a label
 * @returns the main tasks and the label functions
 * @sideEffects reads task/task.xml through the table reader
 */
export function loadStory(read: ReadTable, t: (label: string) => string): Story {
  const mainTask = new Map(
    read('task/task.xml', taskSchema)
      .filter((k) => k.TASK_TYPE_ID === MAIN_TASK_TYPE)
      .map((k): [string, MainTask] => [k.TASK_ID, { num: Number(k.TASK_ID.slice(-3)) + 1, name: t(k.TASK_NAME) }]),
  );
  const taskLabel = (id: string): string => {
    const task = mainTask.get(id);
    return task ? `Task ${task.num}: ${task.name}` : id;
  };
  // EVENT_MM01_0<N+1>0 is the review event where Lotos approves main task N.
  // The data has no event names; this rule comes from the English dialog of event_message_mm01_*.ebm.
  const eventLabel = (id: string): string => {
    if (!id || id === 'EVENT_NONE') return '';
    const m = /^EVENT_MM01_(\d)(\d)0$/.exec(id);
    const n = m ? Number(`${m[1]}${m[2]}`) - 1 : 0;
    const task = [...mainTask].find(([, v]) => v.num === n);
    return task ? `After ${taskLabel(task[0])}` : id;
  };
  return { mainTask, taskLabel, eventLabel };
}
