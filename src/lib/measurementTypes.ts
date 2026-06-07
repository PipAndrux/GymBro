export interface MeasurementTypeDef {
  type: string
  label: string
  defaultUnit: string
  primary?: boolean
}

export const MEASUREMENT_TYPE_DEFS: MeasurementTypeDef[] = [
  { type: 'weight',        label: 'Body Weight',    defaultUnit: 'kg',  primary: true },
  { type: 'height',        label: 'Height',          defaultUnit: 'cm',  primary: true },
  { type: 'body_fat',      label: 'Body Fat',        defaultUnit: '%' },
  { type: 'muscle_mass',   label: 'Muscle Mass',     defaultUnit: 'kg' },
  { type: 'chest',         label: 'Chest',           defaultUnit: 'cm' },
  { type: 'waist',         label: 'Waist',           defaultUnit: 'cm' },
  { type: 'hips',          label: 'Hips',            defaultUnit: 'cm' },
  { type: 'neck',          label: 'Neck',            defaultUnit: 'cm' },
  { type: 'shoulders',     label: 'Shoulders',       defaultUnit: 'cm' },
  { type: 'left_bicep',    label: 'Left Bicep',      defaultUnit: 'cm' },
  { type: 'right_bicep',   label: 'Right Bicep',     defaultUnit: 'cm' },
  { type: 'left_forearm',  label: 'Left Forearm',    defaultUnit: 'cm' },
  { type: 'right_forearm', label: 'Right Forearm',   defaultUnit: 'cm' },
  { type: 'left_thigh',    label: 'Left Thigh',      defaultUnit: 'cm' },
  { type: 'right_thigh',   label: 'Right Thigh',     defaultUnit: 'cm' },
  { type: 'left_calf',     label: 'Left Calf',       defaultUnit: 'cm' },
  { type: 'right_calf',    label: 'Right Calf',      defaultUnit: 'cm' },
]

export function getMeasurementDef(type: string): MeasurementTypeDef | undefined {
  return MEASUREMENT_TYPE_DEFS.find(d => d.type === type)
}
