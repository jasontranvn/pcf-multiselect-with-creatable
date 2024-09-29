import { IInputs, IOutputs } from './generated/ManifestTypes';
import * as React from 'react';
import MultiSelectDropdown from './components/MultiSelectDropdown';
import {
  fetchBridgeTable,
  fetchAvailableEscalationOptions,
} from './services/escalationService';
import { OptionType } from './services/types';

const getConcernComplaintId = (): string => {
  return Xrm.Page.data.entity.getId();
};

const getCurrentUserId = (): string => {
  return Xrm.Utility.getGlobalContext().userSettings.userId;
};

export class Escalation
  implements ComponentFramework.ReactControl<IInputs, IOutputs>
{
  private _notifyOutputChanged: () => void;
  private _selectedValues: OptionType[] = [];
  private _concernComplaintId: string = '';

  constructor() {}

  public async init(
    context: ComponentFramework.Context<IInputs>,
    notifyOutputChanged: () => void,
    state: ComponentFramework.Dictionary,
  ): Promise<void> {
    this._notifyOutputChanged = notifyOutputChanged;
    this._concernComplaintId = getConcernComplaintId();

    if (this._concernComplaintId) {
      try {
        const fetchedBridgeTable = await fetchBridgeTable(
          this._concernComplaintId,
        );

        // Fetch available escalations with owner details
        const availableEscalations = await fetchAvailableEscalationOptions();

        // Map bridge records to selected values with owner details
        this._selectedValues = fetchedBridgeTable.map((item) => {
          const escalation = availableEscalations.find(
            (esc) => esc.id === item._nfcu_causeofescalation_value,
          );
          return {
            id: item._nfcu_causeofescalation_value,
            label: escalation ? escalation.label : 'Unknown Escalation',
            bridgeRecordId: item.nfcu_casecauseofescalationid,
            owner: escalation ? escalation.owner : 'No Owner Assigned',
          };
        });

        this._notifyOutputChanged();
      } catch (error) {
        console.error('Error initializing the escalation component:', error);
      }
    }
  }

  private handleSelectionChange = (selectedOptions: OptionType[]): void => {
    this._selectedValues = selectedOptions;
    this._notifyOutputChanged();
  };

  public updateView(
    context: ComponentFramework.Context<IInputs>,
  ): React.ReactElement {
    return React.createElement(MultiSelectDropdown, {
      concernComplaintId: this._concernComplaintId,
      selectedValues: this._selectedValues,
      onSelectionChange: this.handleSelectionChange.bind(this),
    });
  }

  public getOutputs(): IOutputs {
    // Define what outputs you want to expose
    return {};
  }

  public destroy(): void {}
}
