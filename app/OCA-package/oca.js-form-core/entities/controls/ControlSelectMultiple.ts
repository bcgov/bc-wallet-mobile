import { ControlBase } from './ControlBase';
import type { ControlData } from '../../types/ControlData';

export class ControlSelectMultiple extends ControlBase {
  value: string[] | undefined;

  constructor(data: ControlData) {
    super({ ...data, type: 'SelectMultiple' });
  }
}