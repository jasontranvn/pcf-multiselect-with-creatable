import {
  BridgeRecord,
  BridgeRecordEntity,
  EscalationRecord,
  Tag,
} from './types';

/**
 * Fetches bridge table records for a given concernComplaintId.
 * @param concernComplaintId The ID of the concern complaint.
 * @returns Promise resolving to an array of BridgeRecord.
 */
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

    const bridgeRecords: BridgeRecord[] = response.entities.map(
      (entity: BridgeRecordEntity) => ({
        nfcu_casecauseofescalationid: entity.nfcu_casecauseofescalationid,
        _nfcu_causeofescalation_value: entity._nfcu_causeofescalation_value,
        ownerid: entity.ownerid, // User who picked the tag for the case
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

export const fetchEscalationDetails = async (
  escalationId: string,
): Promise<EscalationRecord | null> => {
  try {
    console.log(
      `Fetching escalation details for escalationId: ${escalationId}`,
    );

    // First, fetch escalation details, including the ownerid
    const escalationResponse = await Xrm.WebApi.retrieveRecord(
      'nfcu_causeofescalation',
      escalationId,
      `?$select=nfcu_name,_ownerid_value`,
    );

    if (!escalationResponse || !escalationResponse.nfcu_name) {
      console.log(`No escalation found for escalationId: ${escalationId}`);
      return null;
    }

    console.log(`Escalation found: ${escalationResponse.nfcu_name}`);

    const escalationRecord: EscalationRecord = {
      nfcu_causeofescalationid: escalationResponse.nfcu_causeofescalationid,
      nfcu_name: escalationResponse.nfcu_name,
      _ownerid_value: escalationResponse._ownerid_value,
    };

    // Now, fetch the owner's details (fullname) from the systemuser table
    if (escalationRecord._ownerid_value) {
      console.log(
        `Fetching owner details for ownerid: ${escalationRecord._ownerid_value}`,
      );

      const ownerResponse = await Xrm.WebApi.retrieveRecord(
        'systemuser',
        escalationRecord._ownerid_value,
        `?$select=fullname`,
      );

      if (!ownerResponse || !ownerResponse.fullname) {
        console.log(
          `No owner found for ownerid: ${escalationRecord._ownerid_value}`,
        );
      } else {
        console.log(`Owner found: ${ownerResponse.fullname}`);
        escalationRecord.ownerid_systemuser = {
          fullname: ownerResponse.fullname,
        };
      }
    }

    return escalationRecord;
  } catch (error) {
    if (error instanceof Error) {
      console.error(
        `Error fetching escalation details for ID ${escalationId}:`,
        error.message,
      );
    } else {
      console.error(
        `Error fetching escalation details for ID ${escalationId}:`,
        error,
      );
    }
    return null;
  }
};

/**
 * Combines bridge records with escalation details to create Tag objects.
 * @param concernComplaintId The ID of the concern complaint.
 * @returns Promise resolving to an array of Tag.
 */
export const fetchEscalationTags = async (
  concernComplaintId: string,
): Promise<Tag[]> => {
  try {
    console.log(
      `Fetching escalation tags for concernComplaintId: ${concernComplaintId}`,
    );

    const bridgeRecords = await fetchBridgeTable(concernComplaintId);

    if (bridgeRecords.length === 0) {
      console.log(
        `No bridge records found for concernComplaintId: ${concernComplaintId}`,
      );
      return [];
    }

    const tags: Tag[] = [];

    for (const record of bridgeRecords) {
      console.log(
        `Fetching escalation details for causeofescalation value: ${record._nfcu_causeofescalation_value}`,
      );
      const escalation = await fetchEscalationDetails(
        record._nfcu_causeofescalation_value,
      );

      if (escalation) {
        console.log(
          `Escalation details found: ${escalation.nfcu_name}, Owner: ${escalation.ownerid_systemuser?.fullname}`,
        );
        tags.push({
          id: escalation.nfcu_causeofescalationid,
          label: escalation.nfcu_name,
          owner: escalation.ownerid_systemuser?.fullname || 'No Owner Assigned',
          bridgeRecordId: record.nfcu_casecauseofescalationid,
        });
      } else {
        console.log(
          `No escalation details found for escalationId: ${record._nfcu_causeofescalation_value}`,
        );
      }
    }

    return tags;
  } catch (error) {
    console.error('Error fetching escalation tags:', error);
    return [];
  }
};

/**
 * Fetches all escalation options with owner details.
 * @returns Promise resolving to an array of Tag.
 */
export const fetchAvailableEscalationOptions = async (): Promise<Tag[]> => {
  try {
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

    const tags: Tag[] = [];

    for (const entity of response.entities) {
      console.log(
        `Fetching owner details for ownerid: ${entity._ownerid_value}`,
      );

      // Fetch the owner fullname from systemuser table
      const ownerResponse = await Xrm.WebApi.retrieveRecord(
        'systemuser',
        entity._ownerid_value,
        `?$select=fullname`,
      );

      if (!ownerResponse || !ownerResponse.fullname) {
        console.log(`No owner found for ownerid: ${entity._ownerid_value}`);
      } else {
        console.log(`Owner found: ${ownerResponse.fullname}`);
      }

      tags.push({
        id: entity.nfcu_causeofescalationid,
        label: entity.nfcu_name,
        owner: ownerResponse?.fullname || 'No Owner Assigned',
        bridgeRecordId: '', // Not applicable for available options
      });
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

/**
 * Retrieves the current user's ID without curly braces.
 */
export const getCurrentUserId = (): string => {
  const userId = Xrm.Utility.getGlobalContext().userSettings.userId;
  return userId.replace(/[{}]/g, '');
};
