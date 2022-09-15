import type { Attribute } from './Attribute';
import type { Structure } from '../entities/Structure';

export type ControlData = {
  name: string;
  isFlagged: boolean;
  multiple: boolean;
  reference?: Structure | null;
} & Attribute;