import { ControlBase } from './ControlBase';
import type { ControlData } from '../../types/ControlData';

export class ControlBinary extends ControlBase {
  value: string | undefined;

  constructor(data: ControlData) {
    super({ ...data, type: 'Binary' });
  }
}