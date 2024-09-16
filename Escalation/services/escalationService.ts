import { CaseCauseOfEscalationRecord, EscalationRecord, Tag } from './types';

export const fetchBridgeTable = async (
  concernComplaintId: string,
): Promise<Tag[]> => {
  try {
    const response = await Xrm.WebApi.retrieveMultipleRecords(
      'nfcu_casecauseofescalation',
      `?$filter=_nfcu_concerncomplaint_value eq '${concernComplaintId}'&$select=nfcu_casecauseofescalationid,_nfcu_causeofescalation_value`,
    );

    const bridgeRecords = response.entities;

    if (!bridgeRecords || bridgeRecords.length === 0) {
      console.log('No bridge records found.');
      return [];
    }

    const uniqueEscalations = new Set<string>();
    const escalationTags: Tag[] = [];

    for (const record of bridgeRecords) {
      const escalationId = record._nfcu_causeofescalation_value;
      const bridgeRecordId = record.nfcu_casecauseofescalationid;

      const escalationResponse = await Xrm.WebApi.retrieveRecord(
        'nfcu_causeofescalation',
        escalationId,
        '?$select=nfcu_name',
      );

      const escalationLabel = escalationResponse?.nfcu_name;

      if (escalationLabel && !uniqueEscalations.has(escalationLabel)) {
        uniqueEscalations.add(escalationLabel);
        escalationTags.push({
          id: escalationId,
          label: escalationLabel,
          bridgeRecordId: bridgeRecordId,
        });
      }
    }

    return escalationTags;
  } catch (error) {
    console.error('Error fetching bridge table records:', error);
    return [];
  }
};

export const fetchEscalationTable = async (): Promise<Tag[]> => {
  try {
    const response = await Xrm.WebApi.retrieveMultipleRecords(
      'nfcu_causeofescalation',
      `?$select=nfcu_causeofescalationid,nfcu_name`,
    );

    return response.entities.map((item: EscalationRecord) => ({
      id: item.nfcu_causeofescalationid,
      label: item.nfcu_name,
    }));
  } catch (error) {
    console.error('Error fetching escalation options:', error);
    return [];
  }
};

export const addEscalationToBridgeTable = async (
  concernComplaintId: string,
  escalationId: string,
  escalationName: string,
  ownerId: string,
): Promise<void> => {
  const newRecord = {
    'nfcu_CauseofEscalation@odata.bind': `/nfcu_causeofescalations(${escalationId})`,
    'nfcu_concerncomplaint@odata.bind': `/nfcu_concerncomplaints(${concernComplaintId.replace(
      /{|}/g,
      '',
    )})`,
    nfcu_name: escalationName,
    'ownerid@odata.bind': `/systemusers(${ownerId.replace(/{|}/g, '')})`,
  };

  try {
    const result = await Xrm.WebApi.createRecord(
      'nfcu_casecauseofescalation',
      newRecord,
    );
    console.log('Record created successfully with ID:', result.id);
  } catch (error) {
    console.error('Error creating record:', error);
  }
};

export const removeEscalationFromBridgeTable = async (
  bridgeRecordId: string,
): Promise<void> => {
  if (!bridgeRecordId || !bridgeRecordId.match(/^[0-9a-fA-F-]{36}$/)) {
    console.error(
      `Bridge record ID is invalid or undefined. Received ID: ${bridgeRecordId}`,
    );
    return;
  }

  try {
    await Xrm.WebApi.deleteRecord('nfcu_casecauseofescalation', bridgeRecordId);
    console.log('Record removed successfully with ID:', bridgeRecordId);
  } catch (error) {
    console.error(
      `Error removing escalation with ID ${bridgeRecordId}:`,
      error,
    );
  }
};
