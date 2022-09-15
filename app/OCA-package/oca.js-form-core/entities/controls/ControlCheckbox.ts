import { ControlBase } from './ControlBase';
import type { ControlData } from '../../types/ControlData';

export class ControlCheckbox extends ControlBase {
  value: boolean | undefined;

  constructor(data: ControlData) {
    super({ ...data, type: 'Checkbox' });
  }
}