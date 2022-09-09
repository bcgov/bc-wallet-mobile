import { ControlBase } from './ControlBase';
import type { ControlData } from '../../types/ControlData';

export class ControlReference extends ControlBase {
  constructor(data: ControlData) {
    super({ ...data, type: 'Reference' });
  }
}