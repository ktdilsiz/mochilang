// Default entry preserves bundled data for native apps and package tests.
import { configureDictionaryData } from './data-source';
import * as bundled from './bundled-data';
configureDictionaryData(bundled);
export * from './core';
