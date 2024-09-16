import * as React from 'react';
import { useState, useEffect } from 'react';
import { TagPicker, ITag } from '@fluentui/react/lib/Pickers';
import { Tag, MultiSelectDropdownProps } from '../services/types';
import {
  fetchBridgeTable,
  fetchEscalationTable,
  addEscalationToBridgeTable,
  removeEscalationFromBridgeTable,
} from '../services/escalationService';
import './MultiSelectDropdown.css';

const getCurrentUserId = (): string => {
  const userId = Xrm.Utility.getGlobalContext().userSettings.userId;
  return userId.replace(/[{}]/g, '');
};

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  concernComplaintId,
  selectedValues,
  onSelectionChange,
}) => {
  const [selected, setSelected] = useState<Tag[]>(selectedValues);
  const [availableOptions, setAvailableOptions] = useState<ITag[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const fetchedSelectedTags = await fetchBridgeTable(concernComplaintId);
        setSelected(fetchedSelectedTags);

        const fetchedEscalations = await fetchEscalationTable();
        const escalationTags = fetchedEscalations.map((item) => ({
          key: item.id,
          name: item.label,
        }));
        setAvailableOptions(escalationTags);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [concernComplaintId]);

  const onChange = async (items?: ITag[]) => {
    const selectedItems = items || [];
    const updatedSelection = selectedItems.map((item) => ({
      id: item.key as string,
      label: item.name,
    }));

    const userId = getCurrentUserId();
    const uniqueEscalations = new Set<string>();

    for (const item of updatedSelection) {
      const isAlreadySelected = selected.some(
        (selectedItem) =>
          selectedItem.id === item.id || selectedItem.label === item.label,
      );
      if (!isAlreadySelected && !uniqueEscalations.has(item.label)) {
        uniqueEscalations.add(item.label);

        console.log(`Adding escalation: ${item.label}`);
        await addEscalationToBridgeTable(
          concernComplaintId,
          item.id,
          item.label,
          userId,
        );

        setSelected((prevSelected) => [...prevSelected, item]);
      }
    }

    for (const item of selected) {
      const isRemoved = !updatedSelection.some(
        (updatedItem) => updatedItem.id === item.id,
      );
      if (isRemoved) {
        console.log(`Removing escalation: ${item.label}`);
        const bridgeRecord = selected.find(
          (selectedItem) => selectedItem.id === item.id,
        );
        if (bridgeRecord && bridgeRecord.bridgeRecordId) {
          await removeEscalationFromBridgeTable(bridgeRecord.bridgeRecordId);

          setSelected((prevSelected) =>
            prevSelected.filter((selectedItem) => selectedItem.id !== item.id),
          );
        }
      }
    }

    onSelectionChange(updatedSelection);
  };

  return (
    <div className="multi-select-dropdown">
      <TagPicker
        selectedItems={selected.map((item) => ({
          key: item.id,
          name: item.label,
        }))}
        onChange={onChange}
        pickerSuggestionsProps={{
          suggestionsHeaderText: 'Suggested escalations',
          noResultsFoundText: 'No escalations found',
        }}
        itemLimit={10}
        inputProps={{
          placeholder: 'Select escalations',
          style: { width: '100%' },
        }}
        styles={{
          root: { width: '100%' },
        }}
        onResolveSuggestions={(filterText: string) =>
          availableOptions.filter((tag) =>
            tag.name.toLowerCase().includes(filterText.toLowerCase()),
          )
        }
      />
    </div>
  );
};

export default MultiSelectDropdown;
