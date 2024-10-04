import { BridgeRecord, BridgeRecordEntity, Tag } from './types';

export const fetchBridgeTable = async (
  concernComplaintId: string,
): Promise<BridgeRecord[]> => {
  try {
    console.log(
      `Fetching bridge records for concernComplaintId: ${concernComplaintId}`,
    );

    const query = `?$filter=_nfcu_concerncomplaint_value eq '${concernComplaintId}'&$select=nfcu_casecauseofescalationid,_nfcu_causeofescalation_value,ownerid`;
    const response = await Xrm.WebApi.retrieveMultipleRecords(
      'nfcu_casecauseofescalation',
      query,
    );

    if (!response.entities || response.entities.length === 0) {
      console.log(
        `No bridge records found for concernComplaintId: ${concernComplaintId}`,
      );
      return [];
    }

    console.log(
      `Found ${response.entities.length} bridge records for concernComplaintId: ${concernComplaintId}`,
    );

    console.log('Bridge Records:', response.entities);

    const bridgeRecords: BridgeRecord[] = response.entities.map(
      (entity: BridgeRecordEntity) => ({
        nfcu_casecauseofescalationid: entity.nfcu_casecauseofescalationid,
        _nfcu_causeofescalation_value: entity._nfcu_causeofescalation_value,
      }),
    );

    return bridgeRecords;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error fetching bridge table records:', error.message);
    } else {
      console.error('Error fetching bridge table records:', error);
    }
    return [];
  }
};

export const fetchAvailableEscalationOptions = async (): Promise<Tag[]> => {
  try {
    const teams = await fetchUserTeams();
    console.log('Using team map:', teams);
    console.log(`Fetching available escalation options...`);

    const query = `?$select=nfcu_causeofescalationid,nfcu_name,_ownerid_value`;
    const response = await Xrm.WebApi.retrieveMultipleRecords(
      'nfcu_causeofescalation',
      query,
    );

    if (!response.entities || response.entities.length === 0) {
      console.log(`No escalation options found.`);
      return [];
    }

    console.log(`Found ${response.entities.length} escalation options.`);
    console.log('Escalation Records:', response.entities);

    const tags: Tag[] = response.entities
      .filter((entity) => teams.has(entity._ownerid_value))
      .map((entity) => ({
        id: entity.nfcu_causeofescalationid,
        label: entity.nfcu_name,
        owner: teams.get(entity._ownerid_value) || 'No Team Assigned',
        bridgeRecordId: '',
      }));

    return tags;
  } catch (error) {
    if (error instanceof Error) {
      console.error(
        'Error fetching available escalation options:',
        error.message,
      );
    } else {
      console.error('Error fetching available escalation options:', error);
    }
    return [];
  }
};

export const addEscalationToBridgeTable = async (
  concernComplaintId: string,
  escalationId: string,
  escalationName: string,
  ownerId: string,
): Promise<string | null> => {
  const newRecord = {
    'nfcu_CauseofEscalation@odata.bind': `/nfcu_causeofescalations(${escalationId})`,
    'nfcu_concerncomplaint@odata.bind': `/nfcu_concerncomplaints(${concernComplaintId.replace(
      /[{}]/g,
      '',
    )})`,
    nfcu_name: escalationName,
    'ownerid@odata.bind': `/systemusers(${ownerId})`,
  };

  try {
    const result = await Xrm.WebApi.createRecord(
      'nfcu_casecauseofescalation',
      newRecord,
    );
    console.log('Record created successfully with ID:', result.id);
    return result.id;
  } catch (error) {
    console.error('Error creating record:', error);
    return null;
  }
};

export const removeEscalationFromBridgeTable = async (
  bridgeRecordId: string,
): Promise<boolean> => {
  try {
    await Xrm.WebApi.deleteRecord('nfcu_casecauseofescalation', bridgeRecordId);
    console.log('Record removed successfully with ID:', bridgeRecordId);
    return true;
  } catch (error) {
    console.error('Error removing record:', error);
    return false;
  }
};

export const getCurrentUserId = (): string => {
  const userId = Xrm.Utility.getGlobalContext().userSettings.userId;
  return userId.replace(/[{}]/g, '');
};

export const fetchUserTeams = async (): Promise<Map<string, string>> => {
  const userId = getCurrentUserId();
  const teamMap = new Map<string, string>();

  try {
    const response = await Xrm.WebApi.retrieveRecord(
      'systemuser',
      userId,
      `?$select=fullname&$expand=teammembership_association($select=name,teamid)`,
    );

    if (
      response &&
      response.teammembership_association &&
      response.teammembership_association.length > 0
    ) {
      response.teammembership_association.forEach(
        (team: { teamid: string; name: string }) => {
          console.log(`Team ID: ${team.teamid}, Team Name: ${team.name}`);
          teamMap.set(team.teamid, team.name);
        },
      );
    } else {
      console.log('User is not part of any teams.');
    }
  } catch (error) {
    console.error('Error fetching user teams:', error);
  }

  return teamMap;
};

export const fetchTagDetailsById = async (
  tags: BridgeRecord[],
): Promise<Tag[]> => {
  return Promise.all(
    tags.map(async (record) => {
      try {
        const escalationResponse = await Xrm.WebApi.retrieveRecord(
          'nfcu_causeofescalation',
          record._nfcu_causeofescalation_value,
          `?$select=nfcu_name,_ownerid_value`,
        );

        return {
          id: record._nfcu_causeofescalation_value,
          label: escalationResponse?.nfcu_name || 'Unknown Escalation',
          bridgeRecordId: record.nfcu_casecauseofescalationid, // Include the bridgeRecordId
          owner: escalationResponse?._ownerid_value || 'No Owner Assigned',
        };
      } catch (error) {
        console.error(
          `Error fetching escalation details for ID ${record._nfcu_causeofescalation_value}: Possibly deleted. Auto-removing the invalid bridge record.`,
        );

        // Auto-remove invalid bridge record since the escalation was not found
        await removeEscalationFromBridgeTable(
          record.nfcu_casecauseofescalationid,
        );

        return null; // Return null to indicate this record should be removed
      }
    }),
  ).then((results) => results.filter((tag): tag is Tag => tag !== null)); // Type assertion for filtering out nulls
};

export const updateEscalationCheckField = async (
  concernComplaintId: string,
  isChecked: boolean,
): Promise<void> => {
  try {
    const entity = {
      nfcu_causeofescalationcheck: isChecked,
    };

    // Assuming concernComplaintId is the ID of the concern complaint record
    const response = await Xrm.WebApi.updateRecord(
      'nfcu_concerncomplaint', // The name of the entity/table
      concernComplaintId,
      entity,
    );

    console.log('Successfully updated the escalation check field', response);
  } catch (error) {
    console.error('Error updating the escalation check field:', error);
    throw error;
  }
};
