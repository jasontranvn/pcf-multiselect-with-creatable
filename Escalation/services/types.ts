// types.ts

// Interface for Bridge Table Record
export interface BridgeRecord {
  nfcu_casecauseofescalationid: string;
  _nfcu_causeofescalation_value: string;
  ownerid: string; // User who picked the tag for the case
}

export interface EscalationRecord {
  nfcu_causeofescalationid: string;
  nfcu_name: string;
  _ownerid_value?: string; // Add this field, assuming it's optional
  ownerid_systemuser?: {
    // Assuming this is where the owner's full name is stored
    fullname: string;
  };
}

// Interface for Combined Tag
export interface Tag {
  id: string; // nfcu_causeofescalationid
  label: string; // nfcu_name
  owner: string; // Owner's full name from Cause of Escalation table
  bridgeRecordId: string; // nfcu_casecauseofescalationid
}

// Props definition for MultiSelectDropdown
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
