import { useState, useCallback, useEffect, useMemo } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { URLParameterManager } from '../utils/urlManager';
import { useForecastData } from '../hooks/useForecastData';
import { ViewContext } from './ViewContextObject';
import { APP_CONFIG } from '../config';

// Metrocast state codes
const METROCAST_STATE_CODES = new Set(['CO', 'GA', 'IN', 'ME', 'MD', 'MA', 'MN', 'SC', 'TX', 'UT', 'VA', 'NC', 'OR']);

// Map city abbreviations to state codes for cities without state info in metadata
const CITY_TO_STATE_MAP = {
  'nyc': 'NY'
};

export const ViewProvider = ({ children }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const isForecastPage = location.pathname === '/';

  const urlManager = useMemo(() => new URLParameterManager(searchParams, setSearchParams), [searchParams, setSearchParams]);

  const [viewType, setViewTypeState] = useState(() => urlManager.getView());
  const [selectedLocation, setSelectedLocation] = useState(() => {
    const urlLoc = urlManager.getLocation(); 
    const currentView = urlManager.getView();
    const dataset = urlManager.getDatasetFromView(currentView);
    if (dataset?.defaultLocation && urlLoc === APP_CONFIG.defaultLocation) {
      return dataset.defaultLocation;
    }
    
    return urlLoc;
  });
  const [selectedModels, setSelectedModels] = useState([]);
  const [selectedDates, setSelectedDates] = useState([]);
  const [activeDate, setActiveDate] = useState(null);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [chartScale, setChartScale] = useState(() => urlManager.getAdvancedParams().chartScale);
  const [intervalVisibility, setIntervalVisibility] = useState(() => urlManager.getAdvancedParams().intervalVisibility);
  const [showLegend, setShowLegend] = useState(() => urlManager.getAdvancedParams().showLegend);
  const CURRENT_FLU_SEASON_START = '2025-11-01'; // !! CRITICAL !!: need to change this manually based on the season (for flu peak view)

  const { data, metadata, loading, error, availableDates, models, availableTargets, modelsByTarget, peaks, availablePeakDates, availablePeakModels } = useForecastData(selectedLocation, viewType);

  // filter flu_peak dates based on current season
  const availableDatesToExpose = useMemo(() => {
    if (viewType === 'flu_peak') {
      return (availablePeakDates || []).filter(date => date >= CURRENT_FLU_SEASON_START);
    }
    return availableDates || [];
  }, [viewType, availablePeakDates, availableDates]);
  
  const updateDatasetParams = useCallback((params) => {
    const currentDataset = urlManager.getDatasetFromView(viewType);
    if (currentDataset) urlManager.updateDatasetParams(currentDataset, params);
  }, [viewType, urlManager]);

  const modelsForView = useMemo(() => {
    if (viewType === 'fludetailed') {
      const target1Models = new Set(modelsByTarget['wk inc flu hosp'] || []);
      const target2Models = new Set(modelsByTarget['wk flu hosp rate change'] || []);
      return Array.from(new Set([...target1Models, ...target2Models])).sort();
    }

    if (viewType === 'flu_peak') {
      return availablePeakModels || [];
    }

    if (selectedTarget && modelsByTarget[selectedTarget]) {
      return modelsByTarget[selectedTarget];
    }

    return []; 
  }, [selectedTarget, modelsByTarget, viewType, availablePeakModels]); 

  const availableTargetsToExpose = useMemo(() => {
    if (viewType === 'flu_peak') {
      return [];
    }
    
    const peakTargets = ['peak inc flu hosp', 'peak week inc flu hosp'];
    
    return availableTargets.filter(target => !peakTargets.includes(target));
  }, [availableTargets, viewType]);


  useEffect(() => {
    if (!isForecastPage) {
      return;
    }
    const currentDataset = urlManager.getDatasetFromView(viewType);
    if (loading || !currentDataset || modelsForView.length === 0 || availableDatesToExpose.length === 0 || availableTargets.length === 0) {
      return;
    }

    const params = urlManager.getDatasetParams(currentDataset);
    let needsModelUrlUpdate = false;

    let modelsToSet = [];
    const validUrlModels = params.models?.filter(m => modelsForView.includes(m)) || []; 
    if (validUrlModels.length > 0) {
        modelsToSet = validUrlModels;
    } else if (currentDataset.defaultModel && modelsForView.includes(currentDataset.defaultModel)) {
        modelsToSet = [currentDataset.defaultModel];
        needsModelUrlUpdate = true; 
    } else if (modelsForView.length > 0) {
        modelsToSet = [modelsForView[0]]; 
        needsModelUrlUpdate = true; 
    }

    let datesToSet = [];
    const validUrlDates = params.dates?.filter(date => availableDatesToExpose.includes(date)) || [];
    if (validUrlDates.length > 0) {
      datesToSet = validUrlDates;
    } else {
      const latestDate = availableDatesToExpose[availableDatesToExpose.length - 1];
      if (latestDate) {
        datesToSet = [latestDate];
      }
    }

    const urlTarget = params.target;
    let targetToSet = null;
    if (urlTarget && availableTargets.includes(urlTarget)) {
        targetToSet = urlTarget;
    }

    setSelectedModels(current => JSON.stringify(current) !== JSON.stringify(modelsToSet) ? modelsToSet : current);
    setSelectedDates(current => JSON.stringify(current) !== JSON.stringify(datesToSet) ? datesToSet : current);
    setActiveDate(currentActive => {
      if (currentActive && datesToSet.includes(currentActive)) {
        return currentActive;
      }
      return datesToSet.length > 0 ? datesToSet[datesToSet.length - 1] : null;
    });

    if (targetToSet && targetToSet !== selectedTarget) {
      setSelectedTarget(targetToSet);
    }

    if (needsModelUrlUpdate) {
      updateDatasetParams({ models: [] }); 
    }
  }, [isForecastPage, loading, viewType, models, availableTargets, urlManager, updateDatasetParams, selectedTarget, modelsForView, availableDatesToExpose]);

  useEffect(() => {
    const availableModelsSet = new Set(modelsForView);
    const cleanedSelectedModels = selectedModels.filter(model =>
      availableModelsSet.has(model)
    );

    if (cleanedSelectedModels.length !== selectedModels.length) {
      setSelectedModels(cleanedSelectedModels);
    }
  }, [modelsForView, selectedModels]);

  useEffect(() => {
    if (loading || !availableTargets || availableTargets.length === 0) {
      return;
    }
    const isCurrentTargetValid = selectedTarget && availableTargets.includes(selectedTarget);
    if (!isCurrentTargetValid) {
      setSelectedTarget(availableTargets[0]);
    }
  }, [loading, availableTargets, selectedTarget]);


  const handleLocationSelect = (newLocation) => {
    const currentDataset = urlManager.getDatasetFromView(viewType);
    const effectiveDefault = currentDataset?.defaultLocation || APP_CONFIG.defaultLocation;
    urlManager.updateLocation(newLocation, effectiveDefault);
    setSelectedLocation(newLocation);
  };

  const handleTargetSelect = (target) => {
    if (!target) return;
    setSelectedTarget(target);
    updateDatasetParams({ target: target });
  };

  const handleViewChange = useCallback((newView) => {
    const oldView = viewType;
    if (oldView === newView) return;

    const oldDataset = urlManager.getDatasetFromView(oldView);
    const newDataset = urlManager.getDatasetFromView(newView);
    const newSearchParams = new URLSearchParams(searchParams);


    const isMovingToMetrocast = newView === 'metrocast_forecasts';

    if (isMovingToMetrocast) {
      // Check if current location is supported by metrocast
      const isStateCode = METROCAST_STATE_CODES.has(selectedLocation);
      const mightBeCityAbbr = selectedLocation && selectedLocation.length > 2;

      // Allow state codes and potential city abbreviations (>2 chars)
      // Only reset if it's neither a state code nor a city abbreviation
      if (!isStateCode && !mightBeCityAbbr) {
        // Current location is not supported by metrocast, reset to metrocast default
        if (newDataset?.defaultLocation) {
          setSelectedLocation(newDataset.defaultLocation);
          newSearchParams.set('location', newDataset.defaultLocation);
        }
      } else {
        // Keep current location if it's supported
        // Only reset to metrocast default if coming from a different dataset and location is the app default
        const isComingFromDifferentDataset = oldDataset?.shortName !== newDataset?.shortName;
        const needsCityDefault = isComingFromDifferentDataset && selectedLocation === APP_CONFIG.defaultLocation;

        if (needsCityDefault && newDataset?.defaultLocation) {
          setSelectedLocation(newDataset.defaultLocation);
          newSearchParams.delete('location');
        }
      }
    } else {
      // When leaving metrocast: if we have a city abbreviation, immediately convert it to state
      // to avoid timing issues with async sync effect
      if (selectedLocation && selectedLocation.length > 2) {
        const stateFromMapping = CITY_TO_STATE_MAP[selectedLocation];
        if (stateFromMapping) {
          setSelectedLocation(stateFromMapping);
          newSearchParams.set('location', stateFromMapping);
        }
      }
    }

    if (newView !== APP_CONFIG.defaultView || newSearchParams.toString().length > 0) {
      newSearchParams.set('view', newView);
    } else {
      newSearchParams.delete('view');
    }

    const isDatasetChange = oldDataset?.shortName !== newDataset?.shortName;
    const isPeakTransition = oldView === 'flu_peak' || newView === 'flu_peak'; // reset if coming or going from flu_peak

    if (isDatasetChange || isPeakTransition) {
      setSelectedDates([]);
      setSelectedModels([]);
      setActiveDate(null);
      setSelectedTarget(null);

      if (oldDataset) {
        newSearchParams.delete(`${oldDataset.prefix}_models`);
        newSearchParams.delete(`${oldDataset.prefix}_dates`);
        newSearchParams.delete(`${oldDataset.prefix}_target`);
      }

      if (oldDataset?.shortName === 'nhsn') {
        newSearchParams.delete('nhsn_target');
        newSearchParams.delete('nhsn_cols');
      }
    } else {
      if (newDataset) {
         newSearchParams.delete(`${newDataset.prefix}_target`);
      }
      setSelectedTarget(null);
    }

    setViewTypeState(newView);
    // Push history for view changes so browser back works between forecast views.
    setSearchParams(newSearchParams, { replace: false });
  }, [viewType, searchParams, setSearchParams, urlManager, selectedLocation]);

  useEffect(() => {
    const viewFromUrl = urlManager.getView();
    if (viewFromUrl !== viewType) {
      setViewTypeState(viewFromUrl);
    }
  }, [searchParams, urlManager, viewType]);

  // Sync location from URL based on current view
  useEffect(() => {
    const urlLocation = urlManager.getLocation();
    const dataset = urlManager.getDatasetFromView(viewType);

    const syncLocation = async () => {
      if (viewType !== 'metrocast_forecasts') {
        // On non-metrocast views: handle city abbreviations but keep state codes
        if (urlLocation.length > 2) {
          // Check static mapping first (for cities like NYC without state in metadata)
          if (CITY_TO_STATE_MAP[urlLocation]) {
            const stateCode = CITY_TO_STATE_MAP[urlLocation];
            if (selectedLocation !== stateCode) {
              setSelectedLocation(stateCode);
            }
          } else {
            // Try to fetch metrocast metadata to extract state code
            try {
              const metroMetadata = await fetch('/processed_data/flumetrocast/metadata.json').then(r => r.json());
              const city = metroMetadata.locations?.find(l => l.abbreviation === urlLocation);
              if (city && city.location_name?.includes(',')) {
                // It's a city with state in location_name - extract state code
                const stateCode = city.location_name.split(',')[1].trim().toUpperCase();
                if (selectedLocation !== stateCode) {
                  setSelectedLocation(stateCode);
                }
              } else if (selectedLocation !== urlLocation) {
                // Not recognized as city, sync directly
                setSelectedLocation(urlLocation);
              }
            } catch (e) {
              console.warn('Could not fetch metrocast metadata:', e);
              if (selectedLocation !== urlLocation) {
                setSelectedLocation(urlLocation);
              }
            }
          }
        } else if (selectedLocation !== urlLocation) {
          // 2-letter code or shorter - sync directly (state codes are valid here)
          setSelectedLocation(urlLocation);
        }
      } else if (selectedLocation !== urlLocation) {
        // For metrocast view, sync from URL directly (allow both states and cities)
        setSelectedLocation(urlLocation);
      }
    };

    syncLocation();
  }, [viewType, searchParams, urlManager]);

  useEffect(() => {
    if (!isForecastPage) {
      return;
    }
    const { chartScale: urlScale, intervalVisibility: urlIntervals, showLegend: urlLegend } = urlManager.getAdvancedParams();
    if (urlScale !== chartScale) {
      setChartScale(urlScale);
    }
    if (JSON.stringify(urlIntervals) !== JSON.stringify(intervalVisibility)) {
      setIntervalVisibility(urlIntervals);
    }
    if (urlLegend !== showLegend) {
      setShowLegend(urlLegend);
    }
  }, [searchParams, urlManager, isForecastPage, chartScale, intervalVisibility, showLegend]);

  const setChartScaleWithUrl = useCallback((nextScale) => {
    setChartScale(nextScale);
    if (isForecastPage) {
      urlManager.updateAdvancedParams({ chartScale: nextScale });
    }
  }, [urlManager, isForecastPage]);

  const setIntervalVisibilityWithUrl = useCallback((updater) => {
    setIntervalVisibility(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (isForecastPage) {
        urlManager.updateAdvancedParams({ intervalVisibility: next });
      }
      return next;
    });
  }, [urlManager, isForecastPage]);

  const setShowLegendWithUrl = useCallback((nextShowLegend) => {
    setShowLegend(nextShowLegend);
    if (isForecastPage) {
      urlManager.updateAdvancedParams({ showLegend: nextShowLegend });
    }
  }, [urlManager, isForecastPage]);

  const contextValue = {
    selectedLocation, handleLocationSelect,
    data, metadata, loading, error, 
    availableDates: availableDatesToExpose, 
    models: modelsForView,
    selectedModels, setSelectedModels: (updater) => {
      const resolveModels = (prevModels) => (
        typeof updater === 'function' ? updater(prevModels) : updater
      );
      const currentDataset = urlManager.getDatasetFromView(viewType);
      setSelectedModels(prevModels => {
        const nextModels = resolveModels(prevModels);
        const defaultModel = currentDataset?.defaultModel ? [currentDataset.defaultModel] : [];
        const isDefault = JSON.stringify(nextModels.slice().sort()) === JSON.stringify(defaultModel.slice().sort());
        updateDatasetParams({ models: isDefault ? [] : nextModels });
        return nextModels;
      });
    },
    selectedDates, setSelectedDates: (updater) => {
      setSelectedDates(prevDates => {
        const nextDates = typeof updater === 'function' ? updater(prevDates) : updater;
        updateDatasetParams({ dates: nextDates });
        return nextDates;
      });
    },
    activeDate, setActiveDate,
    viewType, setViewType: handleViewChange,
    currentDataset: urlManager.getDatasetFromView(viewType),
    availableTargets: availableTargetsToExpose, 
    
    selectedTarget,
    handleTargetSelect,
    peaks,
    availablePeakDates: (availablePeakDates || []).filter(date => date >= CURRENT_FLU_SEASON_START),
    availablePeakModels,
    chartScale,
    setChartScale: setChartScaleWithUrl,
    intervalVisibility,
    setIntervalVisibility: setIntervalVisibilityWithUrl,
    showLegend,
    setShowLegend: setShowLegendWithUrl
  };

  return (
    <ViewContext.Provider value={contextValue}>
      {children}
    </ViewContext.Provider>
  );
};
