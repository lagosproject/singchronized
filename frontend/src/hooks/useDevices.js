import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import { retryWithBackoff } from '../utils/retryBackoff';

// Given the device list, pick the saved singer/audience devices (by name)
// or fall back to the first/second entries.
function pickDevices(data) {
  if (data.length === 0) {
    return { singerDevice: null, audienceDevice: null };
  }

  const savedSingerName = localStorage.getItem('singerDeviceName');
  const savedAudienceName = localStorage.getItem('audienceDeviceName');

  let sIdx = null;
  let aIdx = null;

  if (savedSingerName) {
    const found = data.find(d => d.raw_name === savedSingerName || d.name === savedSingerName);
    if (found) sIdx = found.index;
  }
  if (sIdx === null) {
    sIdx = data[0].index;
  }

  if (savedAudienceName) {
    const found = data.find(d => d.raw_name === savedAudienceName || d.name === savedAudienceName);
    if (found) aIdx = found.index;
  }
  if (aIdx === null) {
    aIdx = data[1] ? data[1].index : data[0].index;
  }

  return { singerDevice: sIdx, audienceDevice: aIdx };
}

export function useDevices() {
  const [devices, setDevices] = useState([]);
  const [singerDevice, setSingerDevice] = useState(null);
  const [audienceDevice, setAudienceDevice] = useState(null);
  const [gpuStatus, setGpuStatus] = useState({ has_nvidia_gpu: false, gpu_name: null, gpu_pack_installed: false, gpu_active: false });
  const [isCalibrating, setIsCalibrating] = useState(false);

  const applyDevices = useCallback((data) => {
    setDevices(data);
    const { singerDevice: sIdx, audienceDevice: aIdx } = pickDevices(data);
    setSingerDevice(sIdx);
    setAudienceDevice(aIdx);
  }, []);

  const refreshDevices = useCallback(() => {
    api.getDevices()
      .then(applyDevices)
      .catch(err => console.error("Failed to fetch devices:", err));
  }, [applyDevices]);

  const refreshGpuStatus = useCallback(() => {
    api.getGpuStatus()
      .then(setGpuStatus)
      .catch(err => console.error("Failed to fetch GPU status:", err));
  }, []);

  const installGpuPack = async () => {
    try {
      await api.installGpuPack();
    } catch (err) {
      console.error("Failed to start GPU pack install:", err);
    }
  };

  const uninstallGpuPack = async () => {
    try {
      await api.uninstallGpuPack();
      refreshGpuStatus();
    } catch (err) {
      console.error("Failed to remove GPU pack:", err);
    }
  };

  useEffect(() => {
    let active = true;

    retryWithBackoff(
      () => api.getDevices().then(data => {
        if (active) applyDevices(data);
      }),
      () => active,
      { label: 'Fetch devices' }
    );

    retryWithBackoff(
      () => api.getGpuStatus().then(status => {
        if (active) setGpuStatus(status);
      }),
      () => active,
      { label: 'Fetch GPU status' }
    );

    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', refreshDevices);
      return () => {
        active = false;
        navigator.mediaDevices.removeEventListener('devicechange', refreshDevices);
      };
    }

    return () => {
      active = false;
    };
  }, [refreshDevices, applyDevices]);

  const playTestTone = async (deviceId) => {
    if (deviceId === null || deviceId === undefined) return;
    try {
      await api.playTestTone(deviceId);
    } catch (err) {
      console.error("Failed to play test tone:", err);
    }
  };

  const selectSingerDevice = (deviceId) => {
    setSingerDevice(deviceId);
    const dev = devices.find(d => d.index === deviceId);
    if (dev) {
      localStorage.setItem('singerDeviceName', dev.raw_name || dev.name);
    }
    playTestTone(deviceId);
  };

  const selectAudienceDevice = (deviceId) => {
    setAudienceDevice(deviceId);
    const dev = devices.find(d => d.index === deviceId);
    if (dev) {
      localStorage.setItem('audienceDeviceName', dev.raw_name || dev.name);
    }
    playTestTone(deviceId);
  };

  const startCalibration = async (sDev, aDev) => {
    try {
      await api.startCalibration(sDev, aDev);
      setIsCalibrating(true);
    } catch (err) {
      console.error("Failed to start calibration:", err);
    }
  };

  const stopCalibration = async () => {
    try {
      await api.stopCalibration();
      setIsCalibrating(false);
    } catch (err) {
      console.error("Failed to stop calibration:", err);
    }
  };

  return {
    devices,
    singerDevice,
    audienceDevice,
    gpuStatus,
    refreshGpuStatus,
    installGpuPack,
    uninstallGpuPack,
    isCalibrating,
    playTestTone,
    selectSingerDevice,
    selectAudienceDevice,
    startCalibration,
    stopCalibration
  };
}

