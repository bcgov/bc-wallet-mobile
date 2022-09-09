import { ControlBase } from './ControlBase';
import type { ControlData } from '../../types/ControlData';

export class ControlNumeric extends ControlBase {
  value: number | undefined;

  constructor(data: ControlData) {
    super({ ...data, type: 'Numeric' });
  }
}