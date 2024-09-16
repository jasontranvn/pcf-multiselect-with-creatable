export interface OptionType {
  id: string;
  label: string;
  bridgeRecordId?: string;
}

export type Tag = OptionType;

export interface CaseCauseOfEscalationRecord {
  nfcu_casecauseofescalationid: string;
  _nfcu_CauseofEscalation_value: string;
  '_nfcu_CauseofEscalation_value@OData.Community.Display.V1.FormattedValue': string;
}

export interface EscalationRecord {
  nfcu_causeofescalationid: string;
  nfcu_name: string;
}

export interface MultiSelectDropdownProps {
  concernComplaintId: string;
  selectedValues: OptionType[];
  onSelectionChange: (selectedOptions: OptionType[]) => void;
}
