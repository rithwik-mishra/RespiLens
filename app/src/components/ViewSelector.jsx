import { useMemo, useState, useEffect } from 'react';
import { Stack, Button, Paper, Text, Divider, Accordion } from '@mantine/core';
import { IconChevronRight, IconChevronDown } from '@tabler/icons-react';
import { useView } from '../hooks/useView';
import { DATASETS, VIEW_SELECTOR_GROUPS } from '../config';

const ViewSelector = () => {
  const { viewType, setViewType } = useView();
  const [openedAccordion, setOpenedAccordion] = useState(null);

  const groupedDatasets = useMemo(() => {
    return VIEW_SELECTOR_GROUPS.map((group) => ({
      ...group,
      datasetObjects: group.datasets
        .map((key) => DATASETS[key])
        .filter(Boolean)
    }));
  }, []);

  const getDefaultDatasetView = (dataset) => {
    return dataset.defaultView || dataset.views[0]?.value;
  };

  const handleDatasetSelect = (dataset) => {
    const targetView = getDefaultDatasetView(dataset);
    if (targetView) {
      setViewType(targetView);
    }
  };

  const handleViewSelect = (value) => {
    setViewType(value);
  };

  useEffect(() => {
    const activeDataset = Object.values(DATASETS).find(dataset =>
      dataset.views.some(view => view.value === viewType)
    );

    if (activeDataset && activeDataset.views.length > 1) {
      setOpenedAccordion(activeDataset.shortName);
    } else {
      setOpenedAccordion(null);
    }
  }, [viewType]);

  const renderDatasetButton = (dataset, isLastInGroup) => {
    const isActive = dataset.views.some((view) => view.value === viewType);
    const hasMultipleViews = dataset.views.length > 1;

    if (!hasMultipleViews) {
      return (
        <Button
          key={dataset.shortName}
          variant={isActive ? 'light' : 'subtle'}
          color={isActive ? 'blue' : 'gray'}
          size="sm"
          rightSection={<IconChevronRight size={14} />}
          radius={0}
          fullWidth
          onClick={() => handleDatasetSelect(dataset)}
          styles={{
            root: {
              height: 36,
              borderBottom: isLastInGroup
                ? 'none'
                : '1px solid var(--mantine-color-gray-3)'
            },
            inner: {
              width: '100%',
              justifyContent: 'space-between'
            },
            label: {
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }
          }}
        >
          {dataset.selectorLabel || dataset.fullName}
        </Button>
      );
    }

    return (
      <Accordion
        value={openedAccordion}
        onChange={setOpenedAccordion}
        key={dataset.shortName}
        variant="contained"
        radius={0}
        chevronPosition="right"
        styles={{
          item: {
            border: 'none'
          },
          control: {
            padding: 0,
            minHeight: 36,
            borderBottom: isLastInGroup
              ? 'none'
              : '1px solid var(--mantine-color-gray-3)'
          },
          label: {
            padding: 0
          },
          content: {
            padding: 0
          },
          panel: {
            padding: 0
          },
          chevron: {
            display: 'none'
          }
        }}
      >
        <Accordion.Item value={dataset.shortName}>
          <Accordion.Control>
            <Button
              variant={isActive ? 'light' : 'subtle'}
              color={isActive ? 'blue' : 'gray'}
              size="sm"
              rightSection={<IconChevronDown size={14} />}
              radius={0}
              fullWidth
              onClick={(e) => e.preventDefault()}
              styles={{
                root: {
                  height: 36
                },
                inner: {
                  width: '100%',
                  justifyContent: 'space-between'
                },
                label: {
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }
              }}
            >
              {dataset.selectorLabel || dataset.fullName}
            </Button>
          </Accordion.Control>

          <Accordion.Panel>
            <Stack gap={0} w="100%">
              {dataset.views.map((view, index) => {
                const isViewActive = view.value === viewType;
                const isLastView = index === dataset.views.length - 1;

                return (
                  <Button
                    key={view.value}
                    variant={isViewActive ? 'light' : 'subtle'}
                    color={isViewActive ? 'blue' : 'gray'}
                    size="sm"
                    fullWidth
                    justify="start"
                    radius={0}
                    onClick={() => handleViewSelect(view.value)}
                    styles={{
                      root: {
                        height: 34,
                        paddingLeft: 24,
                        borderTop: '1px solid var(--mantine-color-gray-2)',
                        borderBottom:
                          isLastInGroup && isLastView ? 'none' : undefined
                      },
                      label: {
                        width: '100%',
                        textAlign: 'left'
                      }
                    }}
                  >
                    {view.label}
                  </Button>
                );
              })}
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    );
  };

  return (
    <Stack gap="xs" w="100%">
      {groupedDatasets.map((group, groupIndex) => (
        <div key={groupIndex} style={{ width: '100%' }}>
          {group.title && (
            <Text fw={700} size="sm" mb="xs">
              {group.title}
            </Text>
          )}

          <Paper shadow="sm" radius="md" withBorder style={{ width: '100%' }}>
            <Stack gap={0} w="100%">
              {group.datasetObjects.map((dataset, index) =>
                renderDatasetButton(
                  dataset,
                  index === group.datasetObjects.length - 1
                )
              )}
            </Stack>
          </Paper>

          {group.title === 'Forecasts' && <div style={{ height: 8 }} />}
          {group.title === null && <Divider my="xs" />}
        </div>
      ))}
    </Stack>
  );
};

export default ViewSelector;