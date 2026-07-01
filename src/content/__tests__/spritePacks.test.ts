import { describe, it, expect, beforeEach } from 'vitest';
import '../../wildlife/families/groundHerbivore'; // family behaviour (dependency)
import '../../wildlife/families/flying';
import { assetRegistry } from '../../assets/AssetRegistry';
import { ASSET_IDS } from '../../assets/placeholderPack';
import { ANIMAL_FRAME_ORDER, animalSprite } from '../../assets/animalSprite';
import type { AnimalState } from '../../animal/IAnimal';
import type { ContentPack } from '../ContentPack';

import { rabbitPack } from '../packs/rabbit.pack';
import { deerPack } from '../packs/deer.pack';
import { squirrelPack } from '../packs/squirrel.pack';
import { foxPack } from '../packs/fox.pack';
import { hedgehogPack } from '../packs/hedgehog.pack';
import { beaverPack } from '../packs/beaver.pack';
import { otterPack } from '../packs/otter.pack';
import { bearPack } from '../packs/bear.pack';
import { owlPack } from '../packs/owl.pack';
import { duckPack } from '../packs/duck.pack';
import { goosePack } from '../packs/goose.pack';
import { woodpeckerPack } from '../packs/woodpecker.pack';
import { frogPack } from '../packs/frog.pack';
import { turtlePack } from '../packs/turtle.pack';
import { butterflyPack } from '../packs/butterfly.pack';
import { firefliesPack } from '../packs/fireflies.pack';

// Every Phase 1 species: id → its content pack. The frame layout + clips are
// identical (shared animalSprite); only the artwork differs per species.
const PACKS: Array<[string, ContentPack]> = [
  ['rabbit', rabbitPack], ['deer', deerPack], ['squirrel', squirrelPack], ['fox', foxPack],
  ['hedgehog', hedgehogPack], ['beaver', beaverPack], ['otter', otterPack], ['bear', bearPack],
  ['owl', owlPack], ['duck', duckPack], ['goose', goosePack], ['woodpecker', woodpeckerPack],
  ['frog', frogPack], ['turtle', turtlePack], ['butterfly', butterflyPack], ['fireflies', firefliesPack],
];

const ANIMATION_STATES: AnimalState[] = ['idle', 'walking', 'sleeping'];

describe('animalSprite helper', () => {
  it('builds the shared 7-frame layout, staticFrame and three state clips', () => {
    const s = animalSprite('/assets/x.png');
    expect(s.spritesheet).toBe('/assets/x.png');
    expect(s.staticFrame).toBe('idle_0');
    expect(Object.keys(s.frames)).toEqual([...ANIMAL_FRAME_ORDER]);
    expect(Object.keys(s.animations).sort()).toEqual([...ANIMATION_STATES].sort());
    // Frames are laid out left-to-right, 32px columns.
    expect(s.frames.idle_0).toEqual({ x: 0, y: 0, w: 32, h: 32 });
    expect(s.frames.sleep_0).toEqual({ x: 6 * 32, y: 0, w: 32, h: 32 });
  });
});

describe('every species pack ships production sprite art', () => {
  beforeEach(() => assetRegistry.clear());

  it.each(PACKS)('%s registers spritesheet + frames + clips + staticFrame + fallback palette', (id, pack) => {
    pack.register();
    const a = assetRegistry.get(ASSET_IDS.animal(id));
    expect(a, `${id} asset registered`).toBeDefined();

    // Spritesheet at the conventional per-species path.
    expect(a?.spritesheet).toBe(`/assets/${id}.png`);
    expect(a?.staticFrame).toBe('idle_0');

    // Standard 7-frame table.
    expect(Object.keys(a?.frames ?? {})).toEqual([...ANIMAL_FRAME_ORDER]);

    // Clips keyed by the AnimalState values, all referencing real frames.
    expect(Object.keys(a?.animations ?? {}).sort()).toEqual([...ANIMATION_STATES].sort());
    const frameIds = new Set(Object.keys(a?.frames ?? {}));
    for (const clip of Object.values(a?.animations ?? {})) {
      expect(clip.frames.length).toBeGreaterThan(0);
      for (const f of clip.frames) expect(frameIds.has(f), `${id} clip frame ${f}`).toBe(true);
    }

    // Placeholder palette retained for the load-failure fallback.
    expect(a?.metadata).toMatchObject({ body: expect.any(Number), dark: expect.any(Number) });
    pack.unregister();
  });
});
