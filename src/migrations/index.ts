import * as migration_20261119_170815_initial from './20261119_170815_initial';
import * as migration_20261119_181551_data_model from './20261119_181551_data_model';

export const migrations = [
  {
    up: migration_20261119_170815_initial.up,
    down: migration_20261119_170815_initial.down,
    name: '20261119_170815_initial',
  },
  {
    up: migration_20261119_181551_data_model.up,
    down: migration_20261119_181551_data_model.down,
    name: '20261119_181551_data_model'
  },
];
