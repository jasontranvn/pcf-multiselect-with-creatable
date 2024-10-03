// Interface for Bridge Table Record
export interface BridgeRecord {
  nfcu_casecauseofescalationid: string;
  _nfcu_causeofescalation_value: string;
  ownerid: string; // User or team who picked the tag for the case
}

export interface EscalationRecord {
  nfcu_causeofescalationid: string;
  nfcu_name: string;
  _ownerid_value?: string; // Owner ID (team or user)
  ownerid_systemuser?: {
    // This is where the user's full name would be stored if the owner was a user
    fullname: string;
  };
  ownerid_team?: {
    // This is where the team name is stored if the owner is a team
    name: string;
  };
}

// Interface for Combined Tag
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

// Entity structure for bridge record in Dynamics
export interface BridgeRecordEntity {
  nfcu_casecauseofescalationid: string;
  _nfcu_causeofescalation_value: string;
  ownerid: string; // Owner ID (team or user)
}
