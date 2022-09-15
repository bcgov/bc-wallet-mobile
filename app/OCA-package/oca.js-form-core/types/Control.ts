import type { ControlBinary } from '../entities/controls/ControlBinary';
import type { ControlCheckbox } from '../entities/controls/ControlCheckbox';
import type { ControlDate } from '../entities/controls/ControlDate';
import type { ControlNumeric } from '../entities/controls/ControlNumeric';
import type { ControlSelect } from '../entities/controls/ControlSelect';
import type { ControlSelectMultiple } from '../entities/controls/ControlSelectMultiple';
import type { ControlText } from '../entities/controls/ControlText';
import type { ControlReference } from '../entities/controls/ControlReference';

export type Control =
  | ControlBinary
  | ControlCheckbox
  | ControlDate
  | ControlNumeric
  | ControlSelect
  | ControlSelectMultiple
  | ControlText
  | ControlReference
  | undefined;
