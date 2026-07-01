import { movementStrategyRegistry } from './MovementStrategyRegistry';
import { groundMovement } from './GroundMovement';
import { flyingMovement } from './FlyingMovement';

// Built-in movement strategies (engine content). Imported once at startup.
movementStrategyRegistry.register('walk', groundMovement);
movementStrategyRegistry.register('fly', flyingMovement);
