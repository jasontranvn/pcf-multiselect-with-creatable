import { IInputs, IOutputs } from './generated/ManifestTypes';
import * as React from 'react';
import MultiSelectDropdown from './components/MultiSelectDropdown';
import {
  fetchBridgeTable,
  fetchEscalationTable,
  addEscalationToBridgeTable,
  removeEscalationFromBridgeTable,
} from './services/escalationService';

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
  private _selectedValues: {
    id: string;
    label: string;
    bridgeRecordId?: string;
  }[] = [];
  private _bridgeTableState: {
    id: string;
    label: string;
    bridgeRecordId: string;
  }[] = [];
  private _concernComplaintId: string = '';
  private _addedSet: Set<string> = new Set();

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
        const fetchedBridgeTable =
          (await fetchBridgeTable(this._concernComplaintId)) || [];

        const uniqueEscalations = new Set<string>();

        this._bridgeTableState = fetchedBridgeTable
          .filter((item) => {
            const isUnique = !uniqueEscalations.has(item.label);
            uniqueEscalations.add(item.label);
            return isUnique;
          })
          .map((item) => ({
            id: item.id,
            label: item.label,
            bridgeRecordId: item.bridgeRecordId || '',
          }));

        this._selectedValues = [...this._bridgeTableState];
        this._notifyOutputChanged();
      } catch (error) {
        console.error('Error initializing the escalation component:', error);
      }
    }
  }

  private handleSelectionChange = async (
    selectedOptions: { id: string; label: string }[],
  ): Promise<void> => {
    const addedOptions = selectedOptions.filter(
      (option) =>
        !this._bridgeTableState.some((record) => record.id === option.id),
    );
    const removedOptions = this._bridgeTableState.filter(
      (record) => !selectedOptions.some((option) => option.id === record.id),
    );

    const userId = getCurrentUserId();

    for (const option of addedOptions) {
      if (!this._addedSet.has(option.id)) {
        this._addedSet.add(option.id);
        console.log(`Adding Escalation: ${option.label}`);
        await addEscalationToBridgeTable(
          this._concernComplaintId,
          option.id,
          option.label,
          userId,
        );
        this._bridgeTableState.push({
          id: option.id,
          label: option.label,
          bridgeRecordId: '',
        });
        this._addedSet.delete(option.id);
      }
    }

    for (const option of removedOptions) {
      const bridgeRecord = this._bridgeTableState.find(
        (record) => record.id === option.id,
      );
      if (bridgeRecord && bridgeRecord.bridgeRecordId) {
        console.log(`Removing Escalation: ${option.label}`);
        await removeEscalationFromBridgeTable(bridgeRecord.bridgeRecordId);
        this._bridgeTableState = this._bridgeTableState.filter(
          (record) => record.id !== option.id,
        );
      }
    }

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
    return {};
  }

  public destroy(): void {}
}
