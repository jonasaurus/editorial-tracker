import * as migration_20261119_170815_initial from './20261119_170815_initial';

export const migrations = [
  {
    up: migration_20261119_170815_initial.up,
    down: migration_20261119_170815_initial.down,
    name: '20261119_170815_initial'
  },
];
