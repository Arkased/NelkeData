import { GatherKind, type Zone } from '@nelke/model';

/** The kinds of rare find in the order of the columns of the page. */
const KIND_ORDER: readonly GatherKind[] = [GatherKind.Treasure, GatherKind.BugNet, GatherKind.Digging, GatherKind.Fishing];

/**
 * The caption of a spot: a chest for the treasure, a spot for a gather tool.
 * @param kind - the kind of the spot
 * @param spot - the number of the spot
 * @returns the caption
 * @sideEffects none
 */
function captionOf(kind: GatherKind, spot: number): string {
  return `${kind === GatherKind.Treasure ? 'Chest' : 'Spot'} ${spot}`;
}

/** One item of a chest or gather spot with its rate. */
export interface RareSpotItem {
  itemId: string;
  rate: number;
}

/** One chest or gather spot with its items. */
export interface RareSpot {
  caption: string;
  items: RareSpotItem[];
}

/** One column of the rare finds: a kind with its spots. */
export interface RareColumn {
  kind: GatherKind;
  spots: RareSpot[];
}

/**
 * Groups the rare finds of a zone into columns by kind, in the order Treasure, Bug Net, Digging, Fishing, and into spots by number.
 * @param specialItems - the rare finds of the zone
 * @returns the columns; a kind with no item has no column
 * @sideEffects none
 */
export function groupRareFinds(specialItems: Zone['specialItems']): RareColumn[] {
  return KIND_ORDER.flatMap((kind) => {
    const bySpot = new Map<number, RareSpot>();
    for (const s of specialItems.filter((find) => find.kind === kind)) {
      let spot = bySpot.get(s.spot);
      if (spot === undefined) {
        spot = { caption: captionOf(kind, s.spot), items: [] };
        bySpot.set(s.spot, spot);
      }
      spot.items.push({ itemId: s.itemId, rate: s.rate });
    }
    const spots = [...bySpot].toSorted(([a], [b]) => a - b).map(([, spot]) => spot);
    return spots.length === 0 ? [] : [{ kind, spots }];
  });
}
