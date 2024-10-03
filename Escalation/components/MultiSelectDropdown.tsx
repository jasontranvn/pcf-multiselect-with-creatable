import * as React from 'react';
import { useState, useEffect } from 'react';
import { TagPicker, ITag, IBasePicker } from '@fluentui/react/lib/Pickers';
import { IconButton } from '@fluentui/react/lib/Button';
import './MultiSelectDropdown.css';
import {
  fetchBridgeTable,
  fetchAvailableEscalationOptions,
  addEscalationToBridgeTable, // Make sure this is exported
  removeEscalationFromBridgeTable, // Make sure this is exported
  getCurrentUserId,
} from '../services/escalationService';
import { OptionType, MultiSelectDropdownProps } from '../services/types';

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  concernComplaintId,
  selectedValues,
  onSelectionChange,
}) => {
  const [selected, setSelected] = useState<OptionType[]>(selectedValues);
  const [availableOptions, setAvailableOptions] = useState<OptionType[]>([]);
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [pickerKey, setPickerKey] = useState(0);
  const tagPickerRef = React.useRef<IBasePicker<ITag> | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [calloutWidth, setCalloutWidth] = useState<number | undefined>(
    undefined,
  );
  const [tagsNotOwned, setTagsNotOwned] = useState<Set<string>>(new Set()); // <-- Define tagsNotOwned here

  useEffect(() => {
    const fetchData = async () => {
      try {
        const fetchedBridgeRecords = await fetchBridgeTable(concernComplaintId);
        const fetchedEscalations = await fetchAvailableEscalationOptions();

        console.log('Bridge Records:', fetchedBridgeRecords);
        console.log('Escalation Options:', fetchedEscalations);

        // Create a set of escalation IDs from available escalations (owned by the user's teams)
        const fetchedEscalationIds = new Set(
          fetchedEscalations.map((esc) => esc.id),
        );

        // Find the difference: tags in the bridge records not owned by user's teams
        const tagsNotOwned = fetchedBridgeRecords.filter(
          (record) =>
            !fetchedEscalationIds.has(record._nfcu_causeofescalation_value),
        );

        setTagsNotOwned(
          new Set(tagsNotOwned.map((tag) => tag._nfcu_causeofescalation_value)),
        );

        // Fetch label for tags in tagsNotOwned directly using API calls
        const fetchedMissingTags = await Promise.all(
          tagsNotOwned.map(async (record) => {
            try {
              const escalationResponse = await Xrm.WebApi.retrieveRecord(
                'nfcu_causeofescalation',
                record._nfcu_causeofescalation_value,
                `?$select=nfcu_name,_ownerid_value`,
              );

              return {
                id: record._nfcu_causeofescalation_value,
                label: escalationResponse
                  ? escalationResponse.nfcu_name
                  : 'Unknown Escalation',
                bridgeRecordId: record.nfcu_casecauseofescalationid,
                owner: escalationResponse
                  ? escalationResponse._ownerid_value
                  : 'No Owner Assigned',
              };
            } catch (error) {
              console.error(
                `Error fetching escalation details for ID ${record._nfcu_causeofescalation_value}:`,
                error,
              );
              return {
                id: record._nfcu_causeofescalation_value,
                label: 'Unknown Escalation',
                bridgeRecordId: record.nfcu_casecauseofescalationid,
                owner: 'No Owner Assigned',
              };
            }
          }),
        );

        // Map all selected tags (whether owned or not)
        const mappedSelected = fetchedBridgeRecords.map((record) => {
          // Check if it's owned by the user's team
          const escalation = fetchedEscalations.find(
            (esc) => esc.id === record._nfcu_causeofescalation_value,
          );

          if (escalation) {
            return {
              id: escalation.id,
              label: escalation.label,
              bridgeRecordId: record.nfcu_casecauseofescalationid,
              owner: escalation.owner,
            };
          } else {
            const missingTag = fetchedMissingTags.find(
              (tag) => tag.id === record._nfcu_causeofescalation_value,
            );
            return (
              missingTag || {
                id: record._nfcu_causeofescalation_value,
                label: 'Unknown Escalation',
                bridgeRecordId: record.nfcu_casecauseofescalationid,
                owner: 'No Owner Assigned',
              }
            );
          }
        });

        setSelected(mappedSelected);

        // Filter out selected tags from available options
        const selectedIds = new Set(mappedSelected.map((item) => item.id));
        const available = fetchedEscalations.filter(
          (option) => !selectedIds.has(option.id),
        );
        setAvailableOptions(available);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [concernComplaintId]);

  useEffect(() => {
    const updateCalloutWidth = () => {
      if (containerRef.current) {
        setCalloutWidth(containerRef.current.clientWidth);
      }
    };

    updateCalloutWidth();
    window.addEventListener('resize', updateCalloutWidth);

    return () => {
      window.removeEventListener('resize', updateCalloutWidth);
    };
  }, []);

  const handleChange = async (items?: ITag[]) => {
    if (!items) return;

    const selectedItems = items.map((item) => ({
      id: item.key as string,
      label: item.name,
    }));

    const userId = getCurrentUserId();
    const selectedIds = new Set(selectedItems.map((item) => item.id));

    // Determine which items were added or removed
    const previousSelectedIds = new Set(selected.map((item) => item.id));
    const added = selectedItems.filter(
      (item) => !previousSelectedIds.has(item.id),
    );
    const removed = selected.filter((item) => !selectedIds.has(item.id));

    // Handle added items
    for (const item of added) {
      const escalation = availableOptions.find((esc) => esc.id === item.id);
      if (escalation) {
        try {
          const newBridgeRecordId = await addEscalationToBridgeTable(
            concernComplaintId,
            item.id,
            escalation.label, // Pass the label as escalationName
            userId, // Pass the current user's ID as ownerId
          );

          // If a valid bridge record ID is returned, update the selected state
          if (newBridgeRecordId) {
            setSelected((prev) => [
              ...prev,
              {
                id: escalation.id,
                label: escalation.label,
                bridgeRecordId: newBridgeRecordId,
                owner: escalation.owner,
              },
            ]);

            // Remove the added option from availableOptions
            setAvailableOptions((prev) =>
              prev.filter((option) => option.id !== escalation.id),
            );
          }
        } catch (error) {
          console.error('Error adding escalation:', error);
        }
      }
    }

    for (const item of removed) {
      if (item.bridgeRecordId) {
        try {
          const success = await removeEscalationFromBridgeTable(
            item.bridgeRecordId,
          );

          // Check if the record was successfully removed
          if (success) {
            setSelected((prev) =>
              prev.filter((selectedItem) => selectedItem.id !== item.id),
            );

            const isNotOwnedTag = tagsNotOwned.has(item.id); // Check if the removed tag is in the not owned set
            if (isNotOwnedTag) {
              console.log(
                `Tag ${item.id} is not owned by the user's team and will not be re-added.`,
              );
            } else {
              setAvailableOptions((prev) => [
                ...prev,
                {
                  id: item.id,
                  label: item.label,
                  owner: item.owner,
                },
              ]);
            }
          }
        } catch (error) {
          console.error('Error removing escalation:', error);
        }
      }
    }

    // Trigger onSelectionChange with the updated selected items
    onSelectionChange(
      selectedItems.map((item) => ({
        id: item.id,
        label: item.label,
        bridgeRecordId: selected.find(
          (selectedItem) => selectedItem.id === item.id,
        )?.bridgeRecordId,
        owner: selected.find((selectedItem) => selectedItem.id === item.id)
          ?.owner,
      })),
    );
  };

  const showAllOptions = () => {
    setShowAllSuggestions((prev) => !prev);
    setPickerKey((prev) => prev + 1);
    if (showAllSuggestions) {
      setInputValue('');
    } else {
      setTimeout(() => {
        tagPickerRef.current?.focus();
      }, 0);
    }
  };

  const getSuggestions = (filterText: string): ITag[] => {
    let suggestions = availableOptions.map((option) => ({
      key: option.id,
      name: option.label,
    }));

    if (filterText) {
      suggestions = suggestions.filter((tag) =>
        tag.name.toLowerCase().includes(filterText.toLowerCase()),
      );
    } else if (!showAllSuggestions) {
      suggestions = [];
    }

    return suggestions;
  };

  const onEmptyInputFocus = (): ITag[] => {
    if (showAllSuggestions) {
      return availableOptions.map((option) => ({
        key: option.id,
        name: option.label,
      }));
    }
    return [];
  };

  const renderSuggestion = (item: ITag): JSX.Element => {
    const escalation = availableOptions.find(
      (option) => option.id === item.key,
    );
    return (
      <div
        style={{
          padding: '5px 10px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ fontSize: '14px', textAlign: 'left' }}>
          {escalation?.label}
        </div>
        <div style={{ fontSize: '12px', textAlign: 'left', color: 'gray' }}>
          {escalation?.owner}
        </div>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className="multi-select-dropdown"
      style={{ position: 'relative' }}
    >
      <TagPicker
        key={pickerKey}
        componentRef={tagPickerRef}
        selectedItems={selected.map((item) => ({
          key: item.id,
          name: item.label,
        }))}
        onChange={handleChange}
        pickerSuggestionsProps={{
          suggestionsHeaderText: 'Suggested escalations',
          noResultsFoundText: 'No escalations found',
        }}
        itemLimit={10}
        inputProps={{
          placeholder: 'Select escalations',
          style: { width: '100%' },
          value: inputValue,
          onChange: (
            event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>,
            newValue?: string,
          ) => {
            setInputValue(newValue || '');
            if (newValue && newValue.length > 0) {
              setShowAllSuggestions(false);
            }
          },
        }}
        styles={{
          root: { width: '100%' },
        }}
        pickerCalloutProps={{
          calloutWidth: calloutWidth,
        }}
        onResolveSuggestions={getSuggestions}
        onEmptyInputFocus={onEmptyInputFocus}
        onRenderSuggestionsItem={renderSuggestion}
      />
      <IconButton
        iconProps={{
          iconName: showAllSuggestions ? 'ChevronUp' : 'ChevronDown',
        }}
        title="Toggle options"
        ariaLabel="Toggle options"
        onClick={showAllOptions}
        styles={{
          root: {
            position: 'absolute',
            right: 0,
            top: 0,
            backgroundColor: 'transparent',
            border: 'none',
            padding: 0,
            height: '100%',
          },
          rootHovered: {
            backgroundColor: 'transparent',
          },
          rootPressed: {
            backgroundColor: 'transparent',
          },
          icon: {
            color: 'gray',
          },
        }}
      />
    </div>
  );
};

export default MultiSelectDropdown;
