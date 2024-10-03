export interface BridgeRecord {
  nfcu_casecauseofescalationid: string;
  _nfcu_causeofescalation_value: string;
}

export interface Tag {
  id: string; // nfcu_causeofescalationid
  label: string; // nfcu_name
  owner: string; // Owner's team name or user's full name from Cause of Escalation table
  bridgeRecordId: string; // nfcu_casecauseofescalationid
}

export interface MultiSelectDropdownProps {
  concernComplaintId: string;
  selectedValues: OptionType[];
  onSelectionChange: (selectedOptions: OptionType[]) => void;
}

export interface OptionType {
  id: string;
  label: string;
  bridgeRecordId?: string;
  owner?: string;
}

export interface BridgeRecordEntity {
  nfcu_casecauseofescalationid: string;
  _nfcu_causeofescalation_value: string;
  ownerid: string;
}
