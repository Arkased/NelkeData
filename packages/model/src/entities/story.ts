import type { Story } from '../parse/story.js';
import type { StoryEvent } from '../schema/index.js';

/**
 * Makes the story event of an event ID of the game.
 * @param story - the main tasks, which name the review events
 * @param eventId - the event ID of the game table
 * @returns the event with its label, or null when the ID means no event
 * @sideEffects none
 */
export function storyEventOf(story: Story, eventId: string): StoryEvent | null {
  const label = story.eventLabel(eventId);
  return label === '' ? null : { id: eventId, label };
}
