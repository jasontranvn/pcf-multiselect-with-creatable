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
        ownerid: entity.ownerid,
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

/**
 * Fetches all available escalation options and returns only those owned by teams the user belongs to.
 * @param teamMap Map of team IDs and their corresponding names.
 * @returns Promise<Tag[]> An array of tags representing the escalation options.
 */
export const fetchAvailableEscalationOptions = async (): Promise<Tag[]> => {
  try {
    const teams = await fetchUserTeams(); // Ensure teams are fetched globally
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

    const tags: Tag[] = [];

    for (const entity of response.entities) {
      console.log(`Escalation Name (nfcu_name): ${entity.nfcu_name}`);
      console.log(
        'Escalation Owner ID (_ownerid_value):',
        entity._ownerid_value,
      );

      if (teams.has(entity._ownerid_value)) {
        const teamName = teams.get(entity._ownerid_value);
        console.log(
          `Escalation owned by user's team: ${teamName} (Team ID: ${entity._ownerid_value})`,
        );

        tags.push({
          id: entity.nfcu_causeofescalationid,
          label: entity.nfcu_name,
          owner: teamName || 'No Team Assigned',
          bridgeRecordId: '', // Not applicable for available options
        });
      } else {
        console.log(
          `Escalation owned by a team outside the user's teams: ${entity._ownerid_value}`,
        );
      }
    }

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

/**
 * Fetches the teams the current user is a part of and returns a Map of team ID and team name using Xrm.WebApi.
 * @returns Promise<Map<string, string>> A map where the key is the team ID and the value is the team name.
 */
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
