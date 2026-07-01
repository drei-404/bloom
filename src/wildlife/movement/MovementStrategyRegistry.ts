import type { MovementType } from '../types';
import type { MovementStrategy } from './MovementStrategy';
import { groundMovement } from './GroundMovement';

/**
 * Resolves a movement strategy by a species' `movementType`. Ground is the
 * built-in default, so unregistered types fall back to walking rather than
 * breaking. Register additional strategies (e.g. flying) at startup.
 */
class MovementStrategyRegistry {
  private readonly strategies = new Map<MovementType, MovementStrategy>();

  register(type: MovementType, strategy: MovementStrategy): void {
    this.strategies.set(type, strategy);
  }

  get(type: MovementType): MovementStrategy {
    return this.strategies.get(type) ?? groundMovement;
  }

  clear(): void {
    this.strategies.clear();
  }
}

export const movementStrategyRegistry = new MovementStrategyRegistry();
