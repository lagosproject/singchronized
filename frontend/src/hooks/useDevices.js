import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';

export function useDevices() {
  const [devices, setDevices] = useState([]);
  const [singerDevice, setSingerDevice] = useState(null);
  const [audienceDevice, setAudienceDevice] = useState(null);
  const [gpuStatus, setGpuStatus] = useState({ has_gpu: false, gpu_name: null });

  const refreshDevices = useCallback(() => {
    api.getDevices()
      .then(data => {
        setDevices(data);
        if (data.length > 0) {
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

          setSingerDevice(sIdx);
          setAudienceDevice(aIdx);
        } else {
          setSingerDevice(null);
          setAudienceDevice(null);
        }
      })
      .catch(err => console.error("Failed to fetch devices:", err));
  }, []);

  useEffect(() => {
    refreshDevices();

    api.getGpuStatus()
      .then(setGpuStatus)
      .catch(err => console.error("Failed to fetch GPU status:", err));

    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', refreshDevices);
      return () => {
        navigator.mediaDevices.removeEventListener('devicechange', refreshDevices);
      };
    }
  }, [refreshDevices]);

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

  return {
    devices,
    singerDevice,
    audienceDevice,
    gpuStatus,
    playTestTone,
    selectSingerDevice,
    selectAudienceDevice
  };
}

