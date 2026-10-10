import { Module } from '@nestjs/common';
import { CLOCK } from './application/ports/clock.port';
import { ID_GENERATOR } from './application/ports/id-generator.port';
import { SystemClock } from './infrastructure/system-clock';
import { UuidIdGenerator } from './infrastructure/uuid-id-generator';

/**
 * Adaptateurs transverses (horloge, générateur d'id) partagés par tous les
 * modules métier, pour éviter de les redéclarer dans chaque module.
 */
@Module({
  providers: [
    { provide: CLOCK, useClass: SystemClock },
    { provide: ID_GENERATOR, useClass: UuidIdGenerator },
  ],
  exports: [CLOCK, ID_GENERATOR],
})
export class SharedModule {}
